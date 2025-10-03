import { timedQuery } from './pools.js';

export async function dbPassport(pool) {
  const q = `
    SELECT current_database() AS db,
           current_user      AS usr,
           inet_server_addr()::text AS host,
           inet_server_port() AS port,
           version() AS pg_version,
           now() AS db_now
  `;
  
  try {
    const { rows } = await timedQuery(pool, q, [], { op: 'passport' });
    const row = rows[0] || {};
    
    return {
      database: row.db,
      user: row.usr,
      host: row.host,
      port: row.port,
      pg_version: row.pg_version?.split(' ')[0] + ' ' + row.pg_version?.split(' ')[1], // Compact version
      db_now: row.db_now,
      app_time: new Date().toISOString(),
      force_primary_reads: process.env.FORCE_PRIMARY_READS || 'false',
      database_url_host: process.env.DATABASE_URL?.match(/\/\/[^:]+:([^@]+)@([^:\/]+)/)?.[2] || 'unknown',
    };
  } catch (error) {
    return {
      error: error.message,
      database: 'connection_failed',
      app_time: new Date().toISOString(),
      force_primary_reads: process.env.FORCE_PRIMARY_READS || 'false',
    };
  }
}

