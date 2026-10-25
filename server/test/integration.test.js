import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
// Opt-in: use a disposable database. Never point this at production.
const enabled = process.env.INTEGRATION_TEST === "1";
test("end-to-end MySQL business workflows", { skip: !enabled }, async (t) => {
  const { app } = await import("../src/app.js");
  const { pool, query } = await import("../src/db.js");
  const { checkSecret } = await import("../src/auth.js");
  checkSecret();
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = "http://127.0.0.1:" + server.address().port;
  let cookie = "";
  const req = async (path, method = "GET", body, customCookie = cookie) => {
    const r = await fetch(base + "/api" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        Origin: process.env.APP_ORIGIN,
        Cookie: customCookie,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: r.status,
      body: await r.json(),
      cookie: r.headers.get("set-cookie"),
    };
  };
  try {
    assert.equal((await req("/students")).status, 401);
    let r = await req("/auth/login", "POST", {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    });
    assert.equal(r.status, 200);
    cookie = r.cookie.split(";")[0];
    const student = async (name) =>
      (
        await req("/students", "POST", {
          first_name: name,
          last_name: "Test",
          notes: "Integration test",
        })
      ).body.id;
    const s1 = await student("One"),
      s2 = await student("Two");
    assert.ok(s1 && s2);
    const g = (
      await req("/groups", "POST", {
        name: "Test " + randomUUID(),
        subject: "Maths",
        monthly_fee: 350,
        capacity: 2,
      })
    ).body.id;
    r = await req("/enrollments", "POST", {
      student_id: s1,
      group_id: g,
      start_date: "2026-10-01",
      monthly_fee: 350,
    });
    assert.equal(r.status, 201);
    const enrollmentId = r.body.id;
    assert.equal(
      (
        await req("/enrollments", "POST", {
          student_id: s1,
          group_id: g,
          start_date: "2026-10-02",
          monthly_fee: 350,
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await req("/enrollments", "POST", {
          student_id: s2,
          group_id: g,
          start_date: "2026-10-01",
          monthly_fee: 350,
        })
      ).status,
      201,
    );
    const s3 = await student("Three");
    assert.equal(
      (
        await req("/enrollments", "POST", {
          student_id: s3,
          group_id: g,
          start_date: "2026-10-01",
          monthly_fee: 350,
        })
      ).status,
      409,
    );
    r = await req("/invoices/generate", "POST", { period: "2026-10" });
    assert.equal(r.status, 200);
    assert.ok(r.body.created >= 2);
    assert.equal(
      (await req("/invoices/generate", "POST", { period: "2026-10" })).body
        .created,
      0,
    );
    const invoices = (await req("/invoices?period=2026-10")).body;
    const inv = invoices.find((i) => i.student_id === s1 && i.group_id === g);
    assert.equal(inv.balance, 350);
    const payment = {
      invoice_id: inv.id,
      amount: 100,
      method: "cash",
      paid_on: "2026-10-15",
      note: "test",
      request_key: randomUUID(),
    };
    r = await req("/payments", "POST", payment);
    assert.equal(r.status, 201);
    const paymentId = r.body.id;
    assert.equal((await req("/payments", "POST", payment)).body.id, paymentId);
    assert.equal(
      (await req("/payments", "POST", { ...payment, amount: 101 })).status,
      409,
    );
    assert.equal(
      (
        await req("/payments", "POST", {
          ...payment,
          amount: 251,
          request_key: randomUUID(),
        })
      ).status,
      409,
    );
    const parallel = await Promise.all([
      req("/payments", "POST", {
        ...payment,
        amount: 200,
        request_key: randomUUID(),
      }),
      req("/payments", "POST", {
        ...payment,
        amount: 200,
        request_key: randomUUID(),
      }),
    ]);
    assert.deepEqual(parallel.map((x) => x.status).sort(), [201, 409]);
    assert.equal(
      (await req("/invoices?period=2026-10")).body.find((i) => i.id === inv.id)
        .balance,
      50,
    );
    const receipt = (await req("/payments/" + paymentId + "/receipt")).body;
    assert.equal(receipt.payment.amount, 100);
    assert.equal(receipt.paid, 100);
    assert.equal(
      (
        await req("/payments", "POST", {
          ...payment,
          amount: 50,
          request_key: randomUUID(),
        })
      ).status,
      201,
    );
    assert.equal(
      (await req("/invoices?period=2026-10")).body.find((i) => i.id === inv.id)
        .status,
      "paid",
    );
    const se = (
      await req("/sessions", "POST", {
        group_id: g,
        date: "2026-10-15",
        start_time: "18:00",
        end_time: "19:30",
        topic: "Test",
      })
    ).body.id;
    assert.equal((await req("/sessions/" + se + "/attendance")).body.length, 2);
    assert.equal(
      (
        await req("/sessions/" + se + "/attendance", "PUT", {
          entries: [
            { student_id: s1, status: "present" },
            { student_id: s2, status: "absent", note: "Justifié" },
          ],
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await req("/sessions/" + se + "/attendance", "PUT", {
          entries: [{ student_id: s3, status: "present" }],
        })
      ).status,
      409,
    );
    assert.equal(
      (await req("/sessions/" + se + "/attendance")).body.find(
        (x) => x.id === s2,
      ).status,
      "absent",
    );
    assert.equal(
      (
        await req("/enrollments/" + enrollmentId + "/end", "PATCH", {
          end_date: "2026-10-31",
        })
      ).status,
      200,
    );
    await req("/invoices/generate", "POST", { period: "2026-11" });
    assert.equal(
      (await req("/invoices?period=2026-11")).body.some(
        (i) => i.enrollment_id === enrollmentId,
      ),
      false,
    );
    const staffEmail = randomUUID() + "@example.com";
    r = await req("/users", "POST", {
      name: "Test Staff",
      email: staffEmail,
      password: "Integration-Staff-2026",
      role: "staff",
    });
    assert.equal(r.status, 201);
    const staffId = r.body.id;
    r = await req("/auth/login", "POST", {
      email: staffEmail,
      password: "Integration-Staff-2026",
    });
    const staffCookie = r.cookie.split(";")[0];
    assert.equal(
      (await req("/users", "GET", undefined, staffCookie)).status,
      403,
    );
    assert.equal(
      (await req("/students", "GET", undefined, staffCookie)).status,
      200,
    );
    await req("/users/" + staffId, "PATCH", { active: false });
    assert.equal(
      (await req("/students", "GET", undefined, staffCookie)).status,
      401,
    );
    const foreign = await fetch(base + "/api/students", {
      method: "POST",
      headers: {
        Origin: "https://foreign.invalid",
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: "{}",
    });
    assert.equal(foreign.status, 403);
    assert.equal((await req("/dashboard?period=2026-10")).status, 200);
    assert.ok(
      (await req("/audit")).body.some((a) => a.action === "payment.created"),
    );
    await req("/auth/logout", "POST");
    assert.equal((await req("/auth/me")).status, 401);
  } finally {
    await new Promise((r) => server.close(r));
    await pool.end();
  }
});
