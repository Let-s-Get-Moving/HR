import pkg from 'pg';
const { Pool } = pkg;
import { URL } from 'url';

function enforceSSL(connStr) {
  if (!connStr) return connStr;
  try {
    const parsed = new URL(connStr);
    if (parsed.protocol.startsWith('postgres')) {
      // Render requires TLS; ensure sslmode=require
      if (!parsed.searchParams.get('sslmode')) {
        parsed.searchParams.set('sslmode', 'require');
      }
      return parsed.toString();
    }
  } catch (e) {
    console.warn('Failed to parse connection string:', e.message);
  }
  return connStr;
}

const DATABASE_URL = process.env.DATABASE_URL || '';
const READ_REPLICA_URL = process.env.READ_REPLICA_URL || '';
const FORCE_PRIMARY_READS = (process.env.FORCE_PRIMARY_READS || 'false').toLowerCase() === 'true';

const primaryConn = enforceSSL(DATABASE_URL);
const replicaConn = (!READ_REPLICA_URL || FORCE_PRIMARY_READS) ? primaryConn : enforceSSL(READ_REPLICA_URL);

const primaryPool = new Pool({
  connectionString: primaryConn,
  ssl: primaryConn?.includes('render.com') ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const replicaPool = new Pool({
  connectionString: replicaConn,
  ssl: replicaConn?.includes('render.com') ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export function readerPool() {
  return (FORCE_PRIMARY_READS || replicaConn === primaryConn) ? primaryPool : replicaPool;
}

// Lightweight timing/log helper
export async function timedQuery(pool, text, params = [], meta = {}) {
  const t0 = process.hrtime.bigint();
  let res;
  try {
    res = await pool.query(text, params);
  } catch (error) {
    const t1 = process.hrtime.bigint();
    const ms = Number(t1 - t0) / 1e6;
    if ((process.env.DEBUG_DATA_DRIFT || 'false').toLowerCase() === 'true') {
      console.error(JSON.stringify({ 
        kind: 'sql_error', 
        ms: ms.toFixed(1), 
        error: error.message,
        meta 
      }));
    }
    throw error;
  }
  
  const t1 = process.hrtime.bigint();
  const ms = Number(t1 - t0) / 1e6;
  
  if ((process.env.DEBUG_DATA_DRIFT || 'false').toLowerCase() === 'true') {
    const shape = Array.isArray(params) 
      ? params.map(p => (p == null ? 'null' : typeof p)).join(',') 
      : typeof params;
    // Keep logs concise to avoid leaking PII
    console.log(JSON.stringify({ 
      kind: 'sql', 
      ms: ms.toFixed(1), 
      rows: res.rowCount ?? res.rows?.length, 
      shape, 
      meta 
    }));
  }
  
  return res;
}

export { primaryPool, replicaPool };

