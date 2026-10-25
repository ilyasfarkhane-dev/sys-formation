import { query } from "./db.js";
import bcrypt from "bcryptjs";
import { defaultWelcome } from "./welcome.js";
import { defaultMakeup, defaultReceipt, defaultReminder } from "./messages.js";

export async function ensureTeachers() {
  await query(
    `CREATE TABLE IF NOT EXISTS teachers (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(80) NOT NULL,
      last_name VARCHAR(80) NOT NULL DEFAULT '',
      phone VARCHAR(30) NOT NULL DEFAULT '',
      email VARCHAR(190) NOT NULL DEFAULT '',
      specialty VARCHAR(100) NOT NULL DEFAULT '',
      notes TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`,
  );
  const columns = await query("SHOW COLUMNS FROM study_groups LIKE 'teacher_id'");
  if (!columns.length)
    await query("ALTER TABLE study_groups ADD COLUMN teacher_id INT UNSIGNED NULL");
  const links = await query(
    `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'study_groups'
       AND COLUMN_NAME = 'teacher_id' AND REFERENCED_TABLE_NAME = 'teachers'`,
  );
  if (!links.length)
    await query(
      "ALTER TABLE study_groups ADD CONSTRAINT fk_group_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id)",
    );
  const names = await query(
    "SELECT DISTINCT TRIM(teacher) AS name FROM study_groups WHERE teacher_id IS NULL AND TRIM(teacher) <> ''",
  );
  for (const row of names) {
    const parts = String(row.name).split(/\s+/);
    const first = parts[0].slice(0, 80);
    const last = parts.slice(1).join(" ").slice(0, 80);
    const existing = await query(
      "SELECT id FROM teachers WHERE first_name=? AND last_name=?",
      [first, last],
    );
    let teacherId = existing[0]?.id;
    if (!teacherId) {
      const inserted = await query(
        "INSERT INTO teachers(first_name,last_name,phone,email,specialty,notes,active) VALUES(?,?,?,?,?,?,1)",
        [first, last, "", "", "", ""],
      );
      teacherId = inserted.insertId;
    }
    await query(
      "UPDATE study_groups SET teacher_id=? WHERE teacher_id IS NULL AND TRIM(teacher)=?",
      [teacherId, row.name],
    );
  }
  await query(
    `CREATE TABLE IF NOT EXISTS specialties (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE
    ) ENGINE=InnoDB`,
  );
  const specialtyColumn = await query(
    "SHOW COLUMNS FROM teachers LIKE 'specialty_id'",
  );
  if (!specialtyColumn.length)
    await query("ALTER TABLE teachers ADD COLUMN specialty_id INT UNSIGNED NULL");
  const specialtyLinks = await query(
    `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'teachers'
       AND COLUMN_NAME = 'specialty_id' AND REFERENCED_TABLE_NAME = 'specialties'`,
  );
  if (!specialtyLinks.length)
    await query(
      "ALTER TABLE teachers ADD CONSTRAINT fk_teacher_specialty FOREIGN KEY (specialty_id) REFERENCES specialties(id)",
    );
  const specialties = await query(
    "SELECT DISTINCT TRIM(specialty) AS name FROM teachers WHERE specialty_id IS NULL AND TRIM(specialty) <> ''",
  );
  for (const row of specialties) {
    const name = String(row.name).slice(0, 100);
    const existing = await query("SELECT id FROM specialties WHERE name=?", [name]);
    let specialtyId = existing[0]?.id;
    if (!specialtyId) {
      const inserted = await query("INSERT INTO specialties(name) VALUES(?)", [name]);
      specialtyId = inserted.insertId;
    }
    await query(
      "UPDATE teachers SET specialty_id=? WHERE specialty_id IS NULL AND TRIM(specialty)=?",
      [specialtyId, row.name],
    );
  }
  await ensureSchoolLevels();
  const dueDay = await query("SHOW COLUMNS FROM students LIKE 'due_day'");
  if (!dueDay.length)
    await query("ALTER TABLE students ADD COLUMN due_day TINYINT UNSIGNED NULL");
  const welcome = await query(
    "SHOW COLUMNS FROM settings LIKE 'welcome_message'",
  );
  if (!welcome.length)
    await query("ALTER TABLE settings ADD COLUMN welcome_message TEXT NULL");
  await query(
    "UPDATE settings SET welcome_message=? WHERE id=1 AND (welcome_message IS NULL OR welcome_message='')",
    [defaultWelcome],
  );
  await ensureBrand();
  await ensureMakeups();
  await ensureBillingPeriods();
}

