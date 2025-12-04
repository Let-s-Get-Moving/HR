-- Commission Structure Settings Migration
-- Adds configurable commission structure settings for Sales Agents and Sales Managers

-- Sales Agents Commission Structure Settings (7 thresholds + vacation package)
-- Use INSERT with ON CONFLICT to handle existing settings
INSERT INTO application_settings (key, value, type, category, description, default_value)
SELECT * FROM (VALUES
  -- Sales Agent Threshold 1: < 30% leads & < $115k revenue = 3.5%
  ('sales_agent_threshold_1', '30,115000,3.5', 'text', 'system', 'Sales Agent Threshold 1: Lead conversion %, Revenue threshold, Commission %', '30,115000,3.5'),
  
  -- Sales Agent Threshold 2: >= 30% leads & < $115k revenue = 4%
  ('sales_agent_threshold_2', '30,115000,4', 'text', 'system', 'Sales Agent Threshold 2: Lead conversion %, Revenue threshold, Commission %', '30,115000,4'),
  
  -- Sales Agent Threshold 3: < 30% leads & >= $115k revenue = 4%
  ('sales_agent_threshold_3', '30,115000,4', 'text', 'system', 'Sales Agent Threshold 3: Lead conversion %, Revenue threshold, Commission %', '30,115000,4'),
  
  -- Sales Agent Threshold 4: >= 30% leads & >= $115k revenue = 4.5%
  ('sales_agent_threshold_4', '30,115000,4.5', 'text', 'system', 'Sales Agent Threshold 4: Lead conversion %, Revenue threshold, Commission %', '30,115000,4.5'),
  
  -- Sales Agent Threshold 5: >= 35% leads & >= $160k revenue = 5%
  ('sales_agent_threshold_5', '35,160000,5', 'text', 'system', 'Sales Agent Threshold 5: Lead conversion %, Revenue threshold, Commission %', '35,160000,5'),
  
  -- Sales Agent Threshold 6: >= 40% leads & >= $200k revenue = 5.5%
  ('sales_agent_threshold_6', '40,200000,5.5', 'text', 'system', 'Sales Agent Threshold 6: Lead conversion %, Revenue threshold, Commission %', '40,200000,5.5'),
  
  -- Sales Agent Threshold 7: >= 55% leads & >= $250k revenue = 6% (with vacation package)
  ('sales_agent_threshold_7', '55,250000,6', 'text', 'system', 'Sales Agent Threshold 7: Lead conversion %, Revenue threshold, Commission % (with vacation package if >= 55%)', '55,250000,6'),
  
  -- Sales Agent Vacation Package Value
  ('sales_agent_vacation_package_value', '5000', 'text', 'system', 'Sales Agent Vacation Package Value (for threshold with >= 55% leads & >= $250k revenue)', '5000'),
  
  -- Sales Manager Threshold 1: 0-19% booking = 0.25%
  ('sales_manager_threshold_1', '0,19,0.25', 'text', 'system', 'Sales Manager Threshold 1: Min booking %, Max booking %, Commission %', '0,19,0.25'),
  
  -- Sales Manager Threshold 2: 20-24% booking = 0.275%
  ('sales_manager_threshold_2', '20,24,0.275', 'text', 'system', 'Sales Manager Threshold 2: Min booking %, Max booking %, Commission %', '20,24,0.275'),
  
  -- Sales Manager Threshold 3: 25-29% booking = 0.30%
  ('sales_manager_threshold_3', '25,29,0.30', 'text', 'system', 'Sales Manager Threshold 3: Min booking %, Max booking %, Commission %', '25,29,0.30'),
  
  -- Sales Manager Threshold 4: 30-34% booking = 0.35%
  ('sales_manager_threshold_4', '30,34,0.35', 'text', 'system', 'Sales Manager Threshold 4: Min booking %, Max booking %, Commission %', '30,34,0.35'),
  
  -- Sales Manager Threshold 5: 35-39% booking = 0.40%
  ('sales_manager_threshold_5', '35,39,0.40', 'text', 'system', 'Sales Manager Threshold 5: Min booking %, Max booking %, Commission %', '35,39,0.40'),
  
  -- Sales Manager Threshold 6: 40%+ booking = 0.45%
  ('sales_manager_threshold_6', '40,100,0.45', 'text', 'system', 'Sales Manager Threshold 6: Min booking %, Max booking %, Commission %', '40,100,0.45')
) AS v(key, value, type, category, description, default_value)
WHERE NOT EXISTS (
  SELECT 1 FROM application_settings WHERE application_settings.key = v.key
);

COMMENT ON TABLE application_settings IS 'Commission structure settings added for Sales Agents and Sales Managers';

