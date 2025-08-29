import pg from "pg";

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const q = async (text, params) => {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};