async function ensureColumn(table, column, statement) {
  const rows = await query("SHOW COLUMNS FROM " + table + " LIKE '" + column + "'");
  if (!rows.length) await query(statement);
}
async function ensureBrand() {
  await query(
    "ALTER TABLE users MODIFY role ENUM('admin','staff','superadmin') NOT NULL DEFAULT 'staff'",
  );
  await ensureColumn(
    "settings",
    "reminder_message",
    "ALTER TABLE settings ADD COLUMN reminder_message TEXT NULL",
  );
  await ensureColumn(
    "settings",
    "receipt_message",
    "ALTER TABLE settings ADD COLUMN receipt_message TEXT NULL",
  );
  await ensureColumn(
    "settings",
    "makeup_message",
    "ALTER TABLE settings ADD COLUMN makeup_message TEXT NULL",
  );
  await ensureColumn(
    "settings",
    "color",
    "ALTER TABLE settings ADD COLUMN color CHAR(7) NOT NULL DEFAULT '#176658'",
  );
  await ensureColumn(
    "settings",
    "color_dark",
    "ALTER TABLE settings ADD COLUMN color_dark CHAR(7) NOT NULL DEFAULT '#123b3a'",
  );
  await ensureColumn(
    "settings",
    "logo",
    "ALTER TABLE settings ADD COLUMN logo MEDIUMTEXT NULL",
  );
  await query(
    "UPDATE settings SET reminder_message=? WHERE id=1 AND (reminder_message IS NULL OR reminder_message='')",
    [defaultReminder],
  );
  await query(
    "UPDATE settings SET receipt_message=? WHERE id=1 AND (receipt_message IS NULL OR receipt_message='')",
    [defaultReceipt],
  );
  await query(
    "UPDATE settings SET makeup_message=? WHERE id=1 AND (makeup_message IS NULL OR makeup_message='')",
    [defaultMakeup],
  );
  await query(
    "UPDATE settings SET color='#176658' WHERE id=1 AND (color IS NULL OR color='')",
  );
  await query(
    "UPDATE settings SET color_dark='#123b3a' WHERE id=1 AND (color_dark IS NULL OR color_dark='')",
  );
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  if (!email || !password || password.length < 12) return;
  const existing = await query("SELECT id FROM users WHERE email=?", [email]);
  if (existing.length) return;
  await query(
    "INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)",
    [
      process.env.SUPERADMIN_NAME || "Super administrateur",
      email,
      await bcrypt.hash(password, 12),
      "superadmin",
    ],
  );
}

export async function ensureMakeups() {
  await query(
    `CREATE TABLE IF NOT EXISTS session_makeups (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      group_id INT UNSIGNED NOT NULL,
      original_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      makeup_date DATE NOT NULL,
      makeup_start TIME NOT NULL,
      makeup_end TIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY one_occurrence (group_id, original_date, start_time),
      FOREIGN KEY (group_id) REFERENCES study_groups(id)
    ) ENGINE=InnoDB`,
  );
}

