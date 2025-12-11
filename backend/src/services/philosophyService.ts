import pool from '../config/database';
import {
  PhilosophyDocument,
  NonNegotiable,
  DecisionHierarchyLevel,
  ValidationResult,
} from '../types';

/**
 * PhilosophyService
 *
 * Manages RMU Athletics' foundational philosophy and non-negotiables integration.
 * Provides methods to:
 * - Retrieve active philosophy documents, non-negotiables, and decision hierarchy
 * - Build contextual prompts for Gemini AI with philosophy alignment
 * - Validate AI recommendations against non-negotiable constraints
 *
 * Part of P0-006: RMU Athletics Philosophy & Non-Negotiables Integration
 */
export class PhilosophyService {
  /**
   * Get all active philosophy documents for AI context
   * Ordered by priority weight (descending), then type and category
   */
  async getActivePhilosophy(): Promise<PhilosophyDocument[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM philosophy_documents
         WHERE is_active = true
         ORDER BY priority_weight DESC, type, category`
      );
      return result.rows;
    } catch (error) {
      console.error('[PhilosophyService] Error fetching active philosophy:', error);
      throw new Error('Failed to fetch active philosophy documents');
    }
  }

  /**
   * Get all active non-negotiables for validation
   * Ordered by rule number
   */
  async getActiveNonNegotiables(): Promise<NonNegotiable[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM non_negotiables
         WHERE is_active = true
         ORDER BY rule_number`
      );
      return result.rows;
    } catch (error) {
      console.error('[PhilosophyService] Error fetching non-negotiables:', error);
      throw new Error('Failed to fetch non-negotiables');
    }
  }

  /**
   * Get decision hierarchy for prioritization logic
   * Ordered by level (ascending)
   */
  async getDecisionHierarchy(): Promise<DecisionHierarchyLevel[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM decision_hierarchy
         ORDER BY level ASC`
      );
      return result.rows;
    } catch (error) {
      console.error('[PhilosophyService] Error fetching decision hierarchy:', error);
      throw new Error('Failed to fetch decision hierarchy');
    }
  }

  /**
   * Build contextual prompt for Gemini with philosophy
   *
   * Creates a comprehensive prompt that includes:
   * - Mission, Vision, and Purpose statements
   * - Core Values (non-negotiable characteristics)
   * - Guiding and Operating Principles
   * - Decision-Making Hierarchy
   * - Non-Negotiables (absolute rules)
   *
   * This prompt should be prepended to all AI interactions to ensure
   * recommendations are culturally aligned and operationally appropriate.
   */
  async buildPhilosophyContext(): Promise<string> {
    try {
      const philosophy = await this.getActivePhilosophy();
      const nonNegotiables = await this.getActiveNonNegotiables();
      const hierarchy = await this.getDecisionHierarchy();

      let context = `# RMU Athletics Foundational Philosophy\n\n`;
      context += `You are the Chief Strategy Officer for Robert Morris University Athletics. All your recommendations must be aligned with the following foundational documents and operational rules.\n\n`;

      // Group philosophy by type
      const grouped = philosophy.reduce((acc, doc) => {
        if (!acc[doc.type]) acc[doc.type] = [];
        acc[doc.type].push(doc);
        return acc;
      }, {} as Record<string, PhilosophyDocument[]>);

      // Mission & Vision
      if (grouped.mission && grouped.mission.length > 0) {
        context += `## Mission Statement\n${grouped.mission[0].content}\n\n`;
      }
      if (grouped.vision && grouped.vision.length > 0) {
        context += `## Vision Statement\n${grouped.vision[0].content}\n\n`;
      }
      if (grouped.purpose && grouped.purpose.length > 0) {
        context += `## Purpose Statement\n${grouped.purpose[0].content}\n\n`;
      }

      // Core Values (high priority)
      if (grouped.value && grouped.value.length > 0) {
        context += `## Core Values (Non-negotiable characteristics)\n`;
        grouped.value.forEach((v) => {
          context += `- **${v.category || v.title}**: ${v.content}\n`;
        });
        context += `\n`;
      }

      // Guiding Principles
      if (grouped.guiding_principle && grouped.guiding_principle.length > 0) {
        context += `## Guiding Principles (Department philosophy)\n`;
        grouped.guiding_principle.forEach((p) => {
          context += `- ${p.title}\n`;
        });
        context += `\n`;
      }

      // Operating Principles
      if (grouped.operating_principle && grouped.operating_principle.length > 0) {
        context += `## Operating Principles (Concrete actions)\n`;
        grouped.operating_principle.forEach((p) => {
          context += `- ${p.title}\n`;
        });
        context += `\n`;
      }

      // Decision Hierarchy
      context += `## Decision-Making Hierarchy (ABSOLUTE PRIORITY ORDER)\n`;
      context += `All decisions and recommendations MUST prioritize stakeholders in this exact order:\n`;
      hierarchy.forEach((h) => {
        context += `${h.level}. **${h.stakeholder}** (Weight: ${h.weight}) - ${h.description || ''}\n`;
      });
      context += `\n`;

      // Non-Negotiables (Hard Constraints)
      context += `## Director of Athletics' Non-Negotiables (ABSOLUTE RULES)\n`;
      context += `These are hard constraints. Any recommendation that violates these rules is IMMEDIATELY INVALID:\n\n`;
      nonNegotiables.forEach((nn) => {
        context += `${nn.rule_number}. **${nn.title}**\n   ${nn.description}\n`;
        if (nn.auto_reject) {
          context += `   ⚠️ AUTO-REJECT: Violations of this rule will automatically invalidate recommendations.\n`;
        }
        context += `\n`;
      });

      context += `\n---\n\n`;
      context += `**IMPORTANT**: When providing recommendations:\n`;
      context += `1. Cite which Core Values, Principles, or Non-Negotiables support your recommendation\n`;
      context += `2. Explain how your recommendation aligns with the Decision Hierarchy\n`;
      context += `3. Identify any potential conflicts between principles and explain your resolution\n`;
      context += `4. If a recommendation would violate a Non-Negotiable, clearly state why it's not viable\n\n`;

      return context;
    } catch (error) {
      console.error('[PhilosophyService] Error building philosophy context:', error);
      throw new Error('Failed to build philosophy context');
    }
  }

  /**
   * Validate a recommendation against non-negotiables and philosophy alignment
   *
   * Performs multi-stage validation:
   * 1. Check for explicit violations of non-negotiables (keyword-based)
   * 2. Assess positive alignment with core values
   * 3. Determine final status based on both violation and alignment
   *
   * Returns:
   * - status: 'approved' (strong alignment, no violations), 'flagged' (weak alignment or minor concerns), 'rejected' (auto-reject violations)
   * - violations: Array of NonNegotiable rules that were violated
   * - autoReject: True if any auto-reject violations were detected
   */
  async validateRecommendation(
    recommendationText: string,
    chatHistoryId: string
  ): Promise<ValidationResult> {
    try {
      const nonNegotiables = await this.getActiveNonNegotiables();
      const violations: NonNegotiable[] = [];

      // STAGE 1: Check for explicit violations (negative keywords)
      for (const nn of nonNegotiables) {
        if (nn.validation_keywords && nn.validation_keywords.length > 0) {
          const violationDetected = this.checkForViolation(recommendationText, nn);
          if (violationDetected) {
            violations.push(nn);
          }
        }
      }

      // STAGE 2: Check for positive alignment with core values
      const alignmentScore = this.calculateAlignmentScore(recommendationText);

      // STAGE 3: Determine status based on violations AND alignment
      const autoRejectViolations = violations.filter((v) => v.auto_reject);

      let status: 'approved' | 'flagged' | 'rejected';

      if (autoRejectViolations.length > 0) {
        // Hard violations = automatic rejection
        status = 'rejected';
      } else if (violations.length > 0) {
        // Soft violations = flagged for review
        status = 'flagged';
      } else if (alignmentScore < 30) {
        // Low alignment with core values = flagged
        status = 'flagged';
      } else {
        // No violations and reasonable alignment = approved
        status = 'approved';
      }

      console.log(`[PhilosophyService] Validation - Alignment Score: ${alignmentScore}, Violations: ${violations.length}, Status: ${status}`);

      // Log validation
      // Convert array of UUIDs to PostgreSQL array format
      const violatedIds = violations.map((v) => v.id);

      try {
        await pool.query(
          `INSERT INTO ai_recommendation_validations
           (chat_history_id, recommendation_text, validation_status, violated_constraints)
           VALUES ($1, $2, $3, $4::uuid[])`,
          [chatHistoryId, recommendationText, status, violatedIds]
        );
      } catch (dbError) {
        console.error('[PhilosophyService] Error saving validation to database:', dbError);
        // Don't throw - validation result is still valid even if logging fails
      }

      return {
        status,
        violations,
        autoReject: autoRejectViolations.length > 0,
      };
    } catch (error) {
      console.error('[PhilosophyService] Error validating recommendation:', error);
      throw new Error('Failed to validate recommendation');
    }
  }

  /**
   * Calculate alignment score based on presence of core value keywords
   * Returns a score from 0-100 indicating strength of alignment
   */
  private calculateAlignmentScore(text: string): number {
    const lowerText = text.toLowerCase();

    const valueKeywords = {
      community: ['community', 'service', 'outreach', 'engagement', 'relations'],
      connection: ['relationship', 'connection', 'partnership', 'collaboration'],
      excellence: ['excellence', 'quality', 'standard', 'best practice', 'championship'],
      integrity: ['integrity', 'ethical', 'honest', 'transparent', 'accountable', 'fair'],
      resilience: ['resourceful', 'creative', 'innovative', 'adapt', 'improve'],
    };

    const studentAthlete = ['student', 'athlete', 'student-athlete', 'wellbeing', 'welfare', 'academic', 'development'];
    const university = ['university', 'rmu', 'robert morris', 'institutional', 'strategic'];
    const department = ['athletics', 'athletic department', 'department', 'team', 'program'];

    let score = 0;

    // Check for core value alignment (5 points each, max 25)
    Object.values(valueKeywords).forEach(keywords => {
      if (keywords.some(kw => lowerText.includes(kw))) {
        score += 5;
      }
    });

    // Check for student-athlete focus (up to 30 points)
    const studentAthleteMatches = studentAthlete.filter(kw => lowerText.includes(kw)).length;
    score += Math.min(studentAthleteMatches * 6, 30);

    // Check for decision hierarchy alignment (up to 25 points)
    const universityMatches = university.filter(kw => lowerText.includes(kw)).length;
    const departmentMatches = department.filter(kw => lowerText.includes(kw)).length;
    score += Math.min((universityMatches * 10) + (departmentMatches * 5), 25);

    // Base score for any response (minimum 20 points)
    score += 20;

    return Math.min(score, 100);
  }

  /**
   * Check if recommendation text violates a specific non-negotiable
   *
   * Uses keyword matching and rule-specific logic to detect violations.
   * This is a simplified implementation - could be enhanced with AI-based
   * semantic analysis for more sophisticated violation detection.
   */
  private checkForViolation(text: string, nonNegotiable: NonNegotiable): boolean {
    const lowerText = text.toLowerCase();

    // Special cases for specific non-negotiables
    if (nonNegotiable.rule_number === 6) {
      // "Do not cheat" - detect unethical behavior
      const unethicalKeywords = [
        'bypass',
        'circumvent',
        'violate ncaa',
        'hide',
        'fake',
        'falsify',
        'cheat',
        'bend the rules',
        'work around',
      ];
      return unethicalKeywords.some((kw) => lowerText.includes(kw));
    }

    if (nonNegotiable.rule_number === 11) {
      // Student-Athlete Welfare - detect harmful actions
      const harmfulKeywords = [
        'reduce support',
        'cut academic',
        'eliminate wellness',
        'compromise safety',
        'ignore welfare',
        'skip health',
      ];
      return harmfulKeywords.some((kw) => lowerText.includes(kw));
    }

    // General keyword matching for other non-negotiables
    if (nonNegotiable.validation_keywords && nonNegotiable.validation_keywords.length > 0) {
      // Check if any validation keywords appear in the text
      // This is a basic implementation - more sophisticated logic could be added
      return nonNegotiable.validation_keywords.some((keyword) =>
        lowerText.includes(keyword.toLowerCase())
      );
    }

    return false;
  }
}

export default new PhilosophyService();
