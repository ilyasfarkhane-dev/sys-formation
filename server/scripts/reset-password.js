import { pool, query } from "../src/db.js";
import bcrypt from "bcryptjs";
try {
  const email = process.env.RESET_EMAIL,
    password = process.env.RESET_PASSWORD;
  if (!email || !password || password.length < 12)
    throw new Error(
      "Définissez RESET_EMAIL et RESET_PASSWORD (12 caractères minimum).",
    );
  const r = await query(
    "UPDATE users SET password_hash=?,token_version=token_version+1 WHERE email=?",
    [await bcrypt.hash(password, 12), email],
  );
  if (!r.affectedRows) throw new Error("Compte introuvable.");
  console.log("Mot de passe remplacé, sessions révoquées.");
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