export async function ensureBillingPeriods() {
  await query(
    `CREATE TABLE IF NOT EXISTS billing_periods (
      group_id INT UNSIGNED NOT NULL,
      period CHAR(7) NOT NULL,
      due_date DATE NOT NULL,
      PRIMARY KEY (group_id, period),
      FOREIGN KEY (group_id) REFERENCES study_groups(id)
    ) ENGINE=InnoDB`,
  );
  await query(
    `INSERT IGNORE INTO billing_periods(group_id, period, due_date)
     SELECT e.group_id, i.period, MAX(i.due_date)
     FROM invoices i
     JOIN enrollments e ON e.id = i.enrollment_id
     GROUP BY e.group_id, i.period`,
  );
  await syncDeclaredInvoices();
}

export async function syncDeclaredInvoices() {
  await query(
    `INSERT IGNORE INTO invoices(enrollment_id, period, due_date, amount)
     SELECT e.id, b.period,
       IF(s.due_day IS NULL, b.due_date,
         STR_TO_DATE(CONCAT(b.period, '-', LPAD(LEAST(s.due_day, DAY(LAST_DAY(CONCAT(b.period, '-01')))), 2, '0')), '%Y-%m-%d')),
       e.monthly_fee
     FROM billing_periods b
     JOIN enrollments e ON e.group_id = b.group_id
     JOIN students s ON s.id = e.student_id
     WHERE e.end_date IS NULL OR e.end_date >= CONCAT(b.period, '-01')`,
  );
}

async function linkLevel(name) {
  const label = String(name).slice(0, 100);
  const existing = await query("SELECT id FROM school_levels WHERE name=?", [label]);
  if (existing[0]?.id) return existing[0].id;
  const inserted = await query("INSERT INTO school_levels(name) VALUES(?)", [label]);
  return inserted.insertId;
}

export async function ensureSchoolLevels() {
  await query(
    `CREATE TABLE IF NOT EXISTS school_levels (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE
    ) ENGINE=InnoDB`,
  );
  const studentColumn = await query("SHOW COLUMNS FROM students LIKE 'level_id'");
  if (!studentColumn.length)
    await query("ALTER TABLE students ADD COLUMN level_id INT UNSIGNED NULL");
  const studentLinks = await query(
    `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'students'
       AND COLUMN_NAME = 'level_id' AND REFERENCED_TABLE_NAME = 'school_levels'`,
  );
  if (!studentLinks.length)
    await query(
      "ALTER TABLE students ADD CONSTRAINT fk_student_level FOREIGN KEY (level_id) REFERENCES school_levels(id)",
    );
  const groupColumn = await query("SHOW COLUMNS FROM study_groups LIKE 'level'");
  if (!groupColumn.length)
    await query("ALTER TABLE study_groups ADD COLUMN level VARCHAR(100) NOT NULL DEFAULT ''");
  const groupIdColumn = await query("SHOW COLUMNS FROM study_groups LIKE 'level_id'");
  if (!groupIdColumn.length)
    await query("ALTER TABLE study_groups ADD COLUMN level_id INT UNSIGNED NULL");
  const groupLinks = await query(
    `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'study_groups'
       AND COLUMN_NAME = 'level_id' AND REFERENCED_TABLE_NAME = 'school_levels'`,
  );
  if (!groupLinks.length)
    await query(
      "ALTER TABLE study_groups ADD CONSTRAINT fk_group_level FOREIGN KEY (level_id) REFERENCES school_levels(id)",
    );
  const names = await query(
    `SELECT name FROM (
       SELECT DISTINCT TRIM(level) AS name FROM students WHERE level_id IS NULL AND TRIM(level) <> ''
       UNION
       SELECT DISTINCT TRIM(level) AS name FROM study_groups WHERE level_id IS NULL AND TRIM(level) <> ''
     ) levels`,
  );
  for (const row of names) {
    const levelId = await linkLevel(row.name);
    await query(
      "UPDATE students SET level_id=? WHERE level_id IS NULL AND TRIM(level)=?",
      [levelId, row.name],
    );
    await query(
      "UPDATE study_groups SET level_id=? WHERE level_id IS NULL AND TRIM(level)=?",
      [levelId, row.name],
    );
  }
}
