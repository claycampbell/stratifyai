import pool from '../config/database';

async function createSampleStaffPlans() {
  try {
    console.log('Creating sample 30/60/90 day plans...');

    // Get a user ID from the database (using first user or admin)
    const userResult = await pool.query('SELECT id FROM users LIMIT 1');
    if (userResult.rows.length === 0) {
      console.error('No users found in database. Please create a user first.');
      return;
    }
    const userId = userResult.rows[0].id;
    console.log(`Using user ID: ${userId}`);

    // Sample Plan 1: New Marketing Manager Onboarding
    const plan1 = await pool.query(
      `INSERT INTO staff_plans (user_id, title, description, start_date, end_date, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        userId,
        'New Marketing Manager Onboarding',
        'Comprehensive onboarding plan for the new Marketing Manager position focusing on team integration, strategy development, and campaign execution.',
        new Date().toISOString().split('T')[0],
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        'active',
        userId
      ]
    );
    const plan1Id = plan1.rows[0].id;
    console.log(`Created Plan 1: ${plan1Id}`);

    // Plan 1 - 30 Day Items
    const plan1Items30 = [
      {
        title: 'Complete HR onboarding and benefits enrollment',
        description: 'Finish all required paperwork, set up benefits, and complete compliance training modules.',
        timeframe: '30_days',
        priority: 'critical',
        status: 'completed',
        completion_percentage: 100
      },
      {
        title: 'Meet with all team members individually',
        description: 'Schedule 1-on-1 meetings with each marketing team member to understand their roles, challenges, and ideas.',
        timeframe: '30_days',
        priority: 'high',
        status: 'completed',
        completion_percentage: 100
      },
      {
        title: 'Review current marketing campaigns and performance metrics',
        description: 'Analyze last quarter\'s campaigns, review analytics dashboards, and identify key performance trends.',
        timeframe: '30_days',
        priority: 'high',
        status: 'in_progress',
        completion_percentage: 75
      },
      {
        title: 'Shadow key stakeholder meetings',
        description: 'Attend executive meetings, sales calls, and customer touchpoints to understand business dynamics.',
        timeframe: '30_days',
        priority: 'medium',
        status: 'in_progress',
        completion_percentage: 60
      },
      {
        title: 'Set up marketing tools and access permissions',
        description: 'Get access to Google Analytics, CRM, email marketing platform, social media accounts, and design tools.',
        timeframe: '30_days',
        priority: 'high',
        status: 'completed',
        completion_percentage: 100
      }
    ];

    // Plan 1 - 60 Day Items
    const plan1Items60 = [
      {
        title: 'Develop Q4 marketing strategy and budget proposal',
        description: 'Create comprehensive marketing plan for Q4 including campaign themes, budget allocation, and success metrics.',
        timeframe: '60_days',
        priority: 'critical',
        status: 'in_progress',
        completion_percentage: 40
      },
      {
        title: 'Launch first major campaign initiative',
        description: 'Execute a complete marketing campaign from planning to launch, applying learnings from first 30 days.',
        timeframe: '60_days',
        priority: 'high',
        status: 'not_started',
        completion_percentage: 0
      },
      {
        title: 'Implement new marketing automation workflows',
        description: 'Set up automated email sequences, lead scoring, and nurture campaigns in the marketing platform.',
        timeframe: '60_days',
        priority: 'medium',
        status: 'not_started',
        completion_percentage: 0
      },
      {
        title: 'Conduct competitive analysis and market research',
        description: 'Deep dive into competitor strategies, market positioning, and identify opportunities for differentiation.',
        timeframe: '60_days',
        priority: 'medium',
        status: 'in_progress',
        completion_percentage: 25
      }
    ];

    // Plan 1 - 90 Day Items
    const plan1Items90 = [
      {
        title: 'Present comprehensive marketing roadmap to executive team',
        description: 'Deliver strategic presentation outlining 12-month marketing vision, key initiatives, and expected ROI.',
        timeframe: '90_days',
        priority: 'critical',
        status: 'not_started',
        completion_percentage: 0
      },
      {
        title: 'Establish marketing KPIs and reporting dashboard',
        description: 'Define key metrics, set benchmarks, and create automated reporting dashboard for stakeholders.',
        timeframe: '90_days',
        priority: 'high',
        status: 'not_started',
        completion_percentage: 0
      },
      {
        title: 'Build relationships with external vendors and agencies',
        description: 'Evaluate and establish partnerships with creative agencies, media buyers, and marketing service providers.',
        timeframe: '90_days',
        priority: 'medium',
        status: 'not_started',
        completion_percentage: 0
      },
      {
        title: 'Optimize team structure and identify hiring needs',
        description: 'Assess team capabilities, identify skill gaps, and propose hiring plan for additional resources.',
        timeframe: '90_days',
        priority: 'medium',
        status: 'not_started',
        completion_percentage: 0
      }
    ];

    // Insert Plan 1 items
    for (const item of [...plan1Items30, ...plan1Items60, ...plan1Items90]) {
      await pool.query(
        `INSERT INTO plan_items (plan_id, title, description, timeframe, priority, status, completion_percentage)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [plan1Id, item.title, item.description, item.timeframe, item.priority, item.status, item.completion_percentage]
      );
    }
    console.log(`Added ${plan1Items30.length + plan1Items60.length + plan1Items90.length} items to Plan 1`);

    // Sample Plan 2: Sales Team Q4 Expansion
    const plan2 = await pool.query(
      `INSERT INTO staff_plans (user_id, title, description, start_date, end_date, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        userId,
        'Sales Team Q4 Expansion Initiative',
        'Strategic plan for expanding sales team capabilities, implementing new CRM processes, and increasing revenue targets for Q4.',
        new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        'active',
        userId
      ]
    );
    const plan2Id = plan2.rows[0].id;
    console.log(`Created Plan 2: ${plan2Id}`);

    // Plan 2 - 30 Day Items
    const plan2Items30 = [
      {
        title: 'Recruit and hire 3 new Account Executives',
        description: 'Complete recruitment process: post jobs, screen candidates, conduct interviews, and extend offers.',
        timeframe: '30_days',
        priority: 'critical',
        status: 'completed',
        completion_percentage: 100
      },
      {
        title: 'Update sales playbook and training materials',
        description: 'Revise sales scripts, objection handling guides, and product pitch decks with latest messaging.',
        timeframe: '30_days',
        priority: 'high',
        status: 'completed',
        completion_percentage: 100
      },
      {
        title: 'Configure new territories and lead assignment rules',
        description: 'Define geographic territories, industry verticals, and automated lead routing in CRM.',
        timeframe: '30_days',
        priority: 'high',
        status: 'in_progress',
        completion_percentage: 85
      }
    ];

    // Plan 2 - 60 Day Items
    const plan2Items60 = [
      {
        title: 'Complete onboarding for new sales hires',
        description: 'Deliver comprehensive training program covering product knowledge, sales process, and tools mastery.',
        timeframe: '60_days',
        priority: 'critical',
        status: 'in_progress',
        completion_percentage: 50
      },
      {
        title: 'Implement new sales performance dashboard',
        description: 'Build real-time dashboard tracking pipeline, conversion rates, and individual rep performance.',
        timeframe: '60_days',
        priority: 'high',
        status: 'not_started',
        completion_percentage: 0
      },
      {
        title: 'Launch customer success partnership program',
        description: 'Create structured handoff process between sales and customer success teams.',
        timeframe: '60_days',
        priority: 'medium',
        status: 'not_started',
        completion_percentage: 0
      },
      {
        title: 'Conduct win/loss analysis on Q3 opportunities',
        description: 'Interview customers and prospects to understand decision factors and improve sales approach.',
        timeframe: '60_days',
        priority: 'medium',
        status: 'in_progress',
        completion_percentage: 30
      }
    ];

    // Plan 2 - 90 Day Items
    const plan2Items90 = [
      {
        title: 'Achieve 120% of Q4 revenue target',
        description: 'Drive team to exceed quarterly quota through improved pipeline management and conversion rates.',
        timeframe: '90_days',
        priority: 'critical',
        status: 'in_progress',
        completion_percentage: 20
      },
      {
        title: 'Establish sales and marketing alignment process',
        description: 'Create regular sync meetings, shared KPIs, and feedback loops between sales and marketing.',
        timeframe: '90_days',
        priority: 'high',
        status: 'not_started',
        completion_percentage: 0
      },
      {
        title: 'Develop enterprise sales motion and pricing strategy',
        description: 'Create framework for pursuing larger enterprise deals with custom pricing and contracts.',
        timeframe: '90_days',
        priority: 'medium',
        status: 'not_started',
        completion_percentage: 0
      }
    ];

    // Insert Plan 2 items
    for (const item of [...plan2Items30, ...plan2Items60, ...plan2Items90]) {
      await pool.query(
        `INSERT INTO plan_items (plan_id, title, description, timeframe, priority, status, completion_percentage)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [plan2Id, item.title, item.description, item.timeframe, item.priority, item.status, item.completion_percentage]
      );
    }
    console.log(`Added ${plan2Items30.length + plan2Items60.length + plan2Items90.length} items to Plan 2`);

    // Sample Plan 3: Product Launch Preparation
    const plan3 = await pool.query(
      `INSERT INTO staff_plans (user_id, title, description, start_date, end_date, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        userId,
        'AI Analytics Platform Launch Preparation',
        'Cross-functional plan for launching new AI-powered analytics platform including product development, marketing, and customer success readiness.',
        new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        new Date(Date.now() + 85 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        'active',
        userId
      ]
    );
    const plan3Id = plan3.rows[0].id;
    console.log(`Created Plan 3: ${plan3Id}`);

    // Plan 3 - 30 Day Items
    const plan3Items30 = [
      {
        title: 'Finalize product feature set and MVP scope',
        description: 'Lock down features for initial release, prioritize must-haves vs nice-to-haves.',
        timeframe: '30_days',
        priority: 'critical',
        status: 'completed',
        completion_percentage: 100
      },
      {
        title: 'Complete beta testing with pilot customers',
        description: 'Run closed beta with 10 customers, gather feedback, and identify critical bugs.',
        timeframe: '30_days',
        priority: 'critical',
        status: 'in_progress',
        completion_percentage: 70
      },
      {
        title: 'Develop product documentation and help center',
        description: 'Create user guides, video tutorials, API docs, and FAQ content.',
        timeframe: '30_days',
        priority: 'high',
        status: 'in_progress',
        completion_percentage: 55
      },
      {
        title: 'Design launch marketing campaign creative assets',
        description: 'Develop brand guidelines, create landing pages, email templates, and social media content.',
        timeframe: '30_days',
        priority: 'high',
        status: 'not_started',
        completion_percentage: 0
      }
    ];

    // Plan 3 - 60 Day Items
    const plan3Items60 = [
      {
        title: 'Execute soft launch to existing customer base',
        description: 'Roll out product to current customers with special early adopter pricing.',
        timeframe: '60_days',
        priority: 'critical',
        status: 'not_started',
        completion_percentage: 0
      },
      {
        title: 'Train customer success team on new product',
        description: 'Deliver comprehensive training enabling CS team to support and upsell new platform.',
        timeframe: '60_days',
        priority: 'high',
        status: 'not_started',
        completion_percentage: 0
      },
      {
        title: 'Build product demo environment and sandbox',
        description: 'Create interactive demo instance for sales team and prospects to explore features.',
        timeframe: '60_days',
        priority: 'medium',
        status: 'in_progress',
        completion_percentage: 35
      },
      {
        title: 'Establish product feedback and feature request process',
        description: 'Set up system for collecting, prioritizing, and communicating on customer feature requests.',
        timeframe: '60_days',
        priority: 'medium',
        status: 'not_started',
        completion_percentage: 0
      }
    ];

    // Plan 3 - 90 Day Items
    const plan3Items90 = [
      {
        title: 'Public launch with press release and media outreach',
        description: 'Coordinate major launch event, press releases, analyst briefings, and social media blitz.',
        timeframe: '90_days',
        priority: 'critical',
        status: 'not_started',
        completion_percentage: 0
      },
      {
        title: 'Achieve 100 paying customers on new platform',
        description: 'Drive adoption through marketing campaigns, sales enablement, and customer success programs.',
        timeframe: '90_days',
        priority: 'critical',
        status: 'not_started',
        completion_percentage: 0
      },
      {
        title: 'Monitor product performance and user engagement metrics',
        description: 'Track usage analytics, identify adoption patterns, and optimize user experience.',
        timeframe: '90_days',
        priority: 'high',
        status: 'not_started',
        completion_percentage: 0
      },
      {
        title: 'Plan roadmap for next product iteration',
        description: 'Analyze customer feedback and usage data to define features for next release.',
        timeframe: '90_days',
        priority: 'medium',
        status: 'not_started',
        completion_percentage: 0
      }
    ];

    // Insert Plan 3 items
    for (const item of [...plan3Items30, ...plan3Items60, ...plan3Items90]) {
      await pool.query(
        `INSERT INTO plan_items (plan_id, title, description, timeframe, priority, status, completion_percentage)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [plan3Id, item.title, item.description, item.timeframe, item.priority, item.status, item.completion_percentage]
      );
    }
    console.log(`Added ${plan3Items30.length + plan3Items60.length + plan3Items90.length} items to Plan 3`);

    console.log('\n✅ Successfully created 3 sample 30/60/90 day plans with items!');
    console.log('\nSummary:');
    console.log('- Plan 1: New Marketing Manager Onboarding (13 items)');
    console.log('- Plan 2: Sales Team Q4 Expansion Initiative (10 items)');
    console.log('- Plan 3: AI Analytics Platform Launch Preparation (12 items)');
    console.log('\nYou can now view these plans in the UI at /staff-plans');

  } catch (error) {
    console.error('Error creating sample plans:', error);
  } finally {
    await pool.end();
  }
}

createSampleStaffPlans();
