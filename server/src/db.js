import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
dotenv.config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
  quiet: true,
});
export const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "centreflow",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "centreflow",
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
  dateStrings: true,
  timezone: "Z",
  multipleStatements: false,
});
export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}
export async function transaction(fn) {
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    const result = await fn(c);
    await c.commit();
    return result;
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
  }
}
export async function run(c, sql, params = []) {
  const [rows] = await c.execute(sql, params);
  return rows;
}
