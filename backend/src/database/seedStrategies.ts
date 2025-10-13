import pool from '../config/database';

const sampleStrategies = [
  {
    title: 'Digital Transformation through Cloud Migration',
    description: 'Comprehensive cloud migration strategy for modernizing legacy systems',
    strategy_text: `This strategy involves a phased approach to migrating on-premise infrastructure to cloud services (AWS/Azure).
    Key steps include: 1) Assessment of current infrastructure, 2) Prioritization of workloads, 3) Pilot migration of non-critical systems,
    4) Training and upskilling teams, 5) Full migration with continuous monitoring. This approach reduces infrastructure costs by 30-40%
    while improving scalability and disaster recovery capabilities.`,
    industry: 'Technology',
    company_size: 'medium',
    objective_type: 'cost_reduction',
    success_metrics: { cost_savings: '35%', downtime_reduction: '50%', deployment_speed: '3x faster' },
    outcomes: { roi: '250%', time_to_value: '8 months', customer_satisfaction: '4.5/5' },
    implementation_cost: 'high',
    timeframe: '12-18 months',
    difficulty_level: 'high',
    success_rate: 0.75,
    case_study_source: 'Multiple SaaS companies, Gartner Cloud Migration Report 2024',
    tags: ['cloud', 'digital transformation', 'infrastructure', 'cost reduction']
  },
  {
    title: 'Customer-Centric Product Development with Agile',
    description: 'Adopt agile methodologies to accelerate product development and increase customer satisfaction',
    strategy_text: `Transition from waterfall to agile development with 2-week sprints, daily standups, and continuous customer feedback loops.
    Implement cross-functional teams, product owners, and scrum masters. Use tools like Jira, Confluence, and retrospectives for continuous improvement.
    This strategy reduces time-to-market by 40% and increases feature adoption rates by incorporating customer feedback early and often.`,
    industry: 'Technology',
    company_size: 'small',
    objective_type: 'time_to_market',
    success_metrics: { sprint_velocity: '+50%', customer_nps: '+25 points', defect_rate: '-40%' },
    outcomes: { time_to_market: '6 weeks vs 6 months', customer_retention: '+15%', team_satisfaction: '4.3/5' },
    implementation_cost: 'medium',
    timeframe: '6-9 months',
    difficulty_level: 'medium',
    success_rate: 0.82,
    case_study_source: 'Spotify, Atlassian, State of Agile Report 2024',
    tags: ['agile', 'product development', 'customer satisfaction', 'innovation']
  },
  {
    title: 'Data-Driven Decision Making with Business Intelligence',
    description: 'Implement comprehensive BI platform to enable data-driven culture across the organization',
    strategy_text: `Deploy modern BI tools (Tableau, Power BI, or Looker) connected to centralized data warehouse.
    Create executive dashboards, departmental KPIs, and self-service analytics capabilities. Train teams on data literacy and analytics.
    Establish data governance policies and data quality standards. This enables faster, evidence-based decision making and identifies
    new revenue opportunities through predictive analytics.`,
    industry: 'Retail',
    company_size: 'large',
    objective_type: 'operational_efficiency',
    success_metrics: { decision_speed: '3x faster', data_accuracy: '98%+', adoption_rate: '75% of managers' },
    outcomes: { revenue_growth: '+12%', cost_optimization: '$2M annually', forecasting_accuracy: '+30%' },
    implementation_cost: 'high',
    timeframe: '9-12 months',
    difficulty_level: 'high',
    success_rate: 0.68,
    case_study_source: 'Walmart, Target, McKinsey Analytics Study 2024',
    tags: ['business intelligence', 'data analytics', 'decision making', 'data culture']
  },
  {
    title: 'Employee Engagement through Career Development Programs',
    description: 'Reduce turnover and increase productivity through structured career development',
    strategy_text: `Launch comprehensive career development program including: individual development plans (IDPs), mentorship matching,
    skill development workshops, internal mobility pathways, and tuition reimbursement. Create clear career ladders for each role family.
    Implement quarterly career conversations and 360-degree feedback. This strategy addresses the top reason employees leave (lack of growth)
    and builds internal talent pipeline, reducing recruitment costs.`,
    industry: 'Healthcare',
    company_size: 'large',
    objective_type: 'talent_retention',
    success_metrics: { turnover_reduction: '-35%', internal_promotions: '+50%', employee_engagement: '+20 points' },
    outcomes: { recruitment_savings: '$3M annually', time_to_fill: '-40%', productivity: '+18%' },
    implementation_cost: 'medium',
    timeframe: '12 months',
    difficulty_level: 'medium',
    success_rate: 0.79,
    case_study_source: 'Mayo Clinic, Cleveland Clinic, SHRM Talent Retention Report 2024',
    tags: ['talent retention', 'career development', 'employee engagement', 'internal mobility']
  },
  {
    title: 'Market Expansion through Strategic Partnerships',
    description: 'Accelerate growth by forming strategic partnerships with complementary businesses',
    strategy_text: `Identify and establish partnerships with 3-5 non-competing businesses that serve similar customer segments.
    Create co-marketing campaigns, bundled offerings, and referral programs. Share customer insights (with consent) and cross-promote services.
    Establish partnership success metrics and quarterly business reviews. This strategy provides access to new customer segments
    at lower acquisition costs compared to traditional marketing.`,
    industry: 'Education',
    company_size: 'small',
    objective_type: 'market_expansion',
    success_metrics: { new_customers: '+200%', cac_reduction: '-45%', partnership_revenue: '25% of total' },
    outcomes: { revenue_growth: '+85%', market_reach: '3x expansion', brand_awareness: '+60%' },
    implementation_cost: 'low',
    timeframe: '6-12 months',
    difficulty_level: 'medium',
    success_rate: 0.71,
    case_study_source: 'Coursera, Udacity, EdTech Partnership Report 2024',
    tags: ['partnerships', 'market expansion', 'customer acquisition', 'co-marketing']
  },
  {
    title: 'Operational Excellence through Lean Six Sigma',
    description: 'Eliminate waste and reduce defects using Lean Six Sigma methodology',
    strategy_text: `Train employees in Lean Six Sigma principles (Green Belt, Black Belt certifications). Form cross-functional improvement teams
    to identify and eliminate waste in key processes. Use DMAIC (Define, Measure, Analyze, Improve, Control) framework for continuous improvement.
    Implement visual management, kanban systems, and standardized work procedures. This reduces operational costs, improves quality,
    and shortens cycle times significantly.`,
    industry: 'Manufacturing',
    company_size: 'large',
    objective_type: 'quality_improvement',
    success_metrics: { defect_rate: '-60%', cycle_time: '-40%', cost_per_unit: '-25%' },
    outcomes: { quality_score: '99.5%', savings: '$5M annually', customer_complaints: '-70%' },
    implementation_cost: 'medium',
    timeframe: '18-24 months',
    difficulty_level: 'high',
    success_rate: 0.81,
    case_study_source: 'Toyota, General Electric, Lean Six Sigma Institute 2024',
    tags: ['lean', 'six sigma', 'operational excellence', 'quality improvement']
  },
  {
    title: 'Customer Retention through Loyalty Program',
    description: 'Increase repeat purchases and lifetime value through points-based loyalty program',
    strategy_text: `Design and launch tiered loyalty program with points for purchases, referrals, reviews, and engagement.
    Offer exclusive perks, early access to products, birthday rewards, and personalized recommendations. Integrate with mobile app
    for seamless experience. Use gamification elements to drive engagement. Analyze purchase patterns to create targeted offers.
    This increases purchase frequency and average order value while reducing churn.`,
    industry: 'Retail',
    company_size: 'medium',
    objective_type: 'customer_retention',
    success_metrics: { repeat_purchase_rate: '+45%', avg_order_value: '+30%', member_ltv: '+60%' },
    outcomes: { revenue_from_members: '65% of total', churn_reduction: '-35%', app_downloads: '+120%' },
    implementation_cost: 'medium',
    timeframe: '6-9 months',
    difficulty_level: 'medium',
    success_rate: 0.77,
    case_study_source: 'Sephora, Starbucks, Loyalty Program Benchmark Report 2024',
    tags: ['customer retention', 'loyalty program', 'customer lifetime value', 'engagement']
  },
  {
    title: 'Innovation through Hackathons and Innovation Labs',
    description: 'Foster culture of innovation through structured innovation programs',
    strategy_text: `Establish quarterly internal hackathons where teams pitch and build new product ideas in 48 hours.
    Create innovation lab with dedicated resources and budget for promising projects. Implement innovation metrics and rewards program.
    Partner with universities and startup accelerators for external innovation. Allocate 10% of engineering time for innovation projects.
    This generates new product ideas, increases employee engagement, and accelerates innovation pipeline.`,
    industry: 'Technology',
    company_size: 'medium',
    objective_type: 'innovation',
    success_metrics: { new_products_launched: '8 per year', employee_participation: '60%', patent_applications: '+40%' },
    outcomes: { revenue_from_new_products: '20%', employee_satisfaction: '+25%', competitive_advantage: 'market_leader' },
    implementation_cost: 'low',
    timeframe: '12 months',
    difficulty_level: 'low',
    success_rate: 0.84,
    case_study_source: 'Google, Meta, Innovation Management Report 2024',
    tags: ['innovation', 'hackathons', 'product development', 'culture']
  },
  {
    title: 'Sustainability Initiative for Brand Differentiation',
    description: 'Implement comprehensive sustainability program to attract conscious consumers',
    strategy_text: `Commit to carbon neutrality by 2030 through renewable energy, carbon offsets, and supply chain optimization.
    Use sustainable materials and packaging, implement circular economy principles, and publish annual sustainability reports.
    Partner with environmental organizations and obtain certifications (B Corp, Carbon Neutral). Communicate sustainability efforts
    transparently to customers. This differentiates brand, attracts ESG investors, and appeals to growing segment of conscious consumers.`,
    industry: 'Consumer Goods',
    company_size: 'large',
    objective_type: 'brand_positioning',
    success_metrics: { carbon_reduction: '-50%', sustainable_materials: '80%', brand_perception: '+35%' },
    outcomes: { revenue_growth: '+22%', investor_interest: '+40%', customer_loyalty: '+28%' },
    implementation_cost: 'high',
    timeframe: '36 months',
    difficulty_level: 'high',
    success_rate: 0.73,
    case_study_source: 'Patagonia, Unilever, Sustainability ROI Study 2024',
    tags: ['sustainability', 'brand differentiation', 'esg', 'circular economy']
  },
  {
    title: 'Omnichannel Customer Experience Integration',
    description: 'Create seamless customer experience across all touchpoints (online, mobile, in-store)',
    strategy_text: `Integrate e-commerce platform, mobile app, physical stores, and customer service into unified experience.
    Implement buy-online-pickup-in-store (BOPIS), unified inventory management, consistent pricing, and cross-channel loyalty program.
    Use customer data platform (CDP) for 360-degree customer view. Train staff on omnichannel tools and empower them to serve customers
    across channels. This increases customer satisfaction, order values, and shopping frequency.`,
    industry: 'Retail',
    company_size: 'large',
    objective_type: 'customer_experience',
    success_metrics: { csat_score: '+30%', cross_channel_shoppers: '45%', avg_basket_size: '+40%' },
    outcomes: { revenue_growth: '+28%', online_traffic: '+150%', store_traffic: '+15%' },
    implementation_cost: 'high',
    timeframe: '12-18 months',
    difficulty_level: 'high',
    success_rate: 0.69,
    case_study_source: 'Nike, Best Buy, Omnichannel Retail Report 2024',
    tags: ['omnichannel', 'customer experience', 'digital integration', 'retail']
  }
];

