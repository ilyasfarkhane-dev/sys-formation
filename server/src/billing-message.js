import PDFDocument from "pdfkit";
import { defaultReceipt, defaultReminder, fillMessage } from "./messages.js";

const methods = {
  cash: "Espèces",
  transfer: "Virement",
  card: "Carte",
  cheque: "Chèque",
};
function moneyLabel(value, currency) {
  return (
    new Intl.NumberFormat("fr-MA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
      .format(Number(value || 0))
      .replace(/\u202f|\u00a0/g, " ") +
    " " +
    (currency || "MAD")
  );
}
function dateFR(value) {
  return value
    ? new Date(String(value).slice(0, 10) + "T12:00:00").toLocaleDateString(
        "fr-FR",
      )
    : "—";
}
function periodFR(value) {
  return new Date(String(value) + "-01T12:00:00").toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}
function givenName(full) {
  const name = String(full || "").trim().split(/\s+/)[0] || "";
  return name ? name.charAt(0).toLocaleUpperCase("fr") + name.slice(1) : "";
}
export function receiptNumber(id) {
  return "RC-" + String(id).padStart(6, "0");
}
export function reminderText(invoice, settings) {
  const centre = settings?.name || "notre centre";
  const balance =
    Math.round((Number(invoice.amount) - Number(invoice.paid)) * 100) / 100;
  return fillMessage(settings?.reminder_message || defaultReminder, {
    prenom: givenName(invoice.student_name),
    centre,
    groupe: invoice.group_name,
    periode: periodFR(invoice.period),
    echeance: dateFR(invoice.due_date),
    montant: moneyLabel(invoice.amount, settings?.currency),
    reste:
      balance !== Number(invoice.amount)
        ? moneyLabel(balance, settings?.currency)
        : "",
    telephone: settings?.phone || "",
  });
}
export function settledText(payment, settings) {
  const centre = settings?.name || "notre centre";
  return fillMessage(settings?.receipt_message || defaultReceipt, {
    prenom: givenName(payment.student_name),
    centre,
    groupe: payment.group_name,
    periode: periodFR(payment.period),
    montant: moneyLabel(payment.amount, settings?.currency),
    date: dateFR(payment.paid_on),
    mode: methods[payment.method] || payment.method,
    recu: receiptNumber(payment.id),
    telephone: settings?.phone || "",
  });
}
export function receiptPdf(payment, paid, settings) {
  const currency = settings?.currency || "MAD";
  const balance =
    Math.round((Number(payment.invoice_amount) - Number(paid)) * 100) / 100;
  const contact = [settings?.address, settings?.phone].filter(Boolean).join("  ·  ");
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A5", margin: 0 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const width = doc.page.width;
    const margin = 28;
    const inner = width - margin * 2;
    const primary = /^#[0-9a-fA-F]{6}$/.test(settings?.color)
      ? settings.color
      : "#176658";
    const dark = /^#[0-9a-fA-F]{6}$/.test(settings?.color_dark)
      ? settings.color_dark
      : "#123b3a";
    doc.rect(0, 0, width, 78).fill(dark);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(16).text(settings?.name || "Centre", margin, 22, { width: inner - 70 });
    doc.font("Helvetica").fontSize(9).fillColor("#d5e6e1").text(contact, margin, 46, { width: inner - 70 });
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#b7d4cc").text("REÇU", width - margin - 52, 28, { width: 52, align: "right" });
    doc.fillColor(primary).font("Helvetica").fontSize(9).text("REÇU DE PAIEMENT", margin, 96);
    doc.fillColor(dark).font("Helvetica-Bold").fontSize(18).text(receiptNumber(payment.id), margin, 110);
    doc.font("Helvetica").fontSize(9).fillColor("#8aa098").text("DATE", margin, 96, { width: inner, align: "right" });
    doc.font("Helvetica-Bold").fontSize(12).fillColor(dark).text(dateFR(payment.paid_on), margin, 112, { width: inner, align: "right" });
    doc.font("Helvetica").fontSize(9).fillColor("#8aa098").text("REÇU DE", margin, 148);
    doc.font("Helvetica-Bold").fontSize(14).fillColor(dark).text(payment.student_name || "—", margin, 162);
    const fields = [
      ["GROUPE", payment.group_name],
      ["MENSUALITÉ", periodFR(payment.period)],
      ["MODE", methods[payment.method] || payment.method],
      ["ENREGISTRÉ PAR", payment.recorded_by],
    ];
    fields.forEach((field, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = margin + column * (inner / 2 + 4);
      const y = 196 + row * 42;
      doc.roundedRect(x, y, inner / 2 - 6, 36, 6).fill("#f4f7f6");
      doc.fillColor("#8aa098").font("Helvetica").fontSize(8).text(field[0], x + 10, y + 7, { width: inner / 2 - 26 });
      doc.fillColor("#1d3b34").font("Helvetica-Bold").fontSize(10).text(String(field[1] || "—"), x + 10, y + 18, { width: inner / 2 - 26 });
    });
    let y = 288;
    if (payment.note) {
      doc.font("Helvetica").fontSize(9).fillColor("#5f746e").text("Référence · " + payment.note, margin, y, { width: inner });
      y += 22;
    }
    doc.roundedRect(margin, y, inner, 52, 8).fill(primary);
    doc.fillColor("#d7ebe4").font("Helvetica").fontSize(8).text("MONTANT REÇU", margin + 14, y + 12);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(18).text(moneyLabel(payment.amount, currency), margin + 14, y + 26, { width: inner - 28, align: "right" });
    y += 68;
    const summary = [
      ["MENSUALITÉ", moneyLabel(payment.invoice_amount, currency)],
      ["DÉJÀ RÉGLÉ", moneyLabel(paid, currency)],
      ["SOLDE", moneyLabel(balance, currency)],
    ];
    summary.forEach((item, index) => {
      const x = margin + index * (inner / 3);
      doc.fillColor("#8aa098").font("Helvetica").fontSize(8).text(item[0], x, y, { width: inner / 3, align: "center" });
      doc.fillColor("#1d3b34").font("Helvetica-Bold").fontSize(10).text(item[1], x, y + 14, { width: inner / 3, align: "center" });
    });
    doc.font("Helvetica").fontSize(10).fillColor("#7f948e").text("Merci pour votre confiance.", margin, y + 48, { width: inner, align: "center" });
    doc.end();
  });
}
