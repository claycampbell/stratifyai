# User Feedback Log

**Purpose**: This document captures user feedback, feature requests, and critical insights from stakeholders to inform product development and prioritization.

**Last Updated**: 2025-11-07

---

## Feedback Entry Format

Each feedback entry includes:
- **Date Submitted**
- **Submitted By**
- **Category** (Enhancement, Bug, Feature Request, Critical Requirement)
- **Priority** (Critical, High, Medium, Low)
- **Status** (New, Under Review, Planned, In Progress, Completed, Declined)
- **Description**
- **Related Feature/Component**

---

## Active Feedback

### FB-001: RMU Athletics Philosophy & Non-Negotiables Integration (CRITICAL)

**Date Submitted**: 2025-11-07
**Submitted By**: Chris King (Director of Athletics)
**Category**: Critical Requirement
**Priority**: Critical
**Status**: Planned
**Phase**: Phase 0
**Related Feature**: P0-006 (New)

#### Problem Statement

The Chief Strategy Officer (CSO) BOT currently lacks the foundational context of RMU Athletics' identity, values, and operational principles. While the system can analyze metrics and generate strategic recommendations, it operates without understanding the "soul" of the organization - the mission, vision, core values, guiding principles, and non-negotiable operational standards that must guide every strategic decision.

#### User Quote

> "We are building a brilliant strategist, but it needs a soul... The BOT is currently void of the essential context of who we are and how we operate."

#### Detailed Requirements

##### 1. Foundational Philosophy Documents

The CSO BOT must be rigorously trained on the following foundational documents:

**Mission Statement:**
> Our mission is to promote a transformative, inclusive and unparalleled collegiate experience for our student-athletes. We will foster success in the classroom, competition, and the community, while developing today's exemplary Colonial scholar-athletes into the leaders of tomorrow.

**Purpose Statement:**
> Developing today's exemplary Colonial scholar-athletes into the leaders of tomorrow.

**External Mission Statement:**
> UNITE as a campus. UNITE as a community. UNITE on gameday. We will speak to our fans, alumni and donors without pretense. We will not be guarded or present ourselves in a way that's anything other than exactly who we are. We will be real. We will provide a level of access to our facilities, amenities, coaches, student-athletes and administration that is unmatched in the Pittsburgh region. We will position our athletics program as a premium brand through our marketing and by seeking opportunities to provide a top-tier experience to our fans. We must be accessible. We must be authentic. We must provide premium experiences. We must unite around RMU Athletics.

**Vision Statement:**
> RMU Athletics aspires to become the preeminent NCAA Division 1 mid-major college athletics department by developing championship-caliber sport programs that enhance the brand, identity, reputation, and visibility of the University.

**Core Values** (Non-negotiable core characteristics):
- **Community**: commitment to engagement, outreach, relations and service
- **Connection**: commitment to developing meaningful relationships within the athletics department, on campus and in the community
- **Commitment to Excellence**: commitment to our culture - our mission, vision, purpose, values, and principles
- **Integrity**: commitment to be ethical, fair, honest, authentic, accessible and exhibit sportsmanship
- **Resilience**: commitment to be the most resourceful athletics department to provide amenities and access far and above what anyone else can offer

**Guiding Principles** (Department philosophy):
- Develop Meaningful Relationships
- Diversity, Equity, Inclusion and Belonging
- Health and Well-Being
- Inclusive and Collaborative Leadership
- Pride and Tradition

**Operating Principles** (Translate values into concrete actions):
- Accountability
- Collaboration
- Innovation
- Professionalism
- Resourceful

**Themes (Overall Department Goals):**
- Branding and Engagement
- Colonial Culture
- Competitive Excellence
- Resource Development and Investment
- Student-Athlete Experience
- Strategic Vision

##### 2. Director of Athletics' Non-Negotiables (Hard Constraints)

These are **absolute operational commandments** that must act as filters for all strategic recommendations:

