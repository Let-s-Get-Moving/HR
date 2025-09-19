// Create missing recruiting and benefits tables
import { q } from "./src/db.js";

async function createMissingTables() {
  try {
    console.log('Creating missing recruiting and benefits tables...');

    // Create recruiting tables
    console.log('Creating job_postings table...');
    await q(`
      CREATE TABLE IF NOT EXISTS job_postings (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        department_id INTEGER REFERENCES departments(id),
        location VARCHAR(255) NOT NULL,
        employment_type VARCHAR(50) NOT NULL,
        salary_range VARCHAR(100),
        description TEXT,
        requirements TEXT,
        status VARCHAR(50) DEFAULT 'Open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating candidates table...');
    await q(`
      CREATE TABLE IF NOT EXISTS candidates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        position_id INTEGER REFERENCES job_postings(id),
        experience_years INTEGER DEFAULT 0,
        source VARCHAR(100),
        resume_url TEXT,
        cover_letter TEXT,
        status VARCHAR(50) DEFAULT 'New',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating job_applications table...');
    await q(`
      CREATE TABLE IF NOT EXISTS job_applications (
        id SERIAL PRIMARY KEY,
        candidate_id INTEGER REFERENCES candidates(id),
        job_posting_id INTEGER REFERENCES job_postings(id),
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'Applied',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating interviews table...');
    await q(`
      CREATE TABLE IF NOT EXISTS interviews (
        id SERIAL PRIMARY KEY,
        candidate_id INTEGER REFERENCES candidates(id),
        job_posting_id INTEGER REFERENCES job_postings(id),
        interview_date DATE NOT NULL,
        interview_time TIME NOT NULL,
        interview_type VARCHAR(50) NOT NULL,
        interviewer_id INTEGER REFERENCES employees(id),
        location VARCHAR(255),
        notes TEXT,
        status VARCHAR(50) DEFAULT 'Scheduled',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create benefits tables
    console.log('Creating benefits_plans table...');
    await q(`
      CREATE TABLE IF NOT EXISTS benefits_plans (
        id SERIAL PRIMARY KEY,
        plan_name VARCHAR(255) NOT NULL,
        provider VARCHAR(255) NOT NULL,
        plan_type VARCHAR(100) NOT NULL,
        department_id INTEGER REFERENCES departments(id),
        employee_cost DECIMAL(10,2) DEFAULT 0,
        employer_cost DECIMAL(10,2) DEFAULT 0,
        coverage_details TEXT,
        is_active BOOLEAN DEFAULT true,
        effective_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating benefits_enrollments table...');
    await q(`
      CREATE TABLE IF NOT EXISTS benefits_enrollments (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id),
        plan_id INTEGER REFERENCES benefits_plans(id),
        enrollment_date DATE DEFAULT CURRENT_DATE,
        coverage_start_date DATE,
        coverage_end_date DATE,
        status VARCHAR(50) DEFAULT 'Active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating insurance_plans table...');
    await q(`
      CREATE TABLE IF NOT EXISTS insurance_plans (
        id SERIAL PRIMARY KEY,
        plan_name VARCHAR(255) NOT NULL,
        provider VARCHAR(255) NOT NULL,
        plan_type VARCHAR(100) NOT NULL,
        coverage_type VARCHAR(100) NOT NULL,
        employee_premium DECIMAL(10,2) DEFAULT 0,
        employer_premium DECIMAL(10,2) DEFAULT 0,
        deductible DECIMAL(10,2) DEFAULT 0,
        coverage_details TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating retirement_plans table...');
    await q(`
      CREATE TABLE IF NOT EXISTS retirement_plans (
        id SERIAL PRIMARY KEY,
        plan_name VARCHAR(255) NOT NULL,
        provider VARCHAR(255) NOT NULL,
        plan_type VARCHAR(100) NOT NULL,
        employee_contribution_rate DECIMAL(5,2) DEFAULT 0,
        employer_match_rate DECIMAL(5,2) DEFAULT 0,
        vesting_schedule TEXT,
        contribution_limits DECIMAL(10,2),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create bonuses and commissions tables
    console.log('Creating bonuses table...');
    await q(`
      CREATE TABLE IF NOT EXISTS bonuses (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id),
        bonus_type VARCHAR(100) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        period VARCHAR(50) NOT NULL,
        criteria TEXT,
        status VARCHAR(50) DEFAULT 'Pending',
        approved_by INTEGER REFERENCES employees(id),
        approved_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating commissions table...');
    await q(`
      CREATE TABLE IF NOT EXISTS commissions (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id),
        commission_rate DECIMAL(5,2) NOT NULL,
        threshold_amount DECIMAL(10,2) DEFAULT 0,
        deal_amount DECIMAL(10,2) NOT NULL,
        commission_amount DECIMAL(10,2) NOT NULL,
        period VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        approved_by INTEGER REFERENCES employees(id),
        approved_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating bonus_structures table...');
    await q(`
      CREATE TABLE IF NOT EXISTS bonus_structures (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        structure_type VARCHAR(100) NOT NULL,
        base_amount DECIMAL(10,2) DEFAULT 0,
        criteria TEXT NOT NULL,
        effective_date DATE DEFAULT CURRENT_DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating commission_structures table...');
    await q(`
      CREATE TABLE IF NOT EXISTS commission_structures (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        structure_type VARCHAR(100) NOT NULL,
        base_rate DECIMAL(5,2) DEFAULT 0,
        criteria TEXT NOT NULL,
        effective_date DATE DEFAULT CURRENT_DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ All tables created successfully!');

  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
  }
}

createMissingTables();
