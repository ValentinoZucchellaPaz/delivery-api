import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

(async function testConnection() {
    try {
        const [rows] = await pool.query("SELECT NOW() AS currentTime");
        console.log("Conexión correcta, MySQL responde:", rows[0].currentTime);
    } catch (err) {
        console.error("Error conectando a MySQL:", err);
        process.exit(1);
    }
})();


export default pool;