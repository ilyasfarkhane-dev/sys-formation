import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query, transaction, run } from "./db.js";
import { auth, admin, superadmin, issue, audit } from "./auth.js";
import {
  id,
  date,
  month,
  money,
  studentSchema,
  teacherSchema,
  specialtySchema,
  levelSchema,
  groupSchema,
  paymentAllowed,
  dueDate,
  invoiceState,
} from "./domain.js";
import { syncDeclaredInvoices } from "./schema-ensure.js";
import { defaultWelcome, welcomeText } from "./welcome.js";
import { defaultMakeup, defaultReceipt, defaultReminder, fillMessage } from "./messages.js";
import { reminderText, settledText, receiptPdf, receiptNumber } from "./billing-message.js";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
export const app = express();
app.disable("x-powered-by");
if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:"],
      },
    },
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.get("origin");
    const expected = process.env.APP_ORIGIN;
    if (!expected)
      return res.status(503).json({ error: "APP_ORIGIN non configurée." });
    if (origin && origin !== expected)
      return res.status(403).json({ error: "Origine non autorisée." });
    if (req.get("sec-fetch-site") === "cross-site")
      return res.status(403).json({ error: "Requête externe refusée." });
  }
  next();
});
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res)).catch(next);
const requireRow = (rows, msg = "Élément introuvable.") => {
  if (!rows.length) throw Object.assign(new Error(msg), { status: 404 });
  return rows[0];
};
const fail = (msg) => {
  throw Object.assign(new Error(msg), { status: 409 });
};
async function assignedTeacher(teacherId, allowInactiveId = null) {
  if (teacherId == null) return { id: null, name: "" };
  const teacher = requireRow(
    await query(
      "SELECT id, first_name, last_name, active FROM teachers WHERE id=?",
      [teacherId],
    ),
    "Formateur introuvable.",
  );
  if (!teacher.active && Number(teacher.id) !== Number(allowInactiveId))
    fail("Ce formateur est archivé.");
  return {
    id: teacher.id,
    name: `${teacher.first_name} ${teacher.last_name}`.trim(),
  };
}
function teacherLabel(row) {
  return `${row.first_name} ${row.last_name}`.trim();
}
// A group's matière follows the assigned formateur's specialty.
async function subjectForTeacher(teacherId, fallback = "") {
  if (teacherId == null) return fallback || "";
  const teacher = await query("SELECT specialty FROM teachers WHERE id=?", [
    teacherId,
  ]);
  return teacher[0]?.specialty || "";
}
async function assignedLevel(levelId) {
  if (levelId == null) return { id: null, name: "" };
  return requireRow(
    await query("SELECT id, name FROM school_levels WHERE id=?", [levelId]),
    "Niveau scolaire introuvable.",
  );
}
// Resolves a specialty id to its stored name.
async function assignedSpecialty(specialtyId) {
  if (specialtyId == null) return { id: null, name: "" };
  const specialty = requireRow(
    await query("SELECT id, name FROM specialties WHERE id=?", [specialtyId]),
    "Spécialité introuvable.",
  );
  return specialty;
}
app.get(
  "/api/health",
  wrap(async (req, res) => {
    await query("SELECT 1");
    res.json({ ok: true });
  }),
);
app.get(
  "/api/branding",
  wrap(async (_req, res) => {
    const [settings] = await query(
      "SELECT name, color, color_dark, logo FROM settings WHERE id=1",
    );
    res.json({
      name: settings?.name || "CentreFlow",
      color: settings?.color || "#176658",
      color_dark: settings?.color_dark || "#123b3a",
      logo: settings?.logo || "",
    });
  }),
);
app.post(
  "/api/auth/login",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Trop de tentatives. Réessayez dans 15 minutes." },
  }),
  wrap(async (req, res) => {
    const b = z
      .object({ email: z.email(), password: z.string().min(1).max(200) })
      .parse(req.body);
    const [u] = await query("SELECT * FROM users WHERE email=?", [b.email]);
    if (!u || !u.active || !(await bcrypt.compare(b.password, u.password_hash)))
      return res.status(401).json({ error: "Identifiants incorrects." });
    issue(res, u);
    req.user = u;
    await audit(req, "auth.login", u.email);
    res.json({ id: u.id, name: u.name, email: u.email, role: u.role });
  }),
);
app.post(
  "/api/auth/logout",
  auth,
  wrap(async (req, res) => {
    await audit(req, "auth.logout", req.user.email);
    await query("UPDATE users SET token_version=token_version+1 WHERE id=?", [
      req.user.id,
    ]);
    res.clearCookie("centreflow_session", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    res.json({ ok: true });
  }),
);
app.get("/api/auth/me", auth, (req, res) => {
  const { id, name, email, role } = req.user;
  res.json({ id, name, email, role });
});
app.post(
  "/api/auth/password",
  auth,
  wrap(async (req, res) => {
    const b = z
      .object({
        current: z.string().max(200),
        password: z.string().min(12).max(128),
      })
      .parse(req.body);
    const [u] = await query("SELECT * FROM users WHERE id=?", [req.user.id]);
    if (!(await bcrypt.compare(b.current, u.password_hash)))
      return res.status(400).json({ error: "Mot de passe actuel incorrect." });
    await query(
      "UPDATE users SET password_hash=?,token_version=token_version+1 WHERE id=?",
      [await bcrypt.hash(b.password, 12), u.id],
    );
    issue(res, { ...u, token_version: u.token_version + 1 });
    await audit(req, "auth.password", u.email);
    res.json({ ok: true });
  }),
);
app.use("/api", auth);
app.use("/api", (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  res.on("finish", () => {
    if (res.locals.audited || res.statusCode >= 400 || !req.user) return;
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const hidden = new Set([
      "password",
      "current",
      "confirm",
      "logo",
      "welcome_message",
      "reminder_message",
      "receipt_message",
      "makeup_message",
    ]);
    const details = Object.entries(body)
      .filter(([key, value]) => !hidden.has(key) && value != null && typeof value !== "object")
      .map(([, value]) => String(value).trim())
      .filter((value) => value && value.length <= 80)
      .slice(0, 4)
      .join(" · ")
      .slice(0, 500);
    audit(req, `${req.method} ${req.path}`, details).catch((error) =>
      console.error("Journal", error.message),
    );
  });
  next();
});
app.get(
  "/api/settings",
  wrap(async (req, res) =>
    res.json((await query("SELECT * FROM settings WHERE id=1"))[0]),
  ),
);
app.put(
  "/api/settings",
  admin,
  wrap(async (req, res) => {
    const b = z
      .object({
        name: z.string().trim().min(1).max(150),
        phone: z.string().max(40),
        address: z.string().max(255),
        currency: z.enum(["MAD", "EUR", "USD"]),
        due_day: z.coerce.number().int().min(1).max(28),
      })
      .parse(req.body);
    const [old] = await query("SELECT currency FROM settings WHERE id=1");
    if (
      b.currency !== old.currency &&
      (await query("SELECT id FROM invoices LIMIT 1")).length
    )
      fail(
        "La devise ne peut plus être modifiée après création de mensualités.",
      );
    await query(
      "UPDATE settings SET name=?,phone=?,address=?,currency=?,due_day=? WHERE id=1",
      [b.name, b.phone, b.address, b.currency, b.due_day],
    );
    res.json({ ok: true });
  }),
);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide.");
const brandMessage = z.string().max(4000);
app.put(
  "/api/branding",
  superadmin,
  wrap(async (req, res) => {
    const b = z
      .object({
        color: hexColor,
        color_dark: hexColor,
        logo: z
          .string()
          .max(700000)
          .refine(
            (value) =>
              value === "" ||
              /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(value),
            "Utilisez un logo PNG, JPEG ou WebP.",
          ),
        welcome_message: brandMessage,
        reminder_message: brandMessage,
        receipt_message: brandMessage,
        makeup_message: brandMessage,
      })
      .parse(req.body);
    await query(
      `UPDATE settings SET color=?,color_dark=?,logo=?,welcome_message=?,reminder_message=?,receipt_message=?,makeup_message=? WHERE id=1`,
      [
        b.color,
        b.color_dark,
        b.logo,
        b.welcome_message.trim() || defaultWelcome,
        b.reminder_message.trim() || defaultReminder,
        b.receipt_message.trim() || defaultReceipt,
        b.makeup_message.trim() || defaultMakeup,
      ],
    );
    await audit(req, "branding.update", "Couleurs, logo et messages WhatsApp");
    res.json({ ok: true });
  }),
);
app.get(
  "/api/whatsapp",
  admin,
  wrap(async (req, res) => {
    const { ensureWhatsApp, whatsappStatus } = await import("./whatsapp.js");
    await ensureWhatsApp();
    res.json(whatsappStatus());
  }),
);
app.post(
  "/api/whatsapp/logout",
  admin,
  wrap(async (req, res) => {
    const { logoutWhatsApp } = await import("./whatsapp.js");
    await logoutWhatsApp();
    res.json({ ok: true });
  }),
);
app.get(
  "/api/students",
  wrap(async (req, res) =>
    res.json(
      await query(
        `SELECT s.*, (SELECT COUNT(*) FROM enrollments e WHERE e.student_id=s.id AND (e.end_date IS NULL OR e.end_date>=CURDATE())) group_count FROM students s ORDER BY s.last_name,s.first_name`,
      ),
    ),
  ),
);
app.post(
  "/api/students",
  wrap(async (req, res) => {
    const b = studentSchema.parse(req.body);
    const level = await assignedLevel(b.level_id);
    const dueDay = b.due_date ? Number(b.due_date.slice(8, 10)) : null;
    const r = await query(
      "INSERT INTO students(first_name,last_name,phone,email,level,level_id,due_day,notes,active) VALUES(?,?,?,?,?,?,?,?,?)",
      [b.first_name, b.last_name, b.phone, b.email, level.name, level.id, dueDay, b.notes, b.active],
    );
    res.status(201).json({ id: r.insertId });
  }),
);
app.put(
  "/api/students/:id",
  wrap(async (req, res) => {
    const n = id.parse(req.params.id),
      b = studentSchema.parse(req.body);
    requireRow(await query("SELECT id FROM students WHERE id=?", [n]));
    const level = await assignedLevel(b.level_id);
    const dueDay = b.due_date ? Number(b.due_date.slice(8, 10)) : null;
    await query(
      "UPDATE students SET first_name=?,last_name=?,phone=?,email=?,level=?,level_id=?,due_day=?,notes=?,active=? WHERE id=?",
      [b.first_name, b.last_name, b.phone, b.email, level.name, level.id, dueDay, b.notes, b.active, n],
    );
    if (dueDay)
      await query(
        `UPDATE invoices i
         JOIN enrollments e ON e.id = i.enrollment_id
         LEFT JOIN (SELECT invoice_id FROM payments GROUP BY invoice_id) p ON p.invoice_id = i.id
         SET i.due_date = STR_TO_DATE(CONCAT(i.period, '-', LPAD(LEAST(?, DAY(LAST_DAY(CONCAT(i.period, '-01')))), 2, '0')), '%Y-%m-%d')
         WHERE e.student_id = ? AND p.invoice_id IS NULL`,
        [dueDay, n],
      );
    res.json({ ok: true });
  }),
);
app.get(
  "/api/specialties",
  wrap(async (req, res) =>
    res.json(
      await query(
        `SELECT s.*,
          (SELECT COUNT(*) FROM teachers t WHERE t.specialty_id=s.id) teacher_count,
          (SELECT GROUP_CONCAT(TRIM(CONCAT(t.first_name, ' ', t.last_name)) ORDER BY t.last_name, t.first_name SEPARATOR ', ')
            FROM teachers t WHERE t.specialty_id=s.id) teacher_names
         FROM specialties s ORDER BY s.name`,
      ),
    ),
  ),
);
app.post(
  "/api/specialties",
  wrap(async (req, res) => {
    const b = specialtySchema.parse(req.body);
    if ((await query("SELECT id FROM specialties WHERE name=?", [b.name])).length)
      fail("Cette spécialité existe déjà.");
    const r = await query("INSERT INTO specialties(name) VALUES(?)", [b.name]);
    res.status(201).json({ id: r.insertId });
  }),
);
app.put(
  "/api/specialties/:id",
  wrap(async (req, res) => {
    const n = id.parse(req.params.id),
      b = specialtySchema.parse(req.body);
    requireRow(
      await query("SELECT id FROM specialties WHERE id=?", [n]),
      "Spécialité introuvable.",
    );
    const duplicate = await query(
      "SELECT id FROM specialties WHERE name=? AND id<>?",
      [b.name, n],
    );
    if (duplicate.length) fail("Cette spécialité existe déjà.");
    await query("UPDATE specialties SET name=? WHERE id=?", [b.name, n]);
    await query("UPDATE teachers SET specialty=? WHERE specialty_id=?", [b.name, n]);
    await query(
      "UPDATE study_groups g JOIN teachers t ON t.id=g.teacher_id SET g.subject=? WHERE t.specialty_id=?",
      [b.name, n],
    );
    res.json({ ok: true });
  }),
);
app.delete(
  "/api/specialties/:id",
  wrap(async (req, res) => {
    const n = id.parse(req.params.id);
    requireRow(
      await query("SELECT id FROM specialties WHERE id=?", [n]),
      "Spécialité introuvable.",
    );
    await query(
      "UPDATE study_groups SET subject='' WHERE teacher_id IN (SELECT id FROM teachers WHERE specialty_id=?)",
      [n],
    );
    await query(
      "UPDATE teachers SET specialty='', specialty_id=NULL WHERE specialty_id=?",
      [n],
    );
    await query("DELETE FROM specialties WHERE id=?", [n]);
    res.json({ ok: true });
  }),
);
app.get(
  "/api/levels",
  wrap(async (req, res) =>
    res.json(
      await query(
        `SELECT l.*,
          (SELECT COUNT(*) FROM students s WHERE s.level_id=l.id) student_count,
          (SELECT GROUP_CONCAT(TRIM(CONCAT(s.first_name, ' ', s.last_name)) ORDER BY s.last_name, s.first_name SEPARATOR ', ')
            FROM students s WHERE s.level_id=l.id) student_names,
          (SELECT COUNT(*) FROM study_groups g WHERE g.level_id=l.id) group_count,
          (SELECT GROUP_CONCAT(g.name ORDER BY g.name SEPARATOR ', ') FROM study_groups g WHERE g.level_id=l.id) group_names
         FROM school_levels l ORDER BY l.name`,
      ),
    ),
  ),
);
app.post(
  "/api/levels",
  wrap(async (req, res) => {
    const b = levelSchema.parse(req.body);
    if ((await query("SELECT id FROM school_levels WHERE name=?", [b.name])).length)
      fail("Ce niveau scolaire existe déjà.");
    const r = await query("INSERT INTO school_levels(name) VALUES(?)", [b.name]);
    res.status(201).json({ id: r.insertId });
  }),
);
app.put(
  "/api/levels/:id",
  wrap(async (req, res) => {
    const n = id.parse(req.params.id),
      b = levelSchema.parse(req.body);
    requireRow(
      await query("SELECT id FROM school_levels WHERE id=?", [n]),
      "Niveau scolaire introuvable.",
    );
    if ((await query("SELECT id FROM school_levels WHERE name=? AND id<>?", [b.name, n])).length)
      fail("Ce niveau scolaire existe déjà.");
    await query("UPDATE school_levels SET name=? WHERE id=?", [b.name, n]);
    await query("UPDATE students SET level=? WHERE level_id=?", [b.name, n]);
    await query("UPDATE study_groups SET level=? WHERE level_id=?", [b.name, n]);
    res.json({ ok: true });
  }),
);
app.delete(
  "/api/levels/:id",
  wrap(async (req, res) => {
    const n = id.parse(req.params.id);
    requireRow(
      await query("SELECT id FROM school_levels WHERE id=?", [n]),
      "Niveau scolaire introuvable.",
    );
    await query("UPDATE students SET level='', level_id=NULL WHERE level_id=?", [n]);
    await query("UPDATE study_groups SET level='', level_id=NULL WHERE level_id=?", [n]);
    await query("DELETE FROM school_levels WHERE id=?", [n]);
    res.json({ ok: true });
  }),
);
app.get(
  "/api/teachers",
  wrap(async (req, res) =>
    res.json(
      await query(
        `SELECT t.*,
          (SELECT COUNT(*) FROM study_groups g WHERE g.teacher_id=t.id) group_count,
          (SELECT GROUP_CONCAT(g.name ORDER BY g.name SEPARATOR ', ') FROM study_groups g WHERE g.teacher_id=t.id) group_names
         FROM teachers t ORDER BY t.active DESC, t.last_name, t.first_name`,
      ),
    ),
  ),
);
app.post(
  "/api/teachers",
  wrap(async (req, res) => {
    const b = teacherSchema.parse(req.body);
    const specialty = await assignedSpecialty(b.specialty_id);
    const r = await query(
      "INSERT INTO teachers(first_name,last_name,phone,email,specialty,specialty_id,notes,active) VALUES(?,?,?,?,?,?,?,?)",
      [
        b.first_name,
        b.last_name,
        b.phone,
        b.email,
        specialty.name,
        specialty.id,
        b.notes,
        b.active,
      ],
    );
    res.status(201).json({ id: r.insertId });
  }),
);
app.put(
  "/api/teachers/:id",
  wrap(async (req, res) => {
    const n = id.parse(req.params.id),
      b = teacherSchema.parse(req.body);
    requireRow(await query("SELECT id FROM teachers WHERE id=?", [n]), "Formateur introuvable.");
    const specialty = await assignedSpecialty(b.specialty_id);
    await query(
      "UPDATE teachers SET first_name=?,last_name=?,phone=?,email=?,specialty=?,specialty_id=?,notes=?,active=? WHERE id=?",
      [
        b.first_name,
        b.last_name,
        b.phone,
        b.email,
        specialty.name,
        specialty.id,
        b.notes,
        b.active,
        n,
      ],
    );
    await query(
      "UPDATE study_groups g JOIN teachers t ON t.id=g.teacher_id SET g.teacher=?, g.subject=t.specialty WHERE g.teacher_id=?",
      [teacherLabel(b), n],
    );
    res.json({ ok: true });
  }),
);
app.get(
  "/api/groups",
  wrap(async (req, res) =>
    res.json(
      await query(
        `SELECT g.*,(SELECT COUNT(*) FROM enrollments e WHERE e.group_id=g.id AND e.start_date<=CURDATE() AND (e.end_date IS NULL OR e.end_date>=CURDATE())) student_count FROM study_groups g ORDER BY g.active DESC,g.name`,
      ),
    ),
  ),
);
app.post(
  "/api/groups",
  wrap(async (req, res) => {
    const b = groupSchema.parse(req.body);
    const teacher = await assignedTeacher(b.teacher_id);
    const level = await assignedLevel(b.level_id);
    const r = await query(
      "INSERT INTO study_groups(name,subject,teacher,teacher_id,level,level_id,schedule,room,monthly_fee,capacity,active) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
      [
        b.name,
        await subjectForTeacher(teacher.id, b.subject),
        teacher.id ? teacher.name : b.teacher,
        teacher.id,
        level.name,
        level.id,
        b.schedule,
        b.room,
        b.monthly_fee,
        b.capacity,
        b.active,
      ],
    );
    res.status(201).json({ id: r.insertId });
  }),
);
app.put(
  "/api/groups/:id",
  wrap(async (req, res) => {
    const n = id.parse(req.params.id),
      b = groupSchema.parse(req.body);
    const current = requireRow(
      await query("SELECT id, teacher_id FROM study_groups WHERE id=?", [n]),
    );
    const teacher = await assignedTeacher(b.teacher_id, current.teacher_id);
    const level = await assignedLevel(b.level_id);
    await query(
      "UPDATE study_groups SET name=?,subject=?,teacher=?,teacher_id=?,level=?,level_id=?,schedule=?,room=?,monthly_fee=?,capacity=?,active=? WHERE id=?",
      [
        b.name,
        await subjectForTeacher(teacher.id, b.subject),
        teacher.id ? teacher.name : b.teacher,
        teacher.id,
        level.name,
        level.id,
        b.schedule,
        b.room,
        b.monthly_fee,
        b.capacity,
        b.active,
        n,
      ],
    );
    res.json({ ok: true });
  }),
);
app.get(
  "/api/enrollments",
  wrap(async (req, res) =>
    res.json(
      await query(
        `SELECT e.*,CONCAT(s.first_name,' ',s.last_name) student_name,g.name group_name FROM enrollments e JOIN students s ON s.id=e.student_id JOIN study_groups g ON g.id=e.group_id ORDER BY e.id DESC`,
      ),
    ),
  ),
);
app.post(
  "/api/enrollments",
  wrap(async (req, res) => {
    const b = z
      .object({
        student_id: id,
        group_id: id,
        start_date: date,
        monthly_fee: money,
      })
      .parse(req.body);
    const result = await transaction(async (c) => {
      const g = requireRow(
        await run(c, "SELECT * FROM study_groups WHERE id=? FOR UPDATE", [
          b.group_id,
        ]),
      );
      const s = requireRow(
        await run(c, "SELECT * FROM students WHERE id=? FOR UPDATE", [
          b.student_id,
        ]),
      );
      if (!g.active || !s.active) fail("Élève et groupe doivent être actifs.");
      if (
        (
          await run(
            c,
            "SELECT id FROM enrollments WHERE student_id=? AND group_id=? AND (end_date IS NULL OR end_date>=?)",
            [b.student_id, b.group_id, b.start_date],
          )
        ).length
      )
        fail("Une inscription existe déjà sur cette période.");
      /* Conservatively include all future/open enrollments to prevent overbooking. */ const [
        { n },
      ] = await run(
        c,
        "SELECT COUNT(*) n FROM enrollments WHERE group_id=? AND (end_date IS NULL OR end_date>=?)",
        [b.group_id, b.start_date],
      );
      if (n >= g.capacity)
        fail("Capacité du groupe atteinte pour cette période.");
      const inserted = await run(
        c,
        "INSERT INTO enrollments(student_id,group_id,start_date,monthly_fee) VALUES(?,?,?,?)",
        [b.student_id, b.group_id, b.start_date, b.monthly_fee],
      );
      const declared = await run(
        c,
        "SELECT period, due_date FROM billing_periods WHERE group_id=?",
        [b.group_id],
      );
      let invoices = 0;
      for (const row of declared) {
        const created = await run(
          c,
          "INSERT IGNORE INTO invoices(enrollment_id,period,due_date,amount) VALUES(?,?,?,?)",
          [
            inserted.insertId,
            row.period,
            s.due_day ? dueDate(row.period, s.due_day) : row.due_date,
            b.monthly_fee,
          ],
        );
        invoices += created.affectedRows;
      }
      if (invoices)
        await audit(
          req,
          "invoices.generated",
          `Inscription ${inserted.insertId}: ${invoices} mensualités`,
          c,
        );
      return { id: inserted.insertId, invoices };
    });
    res.status(201).json(result);
  }),
);
app.patch(
  "/api/enrollments/:id/end",
  wrap(async (req, res) => {
    const n = id.parse(req.params.id),
      b = z.object({ end_date: date }).parse(req.body);
    await transaction(async (c) => {
      const e = requireRow(
        await run(c, "SELECT * FROM enrollments WHERE id=? FOR UPDATE", [n]),
      );
      if (b.end_date < e.start_date) fail("La fin doit suivre le début.");
      if (e.end_date) fail("Cette inscription est déjà clôturée.");
      const [future] = await run(
        c,
        "SELECT COUNT(*) n FROM invoices WHERE enrollment_id=? AND period>?",
        [n, b.end_date.slice(0, 7)],
      );
      if (future.n)
        fail(
          "Des mensualités existent après cette date. Choisissez une fin après le dernier mois facturé.",
        );
      await run(c, "UPDATE enrollments SET end_date=? WHERE id=?", [
        b.end_date,
        n,
      ]);
      await audit(
        req,
        "enrollment.closed",
        `Inscription ${n}, fin ${b.end_date}`,
        c,
      );
    });
    res.json({ ok: true });
  }),
);
app.get(
  "/api/sessions",
  wrap(async (req, res) =>
    res.json(
      await query(
        `SELECT se.*,g.name group_name,(SELECT COUNT(*) FROM attendance a WHERE a.session_id=se.id) marked_count FROM sessions se JOIN study_groups g ON g.id=se.group_id ORDER BY se.date DESC,se.start_time DESC`,
      ),
    ),
  ),
);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
app.post(
  "/api/sessions",
  wrap(async (req, res) => {
    const b = z
      .object({
        group_id: id,
        date: date,
        start_time: time,
        end_time: time,
        topic: z.string().max(255).default(""),
      })
      .refine((b) => b.end_time > b.start_time, {
        message: "La fin doit suivre le début.",
      })
      .parse(req.body);
    const g = requireRow(
      await query("SELECT active FROM study_groups WHERE id=?", [b.group_id]),
    );
    if (!g.active) fail("Ce groupe est archivé.");
    try {
      const r = await query(
        "INSERT INTO sessions(group_id,date,start_time,end_time,topic) VALUES(?,?,?,?,?)",
        Object.values(b),
      );
      res.status(201).json({ id: r.insertId });
    } catch (e) {
      if (e.code !== "ER_DUP_ENTRY") throw e;
      const [existing] = await query(
        "SELECT id FROM sessions WHERE group_id=? AND date=? AND start_time=?",
        [b.group_id, b.date, b.start_time],
      );
      res.json({ id: existing.id });
    }
  }),
);
function dayFR(value) {
  const label = new Date(String(value).slice(0, 10) + "T12:00:00").toLocaleDateString(
    "fr-FR",
    { weekday: "long", day: "numeric", month: "long" },
  );
  return label.charAt(0).toLocaleUpperCase("fr") + label.slice(1);
}
function clockFR(value) {
  const [hour, minute] = String(value).slice(0, 5).split(":");
  return `${Number(hour)}h${minute}`;
}
function roomLine(room) {
  const value = String(room || "").trim();
  if (!value) return "";
  return /salle/i.test(value) ? value : "Salle " + value;
}
function makeupText(student, group, body, settings) {
  return fillMessage(settings.makeup_message || defaultMakeup, {
    prenom: student.first_name,
    groupe: group.name,
    seance: dayFR(body.original_date),
    horaire: `${clockFR(body.start_time)}–${clockFR(body.end_time)}`,
    date: dayFR(body.makeup_date),
    debut: clockFR(body.makeup_start),
    fin: clockFR(body.makeup_end),
    salle: roomLine(group.room),
    centre: settings.name,
  });
}
app.get(
  "/api/makeups",
  wrap(async (_req, res) =>
    res.json(await query("SELECT * FROM session_makeups ORDER BY makeup_date, makeup_start")),
  ),
);
app.post(
  "/api/makeups",
  wrap(async (req, res) => {
    const b = z
      .object({
        group_id: id,
        original_date: date,
        start_time: time,
        end_time: time,
        makeup_date: date,
        makeup_start: time,
        makeup_end: time,
      })
      .refine((body) => body.makeup_end > body.makeup_start, {
        message: "La fin doit suivre le début.",
      })
      .refine(
        (body) =>
          body.makeup_date !== body.original_date ||
          body.makeup_start !== body.start_time ||
          body.makeup_end !== body.end_time,
        { message: "Choisissez une autre date pour le rattrapage." },
      )
      .parse(req.body);
    const group = requireRow(
      await query("SELECT * FROM study_groups WHERE id=?", [b.group_id]),
      "Groupe introuvable.",
    );
    if (!group.active) fail("Ce groupe est archivé.");
    const students = await query(
      `SELECT DISTINCT s.id, s.first_name, s.phone
       FROM students s
       JOIN enrollments e ON e.student_id = s.id
       WHERE e.group_id = ? AND e.start_date <= ? AND (e.end_date IS NULL OR e.end_date >= ?)
       ORDER BY s.first_name, s.id`,
      [b.group_id, b.original_date, b.original_date],
    );
    if (!students.length) fail("Aucun élève n’est inscrit à cette séance.");
    const [settings] = await query(
      "SELECT name, phone, makeup_message FROM settings WHERE id=1",
    );
    const { sendWhatsApp } = await import("./whatsapp.js");
    let sent = 0;
    const skipped = [];
    for (const student of students) {
      if (!String(student.phone || "").trim()) {
        skipped.push(student.first_name);
        continue;
      }
      try {
        await sendWhatsApp(
          settings.phone,
          student.phone,
          makeupText(student, group, b, settings),
        );
        sent += 1;
      } catch (error) {
        if (!sent && error.status) throw error;
        skipped.push(student.first_name);
      }
    }
    let teacherSent = false;
    if (group.teacher_id) {
      const [teacher] = await query(
        "SELECT first_name, phone FROM teachers WHERE id=?",
        [group.teacher_id],
      );
      if (teacher && String(teacher.phone || "").trim()) {
        try {
          await sendWhatsApp(
            settings.phone,
            teacher.phone,
            makeupText(teacher, group, b, settings),
          );
          teacherSent = true;
        } catch (error) {
          if (!sent && error.status) throw error;
          skipped.push(teacher.first_name);
        }
      } else if (teacher) skipped.push(teacher.first_name);
    }
    if (!sent && !teacherSent)
      fail(
        "Aucun message n’a été envoyé. Vérifiez les numéros et la connexion WhatsApp.",
      );
    await query(
      `INSERT INTO session_makeups(group_id, original_date, start_time, end_time, makeup_date, makeup_start, makeup_end)
       VALUES(?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE makeup_date=VALUES(makeup_date), makeup_start=VALUES(makeup_start), makeup_end=VALUES(makeup_end), end_time=VALUES(end_time)`,
      [
        b.group_id,
        b.original_date,
        b.start_time,
        b.end_time,
        b.makeup_date,
        b.makeup_start,
        b.makeup_end,
      ],
    );
    await audit(
      req,
      "session.makeup",
      `Rattrapage ${group.name}, ${b.original_date} → ${b.makeup_date}, ${sent} élève(s)${teacherSent ? " + formateur" : ""}`,
    );
    res.status(201).json({ sent, skipped, teacher: teacherSent });
  }),
);
app.get(
  "/api/sessions/:id/attendance",
  wrap(async (req, res) => {
    const se = requireRow(
      await query("SELECT * FROM sessions WHERE id=?", [
        id.parse(req.params.id),
      ]),
    );
    res.json(
      await query(
        `SELECT s.id,s.first_name,s.last_name,a.status,a.note FROM students s JOIN enrollments e ON e.student_id=s.id LEFT JOIN attendance a ON a.student_id=s.id AND a.session_id=? WHERE e.group_id=? AND e.start_date<=? AND (e.end_date IS NULL OR e.end_date>=?) GROUP BY s.id,s.first_name,s.last_name,a.status,a.note ORDER BY s.last_name`,
        [se.id, se.group_id, se.date, se.date],
      ),
    );
  }),
);
app.put(
  "/api/sessions/:id/attendance",
  wrap(async (req, res) => {
    const n = id.parse(req.params.id),
      b = z
        .object({
          entries: z
            .array(
              z.object({
                student_id: id,
                status: z.enum(["present", "absent", "late", "excused"]),
                note: z.string().max(255).default(""),
              }),
            )
            .max(1000),
        })
        .parse(req.body);
    if (new Set(b.entries.map((x) => x.student_id)).size !== b.entries.length)
      fail("Élève dupliqué.");
    await transaction(async (c) => {
      const se = requireRow(
        await run(c, "SELECT * FROM sessions WHERE id=? FOR UPDATE", [n]),
      );
      for (const e of b.entries) {
        if (
          !(
            await run(
              c,
              "SELECT id FROM enrollments WHERE student_id=? AND group_id=? AND start_date<=? AND (end_date IS NULL OR end_date>=?)",
              [e.student_id, se.group_id, se.date, se.date],
            )
          ).length
        )
          fail("Élève non inscrit à cette date.");
        await run(
          c,
          "INSERT INTO attendance(session_id,student_id,status,note) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status),note=VALUES(note)",
          [n, e.student_id, e.status, e.note],
        );
      }
      await audit(
        req,
        "attendance.saved",
        `Séance ${n}, ${b.entries.length} présences`,
        c,
      );
    });
    res.json({ ok: true });
  }),
);
const invoiceSQL = `SELECT i.*,e.student_id,e.group_id,CONCAT(s.first_name,' ',s.last_name) student_name,s.phone,g.name group_name,COALESCE(p.paid,0) paid,p.last_payment_id FROM invoices i JOIN enrollments e ON e.id=i.enrollment_id JOIN students s ON s.id=e.student_id JOIN study_groups g ON g.id=e.group_id LEFT JOIN (SELECT invoice_id,SUM(amount) paid,MAX(id) last_payment_id FROM payments GROUP BY invoice_id) p ON p.invoice_id=i.id`;
async function syncMonthInvoices(period) {
  const [settings] = await query("SELECT due_day FROM settings WHERE id=1");
  const start = period + "-01";
  await query(
    `INSERT IGNORE INTO billing_periods(group_id, period, due_date)
     SELECT DISTINCT e.group_id, ?, ?
     FROM enrollments e
     WHERE e.end_date IS NULL OR e.end_date >= ?`,
    [period, dueDate(period, settings.due_day), start],
  );
  await syncDeclaredInvoices();
}
app.get(
  "/api/invoices",
  wrap(async (req, res) => {
    const period = req.query.period ? month.parse(req.query.period) : null;
    if (period) await syncMonthInvoices(period);
    else await syncDeclaredInvoices();
    const rows = await query(
      invoiceSQL +
        (period ? " WHERE i.period=?" : "") +
        " ORDER BY i.due_date DESC,i.id DESC",
      period ? [period] : [],
    );
    const today = new Date().toISOString().slice(0, 10);
    res.json(
      rows.map((i) => ({
        ...i,
        balance: Math.round((i.amount - i.paid) * 100) / 100,
        status: invoiceState(i.amount, i.paid, i.due_date, today),
      })),
    );
  }),
);
async function studentRecord(n) {
  const student = requireRow(
    await query("SELECT * FROM students WHERE id=?", [n]),
    "Élève introuvable.",
  );
  const today = new Date().toISOString().slice(0, 10);
  const [enrollments, invoices, payments, attendance] = await Promise.all([
    query(
      `SELECT e.id,e.start_date,e.end_date,e.monthly_fee,g.name group_name,g.subject,g.teacher,g.schedule,g.room,g.active group_active FROM enrollments e JOIN study_groups g ON g.id=e.group_id WHERE e.student_id=? ORDER BY e.start_date DESC,e.id DESC`,
      [n],
    ),
    query(
      invoiceSQL +
        " WHERE e.student_id=? ORDER BY i.period DESC,i.due_date DESC,i.id DESC",
      [n],
    ),
    query(
      `SELECT p.id,p.invoice_id,p.amount,p.method,p.paid_on,p.note,i.period,g.name group_name,u.name recorded_by FROM payments p JOIN invoices i ON i.id=p.invoice_id JOIN enrollments e ON e.id=i.enrollment_id JOIN study_groups g ON g.id=e.group_id JOIN users u ON u.id=p.created_by WHERE e.student_id=? ORDER BY p.paid_on DESC,p.id DESC`,
      [n],
    ),
    query(
      `SELECT a.status,a.note,se.date,se.start_time,se.end_time,se.topic,g.name group_name FROM attendance a JOIN sessions se ON se.id=a.session_id JOIN study_groups g ON g.id=se.group_id WHERE a.student_id=? ORDER BY se.date DESC,se.start_time DESC`,
      [n],
    ),
  ]);
  return {
    student,
    enrollments,
    invoices: invoices.map((invoice) => ({
      ...invoice,
      balance: Math.round((invoice.amount - invoice.paid) * 100) / 100,
      status: invoiceState(
        invoice.amount,
        invoice.paid,
        invoice.due_date,
        today,
      ),
    })),
    payments,
    attendance,
  };
}
app.get(
  "/api/students/:id",
  wrap(async (req, res) => {
    res.json(await studentRecord(id.parse(req.params.id)));
  }),
);
app.post(
  "/api/students/:id/whatsapp",
  wrap(async (req, res) => {
    const file = await studentRecord(id.parse(req.params.id));
    const [settings] = await query(
      "SELECT name, phone, currency, due_day, welcome_message FROM settings WHERE id=1",
    );
    const { sendWhatsApp } = await import("./whatsapp.js");
    try {
      await sendWhatsApp(
        settings.phone,
        file.student.phone,
        welcomeText(file, settings),
      );
    } catch (error) {
      if (error.status) throw error;
      console.error("WhatsApp", error.message);
      throw Object.assign(
        new Error(
          "WhatsApp n’a pas pu envoyer le message. Vérifiez la connexion dans Paramètres.",
        ),
        { status: 502 },
      );
    }
    await audit(
      req,
      "student.whatsapp",
      `${file.student.first_name} ${file.student.last_name}`.slice(0, 500),
    );
    res.json({ ok: true });
  }),
);
app.post(
  "/api/invoices/generate",
  wrap(async (req, res) => {
    const b = z
      .object({
        period: month,
        group_id: id.optional(),
        due_date: date.optional(),
      })
      .parse(req.body);
    const created = await transaction(async (c) => {
      const groups = b.group_id
        ? [
            requireRow(
              await run(c, "SELECT id FROM study_groups WHERE id=? FOR UPDATE", [
                b.group_id,
              ]),
              "Groupe introuvable.",
            ),
          ]
        : await run(c, "SELECT id FROM study_groups FOR UPDATE");
      const [s] = await run(c, "SELECT due_day FROM settings WHERE id=1");
      const start = b.period + "-01",
        end = dueDate(b.period, 31),
        due = b.due_date || dueDate(b.period, s.due_day);
      for (const group of groups)
        await run(
          c,
          "INSERT IGNORE INTO billing_periods(group_id,period,due_date) VALUES(?,?,?)",
          [group.id, b.period, due],
        );
      /* Lock enrollments: generation and end-date changes cannot race. */ const es =
        await run(
          c,
          `SELECT e.* FROM enrollments e WHERE e.start_date<=? AND (e.end_date IS NULL OR e.end_date>=?)${b.group_id ? " AND e.group_id=?" : ""} FOR UPDATE`,
          b.group_id ? [end, start, b.group_id] : [end, start],
        );
      let count = 0;
      for (const e of es) {
        const r = await run(
          c,
          "INSERT IGNORE INTO invoices(enrollment_id,period,due_date,amount) VALUES(?,?,?,?)",
          [e.id, b.period, due, e.monthly_fee],
        );
        count += r.affectedRows;
      }
      await audit(
        req,
        "invoices.generated",
        `${b.period}${b.group_id ? " groupe " + b.group_id : ""}, échéance ${due}: ${count} mensualités`,
        c,
      );
      return count;
    });
    res.json({ created });
  }),
);
app.post(
  "/api/payments",
  wrap(async (req, res) => {
    const b = z
      .object({
        invoice_id: id,
        amount: money.refine((v) => v > 0),
        method: z.enum(["cash", "transfer", "card", "cheque"]),
        paid_on: date,
        note: z.string().max(255).default(""),
        request_key: z.uuid(),
      })
      .parse(req.body);
    const payment = await transaction(async (c) => {
      const i = requireRow(
        await run(c, "SELECT * FROM invoices WHERE id=? FOR UPDATE", [
          b.invoice_id,
        ]),
      );
      const [prior] = await run(
        c,
        "SELECT * FROM payments WHERE request_key=?",
        [b.request_key],
      );
      if (prior) {
        if (
          prior.invoice_id !== b.invoice_id ||
          Number(prior.amount) !== b.amount ||
          prior.method !== b.method ||
          prior.paid_on !== b.paid_on ||
          prior.note !== b.note
        )
          fail("Cette clé de paiement a déjà été utilisée.");
        return prior;
      }
      const [{ paid }] = await run(
        c,
        "SELECT COALESCE(SUM(amount),0) paid FROM payments WHERE invoice_id=?",
        [i.id],
      );
      if (!paymentAllowed(i.amount, paid, b.amount))
        fail("Montant supérieur au solde restant.");
      const r = await run(
        c,
        "INSERT INTO payments(invoice_id,amount,method,paid_on,note,request_key,created_by) VALUES(?,?,?,?,?,?,?)",
        [
          b.invoice_id,
          b.amount,
          b.method,
          b.paid_on,
          b.note,
          b.request_key,
          req.user.id,
        ],
      );
      await audit(
        req,
        "payment.created",
        `Paiement ${r.insertId} : ${b.amount}, mensualité ${i.id}`,
        c,
      );
      return { id: r.insertId };
    });
    res.status(201).json({ id: payment.id });
  }),
);
async function deliverWhatsApp(action) {
  try {
    await action();
  } catch (error) {
    if (error.status) throw error;
    console.error("WhatsApp", error.message);
    throw Object.assign(
      new Error(
        "WhatsApp n’a pas pu envoyer le message. Vérifiez la connexion dans Paramètres.",
      ),
      { status: 502 },
    );
  }
}
app.post(
  "/api/invoices/:id/remind",
  wrap(async (req, res) => {
    const invoice = requireRow(
      await query(invoiceSQL + " WHERE i.id=?", [id.parse(req.params.id)]),
      "Mensualité introuvable.",
    );
    const today = new Date().toISOString().slice(0, 10);
    if (
      invoiceState(invoice.amount, invoice.paid, String(invoice.due_date), today) !==
      "overdue"
    )
      fail("Cette mensualité n’est pas en retard.");
    const [settings] = await query(
      "SELECT name, phone, currency, reminder_message FROM settings WHERE id=1",
    );
    const { sendWhatsApp } = await import("./whatsapp.js");
    await deliverWhatsApp(() =>
      sendWhatsApp(settings.phone, invoice.phone, reminderText(invoice, settings)),
    );
    await audit(
      req,
      "invoice.remind",
      `${invoice.student_name} · ${invoice.group_name} · ${invoice.period}`.slice(0, 500),
    );
    res.json({ ok: true });
  }),
);
app.post(
  "/api/payments/:id/whatsapp",
  wrap(async (req, res) => {
    const payment = requireRow(
      await query(
        `SELECT p.*,i.period,i.amount invoice_amount,CONCAT(s.first_name,' ',s.last_name) student_name,s.phone,g.name group_name,u.name recorded_by FROM payments p JOIN invoices i ON i.id=p.invoice_id JOIN enrollments e ON e.id=i.enrollment_id JOIN students s ON s.id=e.student_id JOIN study_groups g ON g.id=e.group_id JOIN users u ON u.id=p.created_by WHERE p.id=?`,
        [id.parse(req.params.id)],
      ),
      "Paiement introuvable.",
    );
    const [{ paid }] = await query(
      "SELECT COALESCE(SUM(amount),0) paid FROM payments WHERE invoice_id=?",
      [payment.invoice_id],
    );
    if (invoiceState(payment.invoice_amount, paid, "2099-01-01", "2000-01-01") !== "paid")
      fail("Cette mensualité n’est pas entièrement réglée.");
    const [settings] = await query(
      "SELECT name, phone, address, currency, color, color_dark, receipt_message FROM settings WHERE id=1",
    );
    const pdf = await receiptPdf(payment, paid, settings);
    const { sendWhatsAppFile } = await import("./whatsapp.js");
    await deliverWhatsApp(() =>
      sendWhatsAppFile(settings.phone, payment.phone, settledText(payment, settings), {
        buffer: pdf,
        name: "recu-" + receiptNumber(payment.id) + ".pdf",
      }),
    );
    await audit(
      req,
      "payment.whatsapp",
      `${receiptNumber(payment.id)} · ${payment.student_name}`.slice(0, 500),
    );
    res.json({ ok: true });
  }),
);
app.get(
  "/api/payments",
  wrap(async (req, res) =>
    res.json(
      await query(
        `SELECT p.*,i.period,CONCAT(s.first_name,' ',s.last_name) student_name,g.name group_name,u.name recorded_by FROM payments p JOIN invoices i ON i.id=p.invoice_id JOIN enrollments e ON e.id=i.enrollment_id JOIN students s ON s.id=e.student_id JOIN study_groups g ON g.id=e.group_id JOIN users u ON u.id=p.created_by ORDER BY p.id DESC`,
      ),
    ),
  ),
);
app.get(
  "/api/payments/:id/receipt",
  wrap(async (req, res) => {
    const payment = requireRow(
      await query(
        `SELECT p.*,i.period,i.amount invoice_amount,CONCAT(s.first_name,' ',s.last_name) student_name,s.phone,g.name group_name,u.name recorded_by FROM payments p JOIN invoices i ON i.id=p.invoice_id JOIN enrollments e ON e.id=i.enrollment_id JOIN students s ON s.id=e.student_id JOIN study_groups g ON g.id=e.group_id JOIN users u ON u.id=p.created_by WHERE p.id=?`,
        [id.parse(req.params.id)],
      ),
    );
    const [{ paid }] = await query(
      "SELECT SUM(amount) paid FROM payments WHERE invoice_id=? AND id<=?",
      [payment.invoice_id, payment.id],
    );
    res.json({
      payment,
      paid,
      settings: (await query("SELECT * FROM settings WHERE id=1"))[0],
    });
  }),
);
app.get(
  "/api/dashboard",
  wrap(async (req, res) => {
    const period = month.parse(
      req.query.period || new Date().toISOString().slice(0, 7),
    );
    await syncMonthInvoices(period);
    const today = new Date().toISOString().slice(0, 10);
    const [students, groups, invoices, payments, attendance, recent, upcoming] =
      await Promise.all([
        query("SELECT COUNT(*) n FROM students WHERE active=1"),
        query("SELECT COUNT(*) n FROM study_groups WHERE active=1"),
        query(invoiceSQL + " WHERE i.period=?", [period]),
        query(
          "SELECT COALESCE(SUM(amount),0) total FROM payments WHERE paid_on>=? AND paid_on<=?",
          [period + "-01", dueDate(period, 31)],
        ),
        query(
          `SELECT a.status,COUNT(*) n FROM attendance a JOIN sessions se ON se.id=a.session_id WHERE se.date>=? AND se.date<=? GROUP BY a.status`,
          [period + "-01", dueDate(period, 31)],
        ),
        query(
          `SELECT p.id,p.amount,p.paid_on,CONCAT(s.first_name,' ',s.last_name) student_name FROM payments p JOIN invoices i ON i.id=p.invoice_id JOIN enrollments e ON e.id=i.enrollment_id JOIN students s ON s.id=e.student_id ORDER BY p.id DESC LIMIT 6`,
        ),
        query(
          "SELECT se.*,g.name group_name FROM sessions se JOIN study_groups g ON g.id=se.group_id WHERE se.date>=CURDATE() ORDER BY se.date,se.start_time LIMIT 5",
        ),
      ]);
    const statusOf = (invoice) =>
      invoiceState(
        invoice.amount,
        invoice.paid,
        String(invoice.due_date).slice(0, 10),
        today,
      );
    res.json({
      students: students[0].n,
      groups: groups[0].n,
      billed: invoices.reduce((a, x) => a + Number(x.amount || 0), 0),
      invoicePaid: invoices.reduce((a, x) => a + Number(x.paid || 0), 0),
      outstanding: invoices.reduce((a, x) => a + Number(x.amount || 0) - Number(x.paid || 0), 0),
      late: invoices.filter((invoice) => statusOf(invoice) === "overdue").length,
      coming: invoices.filter((invoice) => {
        const status = statusOf(invoice);
        return status === "pending" || status === "partial";
      }).length,
      settled: invoices.filter((invoice) => statusOf(invoice) === "paid").length,
      collected: payments[0].total,
      attendance,
      recent,
      upcoming,
    });
  }),
);
app.get(
  "/api/users",
  admin,
  wrap(async (req, res) =>
    res.json(
      await query(
        "SELECT id,name,email,role,active FROM users WHERE role<>'superadmin' ORDER BY id",
      ),
    ),
  ),
);
app.post(
  "/api/users",
  admin,
  wrap(async (req, res) => {
    const b = z
      .object({
        name: z.string().trim().min(1).max(120),
        email: z.email().max(190),
        password: z.string().min(12).max(128),
        role: z.enum(["admin", "staff"]),
      })
      .parse(req.body);
    const r = await query(
      "INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)",
      [b.name, b.email, await bcrypt.hash(b.password, 12), b.role],
    );
    res.status(201).json({ id: r.insertId });
  }),
);
app.patch(
  "/api/users/:id",
  admin,
  wrap(async (req, res) => {
    const n = id.parse(req.params.id),
      b = z.object({ active: z.boolean() }).parse(req.body);
    if (n === req.user.id)
      fail("Vous ne pouvez pas désactiver votre propre compte.");
    const target = requireRow(
      await query("SELECT id, role FROM users WHERE id=?", [n]),
    );
    if (target.role === "superadmin")
      fail("Ce compte ne peut pas être modifié ici.");
    await query(
      "UPDATE users SET active=?,token_version=token_version+1 WHERE id=?",
      [b.active, n],
    );
    res.json({ ok: true });
  }),
);
app.get(
  "/api/audit",
  admin,
  wrap(async (req, res) =>
    res.json(
      await query(
        "SELECT a.*,u.name user_name,u.role user_role FROM audit_log a JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 500",
      ),
    ),
  ),
);
app.use("/api", (req, res) =>
  res.status(404).json({ error: "Route introuvable." }),
);
const dist = fileURLToPath(new URL("../../client/dist", import.meta.url));
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get("/{*path}", (req, res) => res.sendFile(dist + "/index.html"));
}
app.use((err, req, res, next) => {
  if (err instanceof z.ZodError)
    return res
      .status(400)
      .json({
        error: err.issues
          .map((x) => `${x.path.join(".") || "Formulaire"} : ${x.message}`)
          .join(" · "),
      });
  if (err.code === "ER_DUP_ENTRY")
    return res.status(409).json({ error: "Cet enregistrement existe déjà." });
  if (err.type === "entity.parse.failed")
    return res.status(400).json({ error: "JSON invalide." });
  if (err.type === "entity.too.large")
    return res.status(413).json({ error: "Requête trop volumineuse." });
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res
    .status(500)
    .json({
      error: "Erreur serveur. Vérifiez la connexion à la base de données.",
    });
});
