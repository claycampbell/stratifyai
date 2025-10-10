-- Seed strategic planning test data for RMU Athletics

-- 1. Create Risks
INSERT INTO risks (title, description, category, likelihood, impact, status, mitigation_strategy, owner_email, tags)
VALUES
('Budget Constraints Impact Athletic Programs', 'Reduced funding may limit recruitment and facility improvements', 'financial', 'high', 'high', 'mitigating', 'Diversify revenue streams through sponsorships and alumni donations', 'athletics.director@rmu.edu', ARRAY['athletics', 'strategic']),
('Key Coaching Staff Retention Risk', 'Competition from larger programs may attract top coaches', 'operational', 'medium', 'very_high', 'monitoring', 'Competitive compensation packages and career development opportunities', 'hr.athletics@rmu.edu', ARRAY['athletics', 'strategic']),
('NCAA Compliance Changes', 'New regulations may require operational adjustments', 'compliance', 'medium', 'medium', 'assessing', 'Dedicated compliance team and regular policy reviews', 'compliance@rmu.edu', ARRAY['athletics', 'strategic']),
('Student-Athlete Academic Performance', 'Risk of not meeting academic progress requirements', 'reputational', 'low', 'high', 'monitoring', 'Enhanced tutoring programs and academic support services', 'academic.services@rmu.edu', ARRAY['athletics', 'strategic']),
('Facility Infrastructure Aging', 'Aging athletic facilities may affect recruitment and safety', 'operational', 'high', 'medium', 'identified', 'Phased renovation plan with capital campaign', 'facilities@rmu.edu', ARRAY['athletics', 'strategic']);

-- 2. Create Initiatives
INSERT INTO initiatives (title, description, objective, status, priority, start_date, target_end_date, completion_percentage, budget_allocated, budget_spent, owner_email, expected_benefits, success_criteria, tags, team_members)
VALUES
('Athlete Mental Health & Wellness Program', 'Comprehensive mental health support program for all student-athletes', 'Improve student-athlete wellbeing and retention rates', 'in_progress', 'high', '2025-01-01', '2025-12-31', 35, 150000, 45000, 'wellness@rmu.edu', 'Reduced athlete burnout, improved academic performance, higher retention', '90% athlete satisfaction, 15% reduction in withdrawals', ARRAY['athletics', 'strategic', '2025'], ARRAY['wellness@rmu.edu', 'athletics.director@rmu.edu']),
('Athletic Facilities Modernization Phase 1', 'Upgrade training facilities and locker rooms', 'Enhance recruitment competitiveness and athlete experience', 'approved', 'critical', '2025-06-01', '2026-05-31', 10, 2500000, 250000, 'facilities@rmu.edu', 'Improved recruitment, enhanced athlete performance, modernized infrastructure', 'Complete renovation on time and under budget', ARRAY['athletics', 'strategic', '2025'], ARRAY['facilities@rmu.edu', 'athletics.director@rmu.edu']),
('Digital Athletic Performance Platform', 'Implement data analytics platform for performance tracking', 'Leverage data to optimize athletic performance', 'planning', 'medium', '2025-08-01', '2025-12-31', 5, 75000, 0, 'performance@rmu.edu', 'Data-driven coaching decisions, injury prevention, performance optimization', 'Platform adoption by 80% of coaching staff', ARRAY['athletics', 'strategic', '2025'], ARRAY['performance@rmu.edu', 'athletics.director@rmu.edu']),
('Alumni Engagement & Fundraising Campaign', 'Launch comprehensive alumni fundraising initiative', 'Increase athletic department revenue through alumni contributions', 'in_progress', 'high', '2025-02-01', '2025-11-30', 50, 100000, 55000, 'development@rmu.edu', 'Sustainable funding, enhanced alumni network, scholarship opportunities', 'Raise $1M in commitments, 500+ new donors', ARRAY['athletics', 'strategic', '2025'], ARRAY['development@rmu.edu', 'athletics.director@rmu.edu']);

-- 3. Create Scenarios
INSERT INTO scenarios (name, description, scenario_type, assumptions, probability, status, is_baseline, created_by, tags)
VALUES
('Best Case: Increased Conference Revenue', 'Conference TV deal provides 30% revenue increase', 'best_case', 'New media rights deal, increased sponsorships, successful fundraising', 0.25, 'active', false, 'athletics.director@rmu.edu', ARRAY['athletics', 'planning', '2025']),
('Baseline: Current Trajectory', 'Steady state operations with 3% annual growth', 'most_likely', 'Moderate enrollment, stable funding, consistent performance', 0.50, 'active', true, 'athletics.director@rmu.edu', ARRAY['athletics', 'planning', '2025']),
('Worst Case: Budget Cuts', 'University-wide budget reduction impacts athletics by 20%', 'worst_case', 'Economic downturn, reduced enrollment, decreased state funding', 0.25, 'active', false, 'athletics.director@rmu.edu', ARRAY['athletics', 'planning', '2025']);

-- 4. Create Budgets
INSERT INTO budgets (budget_name, description, budget_type, fiscal_year, allocated_amount, spent_amount, committed_amount, owner_email, status, tags)
VALUES
('FY2025 Athletic Operations Budget', 'Primary operating budget for all athletic programs', 'operational', 2025, 8500000, 2800000, 1200000, 'finance.athletics@rmu.edu', 'active', ARRAY['athletics', 'finance', 'fy2025']),
('Facilities Renovation Capital Budget', 'Capital budget for facility improvements', 'capital', 2025, 2500000, 250000, 800000, 'facilities@rmu.edu', 'active', ARRAY['athletics', 'finance', 'fy2025']),
('Q3 2025 Recruitment & Marketing', 'Quarterly budget for recruitment and promotional activities', 'discretionary', 2025, 150000, 45000, 25000, 'marketing.athletics@rmu.edu', 'active', ARRAY['athletics', 'finance', 'fy2025']);

-- 5. Create Resources
INSERT INTO resources (resource_name, resource_type, description, department, email, skills, capacity_hours_per_week, cost_per_hour, availability_status, tags)
VALUES
('Dr. Sarah Mitchell - Sports Psychologist', 'human', 'Licensed sports psychologist specializing in athlete mental health', 'Athletic Performance', 's.mitchell@rmu.edu', ARRAY['Sports Psychology', 'Counseling', 'Performance Coaching'], 40, 75, 'partially_allocated', ARRAY['athletics', 'active']),
('John Davis - Strength & Conditioning Coach', 'human', 'Head strength and conditioning coordinator', 'Athletic Performance', 'j.davis@rmu.edu', ARRAY['Strength Training', 'Injury Prevention', 'Athletic Performance'], 40, 60, 'fully_allocated', ARRAY['athletics', 'active']),
('Athletic Training Facility', 'facility', 'Main athletic training and conditioning facility', 'Facilities', NULL, NULL, 168, 0, 'available', ARRAY['athletics', 'active']),
('Hudl Performance Analysis Software', 'software', 'Video analysis and performance tracking platform', 'Technology', NULL, NULL, NULL, 5, 'available', ARRAY['athletics', 'active']);

SELECT 'Strategic planning test data seeded successfully!' as status;