1. **Believe in Our Culture and Our Process**
2. **Decisions are made in the best interest of the university, department, then the individual, in that order** (Required decision-making hierarchy)
3. **Putting an individual program or internal department before the vision/mission of the department is unacceptable** (#UNITE)
4. **No one person in this department is bigger than the university**
5. **Communication, transparency, and collaboration are expected** - Any attempt to create and/or operate in silos will not be tolerated. Employees will communicate with each other and not function in silos or with their own agendas at the forefront
6. **Do not "cheat"** - Intentional disregard to comply with departmental, university, and NCAA policies and procedures will not be tolerated
7. **Follow the chain of command** - Don't deviate from reporting to their superior by going to the next level for advice, information or guidance
8. **Intentional disregard to manage and stay within allocated budget(s) is not acceptable**
9. **Disrespect for established office hours, deadlines, and/or timely notification is not acceptable**
10. **Do not be unprepared for meetings or important conversations** - Do not make excuses for not meeting expectations
11. **Make a commitment to Student-Athlete Experience, Success, and Welfare** - Any action and/or decision that compromises student-athlete well-being will not be tolerated
12. **Do not catch me off guard** - Do not portray "passive aggressive behavior" or behavior that borders on insubordination

#### Key Technical Questions Raised

1. **Strategic Integration & Prioritization**
   - **Data Structure**: How will this philosophical data (Mission, Values, Principles) be structured within the BOT's knowledge base? Is it raw text, or will it be converted to weighted rules?
   - **Prioritization**: Will the BOT be able to assign priority levels or weight to different documents (e.g., is a Core Value inherently more important than an Operating Principle)?
   - **Decision Logic**: When the CSO BOT provides a recommendation, can it be programmed to cite the relevant Value or Principle that supports the decision?
   - **Conflict Resolution**: How will the system handle potential conflicts between principles (e.g., a highly "Resourceful" strategy that compromises "Student-Athlete Experience")?

2. **Technical Implementation & Feedback**
   - **Initial Training**: What is the required format and process for initial training of the BOT on this philosophical text?
   - **Feedback Loop**: What mechanism will be in place for human leaders to provide feedback that retrains or refines the BOT's understanding and application of the principles?
   - **Hard Constraint Mechanism**: What is the technical mechanism for integrating Non-Negotiables as absolute, non-bypassable filters?
   - **Priority Rule Logic**: How will the BOT enforce the strict decision-making hierarchy: University → Department → Individual?
   - **The "No Surprises" Rule**: How will the BOT ensure recommendations inherently prioritize transparency and comprehensive context?
   - **Enforcing the "No Silos" Rule**: What mechanism will identify and flag strategies that might promote siloed operations?

#### Impact Assessment

**Impact**: **CRITICAL**
- This is foundational to all CSO BOT operations
- Affects quality and alignment of all AI-generated recommendations
- Ensures cultural fit and institutional alignment
- Prevents recommendations that violate core values or non-negotiables
- Provides transparency and traceability for decision-making

**Affected Components**:
- AI/Gemini Service (core prompt engineering)
- Database (new tables for philosophy, values, constraints)
- Backend API (philosophy management, validation logic)
- Frontend (philosophy management UI, recommendation transparency)
- All AI features (chat, analysis, recommendations, reports)

#### Proposed Solution

See technical specification: [specs/P0-006-athletics-philosophy.md](specs/P0-006-athletics-philosophy.md)

#### Acceptance Criteria

- [ ] Philosophy data stored in database with hierarchical structure
- [ ] Hard constraints implemented as validation filters
- [ ] Priority rules enforce decision-making hierarchy (University → Department → Individual)
- [ ] All AI recommendations cite relevant values/principles
- [ ] Conflict resolution mechanism when principles compete
- [ ] Admin UI for managing philosophy documents
- [ ] Training feedback loop for refining BOT understanding
- [ ] Non-negotiables act as absolute filters (auto-reject violations)
- [ ] AI responses explain "why" not just "what"
- [ ] Validation testing confirms cultural alignment

#### Estimated Effort

**80-120 hours** (High complexity due to fundamental AI integration)

#### Notes

This feedback represents a critical gap in the CSO BOT's foundational design. Without this layer, the BOT operates as a purely analytical tool rather than a culturally-aligned strategic partner. This must be prioritized in Phase 0 as it affects all future AI-driven features and recommendations.

---

## Completed Feedback

_Feedback items that have been implemented will be moved here with completion date and implemented feature reference._

---

## Declined Feedback

_Feedback items that have been reviewed and declined will be moved here with rationale._
