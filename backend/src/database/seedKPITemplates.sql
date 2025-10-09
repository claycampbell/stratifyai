-- Seed KPI Templates
-- This script populates the kpi_templates table with common KPI templates across different categories

-- Sales KPI Templates
INSERT INTO kpi_templates (name, description, category, target_value, unit, frequency, at_risk_threshold, off_track_threshold, validation_rules, is_public, created_by)
VALUES
('Monthly Revenue', 'Track monthly revenue against target', 'sales', 100000, '$', 'monthly', 0.85, 0.70, '{"min": 0, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Conversion Rate', 'Percentage of leads converted to customers', 'sales', 25, '%', 'monthly', 0.80, 0.60, '{"min": 0, "max": 100, "allowNegative": false}'::jsonb, TRUE, 'system'),
('New Customers Acquired', 'Number of new customers acquired per period', 'sales', 50, 'customers', 'monthly', 0.80, 0.65, '{"min": 0, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Average Deal Size', 'Average value of closed deals', 'sales', 5000, '$', 'quarterly', 0.85, 0.70, '{"min": 0, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Sales Cycle Length', 'Average number of days to close a deal', 'sales', 30, 'days', 'monthly', 1.15, 1.30, '{"min": 0, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Customer Retention Rate', 'Percentage of customers retained over time', 'sales', 95, '%', 'quarterly', 0.90, 0.85, '{"min": 0, "max": 100, "allowNegative": false}'::jsonb, TRUE, 'system');

-- Marketing KPI Templates
INSERT INTO kpi_templates (name, description, category, target_value, unit, frequency, at_risk_threshold, off_track_threshold, validation_rules, is_public, created_by)
VALUES
('Website Traffic', 'Monthly unique visitors to website', 'marketing', 50000, 'visitors', 'monthly', 0.80, 0.65, '{"min": 0, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Lead Generation', 'Number of qualified leads generated', 'marketing', 200, 'leads', 'monthly', 0.75, 0.60, '{"min": 0, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Cost Per Lead', 'Average cost to acquire a lead', 'marketing', 50, '$', 'monthly', 1.20, 1.40, '{"min": 0, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Email Open Rate', 'Percentage of emails opened', 'marketing', 25, '%', 'weekly', 0.80, 0.65, '{"min": 0, "max": 100, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Social Media Engagement', 'Average engagement rate on social media posts', 'marketing', 5, '%', 'weekly', 0.75, 0.60, '{"min": 0, "max": 100, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Marketing ROI', 'Return on marketing investment', 'marketing', 400, '%', 'quarterly', 0.85, 0.70, '{"min": 0, "allowNegative": false}'::jsonb, TRUE, 'system');

-- Operations KPI Templates
INSERT INTO kpi_templates (name, description, category, target_value, unit, frequency, at_risk_threshold, off_track_threshold, validation_rules, is_public, created_by)
VALUES
('On-Time Delivery', 'Percentage of deliveries made on time', 'operations', 98, '%', 'monthly', 0.95, 0.90, '{"min": 0, "max": 100, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Production Efficiency', 'Percentage of production capacity utilized', 'operations', 85, '%', 'monthly', 0.90, 0.80, '{"min": 0, "max": 100, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Defect Rate', 'Percentage of products with defects', 'operations', 2, '%', 'weekly', 1.25, 1.50, '{"min": 0, "max": 100, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Inventory Turnover', 'Number of times inventory is sold and replaced', 'operations', 12, 'turns/year', 'monthly', 0.85, 0.70, '{"min": 0, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Order Fulfillment Time', 'Average time to fulfill customer orders', 'operations', 24, 'hours', 'weekly', 1.15, 1.30, '{"min": 0, "allowNegative": false}'::jsonb, TRUE, 'system');

-- Finance KPI Templates
INSERT INTO kpi_templates (name, description, category, target_value, unit, frequency, at_risk_threshold, off_track_threshold, validation_rules, is_public, created_by)
VALUES
('Gross Profit Margin', 'Gross profit as percentage of revenue', 'finance', 60, '%', 'monthly', 0.90, 0.80, '{"min": 0, "max": 100, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Operating Cash Flow', 'Cash generated from operations', 'finance', 200000, '$', 'monthly', 0.85, 0.70, '{"min": 0, "allowNegative": true}'::jsonb, TRUE, 'system'),
('Accounts Receivable Days', 'Average days to collect payment', 'finance', 30, 'days', 'monthly', 1.15, 1.30, '{"min": 0, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Budget Variance', 'Percentage deviation from budget', 'finance', 5, '%', 'monthly', 1.20, 1.50, '{"min": 0, "max": 100, "allowNegative": false}'::jsonb, TRUE, 'system'),
('EBITDA', 'Earnings before interest, taxes, depreciation and amortization', 'finance', 500000, '$', 'quarterly', 0.85, 0.70, '{"min": 0, "allowNegative": true}'::jsonb, TRUE, 'system');

