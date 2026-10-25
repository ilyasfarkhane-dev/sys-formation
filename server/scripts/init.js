import { readFile } from "node:fs/promises";
import { pool, query } from "../src/db.js";
import { ensureTeachers } from "../src/schema-ensure.js";
import bcrypt from "bcryptjs";
try {
  const sql = await readFile(new URL("../schema.sql", import.meta.url), "utf8");
  for (const statement of sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean))
    await query(statement);
  await ensureTeachers();
  const email = process.env.ADMIN_EMAIL,
    password = process.env.ADMIN_PASSWORD;
  if (
    !email ||
    !password ||
    password.length < 12 ||
    password.includes("replace-with")
  )
    throw new Error(
      "Configure ADMIN_EMAIL et un ADMIN_PASSWORD personnel de 12 caractères minimum dans server/.env",
    );
  const existing = await query("SELECT id FROM users WHERE email=?", [email]);
  if (!existing.length)
    await query(
      "INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)",
      [
        process.env.ADMIN_NAME || "Administrateur",
        email,
        await bcrypt.hash(password, 12),
        "admin",
      ],
    );
  console.log("Base initialisée. Administrateur prêt : " + email);
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
