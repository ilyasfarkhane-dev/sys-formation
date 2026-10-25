import jwt from "jsonwebtoken";
import { query } from "./db.js";
export function checkSecret() {
  if (
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET.length < 32 ||
    process.env.JWT_SECRET.includes("replace-with")
  )
    throw new Error(
      "JWT_SECRET doit contenir au moins 32 caractères aléatoires.",
    );
}
export function issue(res, user) {
  const token = jwt.sign(
    { sub: String(user.id), v: user.token_version },
    process.env.JWT_SECRET,
    { expiresIn: "8h", algorithm: "HS256" },
  );
  res.cookie("centreflow_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 8 * 3600 * 1000,
    path: "/",
  });
}
export async function auth(req, res, next) {
  try {
    const data = jwt.verify(
      req.cookies.centreflow_session || "",
      process.env.JWT_SECRET,
      { algorithms: ["HS256"] },
    );
    const [u] = await query(
      "SELECT id,name,email,role,active,token_version FROM users WHERE id=?",
      [data.sub],
    );
    if (!u || !u.active || data.v !== u.token_version)
      return res
        .status(401)
        .json({ error: "Session expirée. Reconnectez-vous." });
    req.user = u;
    next();
  } catch (e) {
    if (e.code?.startsWith("ER_") || e.code === "ECONNREFUSED") return next(e);
    res.status(401).json({ error: "Connexion requise." });
  }
}
export function admin(req, res, next) {
  if (req.user.role !== "admin" && req.user.role !== "superadmin")
    return res.status(403).json({ error: "Accès administrateur requis." });
  next();
}
export function superadmin(req, res, next) {
  if (req.user.role !== "superadmin")
    return res.status(403).json({ error: "Accès super administrateur requis." });
  next();
}
export async function audit(req, action, details, c = null) {
  if (req?.res) req.res.locals.audited = true;
  if (c)
    await c.execute(
      "INSERT INTO audit_log(user_id,action,details) VALUES(?,?,?)",
      [req.user.id, action, details],
    );
  else
    await query("INSERT INTO audit_log(user_id,action,details) VALUES(?,?,?)", [
      req.user.id,
      action,
      details,
    ]);
}
