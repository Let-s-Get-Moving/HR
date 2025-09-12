-- Bonuses and Commissions Tables

-- Bonuses table
CREATE TABLE IF NOT EXISTS bonuses (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    bonus_type VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    period VARCHAR(50) NOT NULL,
    criteria TEXT,
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Paid')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Commissions table  
CREATE TABLE IF NOT EXISTS commissions (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    commission_rate DECIMAL(5,2) NOT NULL,
    threshold_amount DECIMAL(10,2) DEFAULT 0,
    deal_amount DECIMAL(10,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    period VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Paid')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_bonuses_employee_id ON bonuses(employee_id);
CREATE INDEX IF NOT EXISTS idx_bonuses_status ON bonuses(status);
CREATE INDEX IF NOT EXISTS idx_bonuses_period ON bonuses(period);

CREATE INDEX IF NOT EXISTS idx_commissions_employee_id ON commissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_period ON commissions(period);

-- Insert some sample data
INSERT INTO bonuses (employee_id, bonus_type, amount, period, criteria, status) VALUES
(75, 'Performance Bonus', 2500.00, 'Q3 2025', 'Exceeded quarterly targets by 15%', 'Approved'),
(76, 'Sales Bonus', 5000.00, 'Q3 2025', 'Achieved 120% of sales quota', 'Paid'),
(78, 'Project Completion Bonus', 1500.00, 'September 2025', 'Successfully delivered major client project', 'Approved')
ON CONFLICT DO NOTHING;

INSERT INTO commissions (employee_id, commission_rate, threshold_amount, deal_amount, commission_amount, period, status) VALUES
(76, 8.5, 0, 50000.00, 4250.00, 'Q3 2025', 'Paid'),
(78, 6.0, 10000.00, 75000.00, 4500.00, 'Q3 2025', 'Approved'),
(80, 5.5, 5000.00, 25000.00, 1375.00, 'September 2025', 'Pending')
ON CONFLICT DO NOTHING;
