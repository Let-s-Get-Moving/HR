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

-- Add indexes for performance (only if tables and columns exist)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='bonuses') THEN
        CREATE INDEX IF NOT EXISTS idx_bonuses_employee_id ON bonuses(employee_id);
        CREATE INDEX IF NOT EXISTS idx_bonuses_status ON bonuses(status);
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bonuses' AND column_name='period') THEN
            CREATE INDEX IF NOT EXISTS idx_bonuses_period ON bonuses(period);
        END IF;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='commissions') THEN
        CREATE INDEX IF NOT EXISTS idx_commissions_employee_id ON commissions(employee_id);
        CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='commissions' AND column_name='period') THEN
            CREATE INDEX IF NOT EXISTS idx_commissions_period ON commissions(period);
        END IF;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Insert some sample data (DISABLED - no mock data)
-- All mock data removed - bonuses and commissions will be created through the app