async function seedStrategies() {
  const client = await pool.connect();

  try {
    console.log('Starting strategy knowledge base seeding...');

    // Check if strategies already exist
    const checkResult = await client.query('SELECT COUNT(*) FROM strategy_knowledge');
    const existingCount = parseInt(checkResult.rows[0].count);

    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing strategies. Skipping seed.`);
      console.log('To re-seed, manually delete records from strategy_knowledge table first.');
      return;
    }

    // Insert sample strategies
    let insertedCount = 0;
    for (const strategy of sampleStrategies) {
      await client.query(
        `INSERT INTO strategy_knowledge
         (title, description, strategy_text, industry, company_size, objective_type,
          success_metrics, outcomes, implementation_cost, timeframe, difficulty_level,
          success_rate, case_study_source, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          strategy.title,
          strategy.description,
          strategy.strategy_text,
          strategy.industry,
          strategy.company_size,
          strategy.objective_type,
          JSON.stringify(strategy.success_metrics),
          JSON.stringify(strategy.outcomes),
          strategy.implementation_cost,
          strategy.timeframe,
          strategy.difficulty_level,
          strategy.success_rate,
          strategy.case_study_source,
          strategy.tags
        ]
      );
      insertedCount++;
      console.log(`✓ Inserted: ${strategy.title}`);
    }

    console.log(`\n✅ Successfully seeded ${insertedCount} strategies to the knowledge base!`);
    console.log('\nStrategies by industry:');
    const industries = [...new Set(sampleStrategies.map(s => s.industry))];
    industries.forEach(industry => {
      const count = sampleStrategies.filter(s => s.industry === industry).length;
      console.log(`  - ${industry}: ${count} strategies`);
    });

  } catch (error) {
    console.error('Error seeding strategies:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  seedStrategies()
    .then(() => {
      console.log('\nSeeding complete. Exiting...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export default seedStrategies;
