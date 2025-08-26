// connection.js
import pkg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DB_CONNECTION_STR,
    ssl: {
        rejectUnauthorized: false // Supabase requires this option
    },
});

(async function testConnection() {
    try {
        const res = await pool.query("SELECT NOW() AS currentTime");
        console.log("Succesful connection to Postgres:", res.rows[0].currenttime);
    } catch (err) {
        console.error("Error connecting to Postgres:", err);
        process.exit(1);
    }
})();

export default pool;