import { Pool } from "pg";

const globalForPg = globalThis;

/** @type {Pool} */
export const pool =
  globalForPg.__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.__pgPool = pool;
}

/**
 * Execute a query with optional parameters
 * @param {string} text - SQL query
 * @param {any[]} [params] - Query parameters
 */
export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // if (process.env.NODE_ENV === "development") {
  //   console.log("executed query", { text, duration, rows: res.rowCount });
  // }
  return res;
}

/**
 * Get a client for transactions
 */
export async function getClient() {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const release = client.release.bind(client);

  const timeout = setTimeout(() => {
    console.error("Client checkout timeout - 5 seconds");
    console.error("Last query:", client.lastQuery);
  }, 5000);

  client.query = (...args) => {
    client.lastQuery = args;
    return originalQuery(...args);
  };

  client.release = () => {
    clearTimeout(timeout);
    client.query = originalQuery;
    client.release = release;
    return release();
  };

  return client;
}

/**
 * Run operations inside a transaction
 * @param {(client: import('pg').PoolClient) => Promise<any>} callback
 */
export async function withTransaction(callback) {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
