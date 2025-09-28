import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config({ quiet: true });

const pool = new Pool({
  // supabase
  // connectionString: process.env.DB_CONNECTION_STR,
  // ssl: {
  //     rejectUnauthorized: false // Supabase requires this option
  // },
  // local
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 10, // n° of pool connections
  idleTimeoutMillis: 30000,
});

export async function testConnection() {
  try {
    const res = await pool.query("SELECT NOW() AS currentTime");
    console.log("Succesful connection to Postgres:", res.rows[0].currenttime);
  } catch (err) {
    console.error("Error connecting to Postgres:", err);
    // process.exit(1);
  }
}

export default pool;
