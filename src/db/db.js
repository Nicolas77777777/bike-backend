import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;

const PGHOST = process.env.PGHOST || 'interchange.proxy.rlwy.net';
const PGPORT = parseInt(process.env.PGPORT) || 47859;
const PGUSER = process.env.PGUSER || 'postgres';
const PGPASSWORD = process.env.PGPASSWORD || 'EgrytImxZJfFWtXlENurrapInfOvvcRU';
const PGDATABASE = process.env.PGDATABASE || 'railway';

console.log('🔧 Connessione DB:', {
  PGHOST,
  PGPORT,
  PGUSER,
  PGDATABASE
});

const pool = new Pool({
  user: PGUSER,
  host: PGHOST,
  database: PGDATABASE,
  password: PGPASSWORD,
  port: PGPORT,
  ssl: {
    rejectUnauthorized: false
  }
});

export default pool;
