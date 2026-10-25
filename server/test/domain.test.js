import test from "node:test";
import assert from "node:assert/strict";
import {
  paymentAllowed,
  dueDate,
  invoiceState,
  date,
  month,
  money,
  studentSchema,
} from "../src/domain.js";
test("partial payments and exact decimal boundaries", () => {
  assert.equal(paymentAllowed(350, 100, 250), true);
  assert.equal(paymentAllowed(350, 100, 250.01), false);
  assert.equal(paymentAllowed(0.3, 0.1, 0.2), true);
  assert.equal(paymentAllowed(350, 350, 0.01), false);
  assert.equal(paymentAllowed(350, 0, 0), false);
  assert.equal(paymentAllowed(350, 0, -1), false);
});
test("due dates clamp to the last day including leap years", () => {
  assert.equal(dueDate("2028-02", 31), "2028-02-29");
  assert.equal(dueDate("2027-02", 31), "2027-02-28");
  assert.equal(dueDate("2026-04", 31), "2026-04-30");
});
test("invoice states prioritise paid, then overdue", () => {
  assert.equal(invoiceState(350, 350, "2026-01-10", "2026-02-01"), "paid");
  assert.equal(invoiceState(350, 100, "2026-01-10", "2026-02-01"), "overdue");
  assert.equal(invoiceState(350, 100, "2026-02-10", "2026-02-01"), "partial");
  assert.equal(invoiceState(350, 0, "2026-02-10", "2026-02-01"), "pending");
  assert.equal(invoiceState(0, 0, "2026-01-10", "2026-02-01"), "paid");
});
test("invalid calendar dates and monetary precision are rejected", () => {
  assert.equal(date.safeParse("2026-02-30").success, false);
  assert.equal(date.safeParse("2028-02-29").success, true);
  assert.equal(month.safeParse("2026-13").success, false);
  assert.equal(money.safeParse(1.111).success, false);
  assert.equal(money.safeParse(-1).success, false);
  assert.equal(
    studentSchema.safeParse({ first_name: " ", last_name: "Test" }).success,
    false,
  );
});
