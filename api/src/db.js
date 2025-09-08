import dbPool from './utils/dbPool.js';

// Export the query function using the pool manager
export const q = async (text, params) => {
  return await dbPool.query(text, params);
};

// Export pool for direct access if needed
export { dbPool as pool };
