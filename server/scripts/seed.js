import { pool, query, transaction, run } from "../src/db.js";
import { dueDate } from "../src/domain.js";
try {
  const [{ n }] = await query("SELECT COUNT(*) n FROM students");
  if (n)
    throw new Error(
      "Données déjà présentes. La démo ne peut être chargée que dans une base sans élèves.",
    );
  const [admin] = await query(
    "SELECT id FROM users WHERE role='admin' LIMIT 1",
  );
  if (!admin) throw new Error("Exécutez npm run db:init avant la démo.");
  const now = new Date(),
    period = now.toISOString().slice(0, 7),
    day = now.toISOString().slice(0, 10);
  await transaction(async (c) => {
    await run(
      c,
      "UPDATE settings SET name='Centre Horizon',address='Casablanca · Maroc',phone='+212 522 00 00 00' WHERE id=1",
    );
    const people = [
      ["Salma", "Bennani", "0600000001", "2e Bac Sciences"],
      ["Adam", "El Amrani", "0600000002", "Tronc commun"],
      ["Lina", "Alaoui", "0600000003", "2e Bac Sciences"],
      ["Yassine", "Idrissi", "0600000004", "1re Bac"],
      ["Inès", "Tahiri", "0600000005", "B1 Anglais"],
      ["Omar", "Mansouri", "0600000006", "B1 Anglais"],
      ["Aya", "Fassi", "0600000007", "2e Bac Sciences"],
      ["Mehdi", "Berrada", "0600000008", "1re Bac"],
    ];
    const ids = [];
    for (const p of people) {
      const r = await run(
        c,
        "INSERT INTO students(first_name,last_name,phone,level,notes) VALUES(?,?,?,?,'Données de démonstration fictives')",
        p,
      );
      ids.push(r.insertId);
    }
    const teacherIds = new Map();
    const teacherFor = async (fullName) => {
      if (teacherIds.has(fullName)) return teacherIds.get(fullName);
      const parts = fullName.split(/\s+/);
      const created = await run(
        c,
        "INSERT INTO teachers(first_name,last_name,phone,email,specialty,notes,active) VALUES(?,?,?,?,?,?,1)",
        [parts[0], parts.slice(1).join(" "), "", "", "", ""],
      );
      teacherIds.set(fullName, created.insertId);
      return created.insertId;
    };
    const groups = [];
    for (const g of [
      [
        "Mathématiques · Bac",
        "Mathématiques",
        "Nadia Amrani",
        "Lun & Mer · 18h–19h30",
        "Salle 01",
        350,
        20,
      ],
      [
        "Anglais · Communication",
        "Anglais",
        "Samir Khalil",
        "Mar & Jeu · 19h–20h30",
        "Salle 02",
        450,
        15,
      ],
      [
        "Physique · 1re Bac",
        "Physique",
        "Amine Tazi",
        "Sam · 10h–12h",
        "Salle 03",
        300,
        18,
      ],
    ]) {
      const teacherId = await teacherFor(g[2]);
      const r = await run(
        c,
        "INSERT INTO study_groups(name,subject,teacher,teacher_id,schedule,room,monthly_fee,capacity) VALUES(?,?,?,?,?,?,?,?)",
        [g[0], g[1], g[2], teacherId, g[3], g[4], g[5], g[6]],
      );
      groups.push(r.insertId);
    }
    for (let k = 0; k < ids.length; k++) {
      const gi = k % 3,
        fee = [350, 450, 300][gi];
      const e = await run(
        c,
        "INSERT INTO enrollments(student_id,group_id,start_date,monthly_fee) VALUES(?,?,?,?)",
        [ids[k], groups[gi], period + "-01", fee],
      );
      const i = await run(
        c,
        "INSERT INTO invoices(enrollment_id,period,due_date,amount) VALUES(?,?,?,?)",
        [e.insertId, period, dueDate(period, 10), fee],
      );
      if (k < 4)
        await run(
          c,
          "INSERT INTO payments(invoice_id,amount,method,paid_on,note,created_by,request_key) VALUES(?,?,'cash',?,'Paiement fictif',?,UUID())",
          [i.insertId, k === 3 ? 150 : fee, day, admin.id],
        );
    }
    for (let gi = 0; gi < 3; gi++) {
      const past = new Date(now);
      past.setUTCDate(now.getUTCDate() - 1);
      const se = await run(
        c,
        "INSERT INTO sessions(group_id,date,start_time,end_time,topic) VALUES(?,?,'18:00','19:30','Séance de démonstration')",
        [groups[gi], past.toISOString().slice(0, 10)],
      );
      if (past.toISOString().slice(0, 10) >= period + "-01")
        for (let k = gi; k < ids.length; k += 3)
          await run(
            c,
            "INSERT INTO attendance(session_id,student_id,status,note) VALUES(?,?,?,?)",
            [se.insertId, ids[k], k === 6 ? "absent" : "present", ""],
          );
      const next = new Date(now);
      next.setUTCDate(now.getUTCDate() + gi + 1);
      await run(
        c,
        "INSERT INTO sessions(group_id,date,start_time,end_time,topic) VALUES(?,?,'18:00','19:30','Révisions et exercices')",
        [groups[gi], next.toISOString().slice(0, 10)],
      );
    }
  });
  console.log(
    "Démo fictive chargée : 8 élèves, 3 groupes, mensualités, paiements et séances.",
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
