import { z } from "zod";
export const id = z.coerce.number().int().positive();
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + "T00:00:00Z");
    return !isNaN(d) && d.toISOString().slice(0, 10) === v;
  }, "Date invalide");
export const month = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
  .refine(
    (v) => Number(v.slice(0, 4)) >= 2000 && Number(v.slice(0, 4)) <= 2100,
  );
export const money = z.coerce
  .number()
  .finite()
  .min(0)
  .max(1000000)
  .refine(
    (v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.000001,
    "Deux décimales maximum",
  );
export function amountCents(value) {
  return Math.round(value * 100);
}
export function paymentAllowed(total, paid, amount) {
  return (
    amountCents(amount) > 0 &&
    amountCents(amount) <= amountCents(total) - amountCents(paid)
  );
}
export function invoiceState(total, paid, due, today) {
  if (amountCents(paid) >= amountCents(total)) return "paid";
  if (due < today) return "overdue";
  if (paid > 0) return "partial";
  return "pending";
}
export function dueDate(period, day) {
  const [y, m] = period.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${period}-${String(Math.min(day, last)).padStart(2, "0")}`;
}
export const levelSchema = z.object({
  name: z.string().trim().min(1).max(100),
});
const optionalId = z
  .union([
    z.literal("").transform(() => null),
    z.null(),
    z.coerce.number().int().positive(),
  ])
  .optional();
export const studentSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(30).default(""),
  email: z.union([z.email(), z.literal("")]).default(""),
  level_id: optionalId,
  due_date: date.optional(),
  notes: z.string().max(2000).default(""),
  active: z.boolean().default(true),
});
export const specialtySchema = z.object({
  name: z.string().trim().min(1).max(100),
});
export const teacherSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().max(80).default(""),
  phone: z.string().trim().max(30).default(""),
  email: z.union([z.email(), z.literal("")]).default(""),
  specialty_id: z
    .union([
      z.literal("").transform(() => null),
      z.null(),
      z.coerce.number().int().positive(),
    ])
    .optional(),
  notes: z.string().max(2000).default(""),
  active: z.boolean().default(true),
});
export const groupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  subject: z.string().trim().max(100).default(""),
  teacher: z.string().trim().max(120).default(""),
  teacher_id: z
    .union([
      z.literal("").transform(() => null),
      z.null(),
      z.coerce.number().int().positive(),
    ])
    .optional(),
  level_id: optionalId,
  schedule: z.string().trim().max(255).default(""),
  room: z.string().trim().max(80).default(""),
  monthly_fee: money,
  capacity: z.coerce.number().int().min(1).max(1000),
  active: z.boolean().default(true),
});