-- Human Resources KPI Templates
INSERT INTO kpi_templates (name, description, category, target_value, unit, frequency, at_risk_threshold, off_track_threshold, validation_rules, is_public, created_by)
VALUES
('Employee Satisfaction', 'Employee satisfaction survey score', 'hr', 8.5, 'score', 'quarterly', 0.90, 0.80, '{"min": 0, "max": 10, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Employee Turnover Rate', 'Percentage of employees leaving the company', 'hr', 10, '%', 'quarterly', 1.20, 1.40, '{"min": 0, "max": 100, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Time to Hire', 'Average days to fill open positions', 'hr', 30, 'days', 'monthly', 1.15, 1.30, '{"min": 0, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Training Hours per Employee', 'Average training hours per employee per year', 'hr', 40, 'hours', 'annual', 0.85, 0.70, '{"min": 0, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Employee Productivity', 'Revenue per employee', 'hr', 150000, '$', 'quarterly', 0.85, 0.70, '{"min": 0, "allowNegative": false}'::jsonb, TRUE, 'system');

-- Customer Service KPI Templates
INSERT INTO kpi_templates (name, description, category, target_value, unit, frequency, at_risk_threshold, off_track_threshold, validation_rules, is_public, created_by)
VALUES
('Customer Satisfaction Score', 'Average customer satisfaction rating', 'customer_service', 4.5, 'score', 'monthly', 0.90, 0.80, '{"min": 0, "max": 5, "allowNegative": false}'::jsonb, TRUE, 'system'),
('First Response Time', 'Average time to first customer response', 'customer_service', 2, 'hours', 'weekly', 1.25, 1.50, '{"min": 0, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Resolution Rate', 'Percentage of issues resolved on first contact', 'customer_service', 80, '%', 'weekly', 0.85, 0.70, '{"min": 0, "max": 100, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Net Promoter Score', 'Customer loyalty and satisfaction metric', 'customer_service', 50, 'score', 'quarterly', 0.85, 0.70, '{"min": -100, "max": 100, "allowNegative": true}'::jsonb, TRUE, 'system'),
('Average Handle Time', 'Average time to resolve customer issues', 'customer_service', 10, 'minutes', 'weekly', 1.20, 1.40, '{"min": 0, "allowNegative": false}'::jsonb, TRUE, 'system');

-- Product Development KPI Templates
INSERT INTO kpi_templates (name, description, category, target_value, unit, frequency, at_risk_threshold, off_track_threshold, validation_rules, is_public, created_by)
VALUES
('Sprint Velocity', 'Story points completed per sprint', 'product', 50, 'points', 'weekly', 0.85, 0.70, '{"min": 0, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Code Quality Score', 'Automated code quality metric', 'product', 90, 'score', 'weekly', 0.90, 0.80, '{"min": 0, "max": 100, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Bug Resolution Time', 'Average time to resolve bugs', 'product', 48, 'hours', 'weekly', 1.15, 1.30, '{"min": 0, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Feature Adoption Rate', 'Percentage of users adopting new features', 'product', 60, '%', 'monthly', 0.80, 0.65, '{"min": 0, "max": 100, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Technical Debt Ratio', 'Ratio of technical debt to codebase size', 'product', 10, '%', 'monthly', 1.20, 1.50, '{"min": 0, "max": 100, "allowNegative": false}'::jsonb, TRUE, 'system');

-- Athletics-Specific KPI Templates (for Robert Morris University)
INSERT INTO kpi_templates (name, description, category, target_value, unit, frequency, at_risk_threshold, off_track_threshold, validation_rules, is_public, created_by)
VALUES
('Student-Athlete GPA', 'Average GPA of student-athletes', 'athletics', 3.2, 'GPA', 'quarterly', 0.90, 0.85, '{"min": 0, "max": 4.0, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Graduation Rate', 'Percentage of student-athletes graduating', 'athletics', 85, '%', 'annual', 0.90, 0.80, '{"min": 0, "max": 100, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Win-Loss Ratio', 'Team winning percentage', 'athletics', 60, '%', 'monthly', 0.85, 0.70, '{"min": 0, "max": 100, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Attendance Rate', 'Average attendance at athletic events', 'athletics', 5000, 'attendees', 'monthly', 0.80, 0.65, '{"min": 0, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Fundraising Revenue', 'Total fundraising revenue for athletics', 'athletics', 500000, '$', 'quarterly', 0.85, 0.70, '{"min": 0, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Social Media Reach', 'Total reach across social media platforms', 'athletics', 100000, 'impressions', 'monthly', 0.80, 0.65, '{"min": 0, "allowNegative": false}'::jsonb, TRUE, 'system'),
('Athlete Injury Rate', 'Percentage of athletes with injuries', 'athletics', 5, '%', 'monthly', 1.20, 1.40, '{"min": 0, "max": 100, "allowNegative": false}'::jsonb, TRUE, 'system');
