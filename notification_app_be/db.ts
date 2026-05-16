import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'notification_db',
  port: Number(process.env.DB_PORT) || 5432,
  max: 10,
  idleTimeoutMillis: 30000,
});

export const initDb = async (): Promise<void> => {
  const client = await pool.connect();
  client.release();
  // if we got here without throwing, connection works
};

export default pool;
