function localToday() {
  const date = new Date();
  return (
    date.getFullYear() +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getDate()).padStart(2, "0")
  );
}
function dateFR(value) {
  return value
    ? new Date(String(value).slice(0, 10) + "T12:00:00").toLocaleDateString(
        "fr-FR",
      )
    : "—";
}
function echeanceOn(period, day) {
  const [year, monthNumber] = period.split("-").map(Number);
  const last = new Date(year, monthNumber, 0).getDate();
  const chosen = Math.min(Math.max(Number(day) || 1, 1), last);
  return period + "-" + String(chosen).padStart(2, "0");
}
function shiftMonth(period, count) {
  const [year, monthNumber] = period.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + count, 1);
  return (
    date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0")
  );
}
export function whatsappDigits(phone) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = "212" + digits.slice(1);
  else if (digits.length === 9) digits = "212" + digits;
  return digits.length >= 11 ? digits : "";
}
function nextEcheance(student, settings, invoices, enrollment, day) {
  const upcoming = (invoices || [])
    .filter(
      (invoice) =>
        Number(invoice.enrollment_id) === Number(enrollment.id) &&
        String(invoice.due_date) >= day,
    )
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))[0];
  if (upcoming) return String(upcoming.due_date).slice(0, 10);
  const dueDay = student.due_day || settings?.due_day || 1;
  const current = echeanceOn(day.slice(0, 7), dueDay);
  return current >= day
    ? current
    : echeanceOn(shiftMonth(day.slice(0, 7), 1), dueDay);
}
function givenName(value) {
  const name = String(value || "").trim();
  if (!name) return "";
  return name.charAt(0).toLocaleUpperCase("fr") + name.slice(1);
}
function roomLabel(room) {
  const value = String(room || "").trim();
  if (!value) return "";
  return /salle/i.test(value) ? value : "Salle " + value;
}
function scheduleSlots(schedule) {
  return String(schedule || "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}
export const defaultWelcome = `Bonjour {prenom} 👋

Bienvenue à *{centre}*.
🎓 Niveau : {niveau}

Voici les informations à conserver :

{groupes}

Une question ? Répondez à ce message, nous vous répondons avec plaisir.
📞 {telephone}

À très bientôt ✨
*{centre}*`;
function groupsText(file, settings, day) {
  const money = (value) =>
    new Intl.NumberFormat("fr-MA", {
      style: "currency",
      currency: settings?.currency || "MAD",
    }).format(Number(value || 0));
  const groups = (file.enrollments || [])
    .filter((enrollment) => !enrollment.end_date || enrollment.end_date >= day)
    .sort((a, b) => a.group_name.localeCompare(b.group_name, "fr"));
  if (!groups.length)
    return "Votre dossier est bien enregistré. Votre emploi du temps vous sera envoyé dès qu’un groupe vous sera attribué.";
  return groups
    .map((enrollment) => {
      const slots = scheduleSlots(enrollment.schedule);
      const lines = [
        "📚 *" +
          enrollment.group_name +
          "*" +
          (enrollment.subject ? " — " + enrollment.subject : ""),
      ];
      if (enrollment.teacher) lines.push("👤 " + enrollment.teacher);
      if (String(enrollment.start_date || "").slice(0, 10) >= day)
        lines.push("📅 Début : " + dateFR(enrollment.start_date));
      if (slots.length) slots.forEach((slot) => lines.push("🗓️ " + slot));
      else lines.push("🗓️ Horaires à confirmer");
      if (enrollment.room) lines.push("📍 " + roomLabel(enrollment.room));
      lines.push(
        "💰 " + money(enrollment.monthly_fee) + " / mois",
        "📌 Échéance : " +
          dateFR(
            nextEcheance(
              file.student,
              settings,
              file.invoices,
              enrollment,
              day,
            ),
          ),
      );
      return lines.join("\n");
    })
    .join("\n\n");
}
export function welcomeText(file, settings) {
  const student = file.student;
  const day = localToday();
  const values = {
    prenom: givenName(student.first_name),
    nom: givenName(student.last_name),
    centre: settings?.name || "notre centre",
    niveau: student.level || "",
    telephone: settings?.phone || "",
    groupes: groupsText(file, settings, day),
  };
  const template = String(settings?.welcome_message || "").trim() || defaultWelcome;
  return template
    .replace(/\{(prenom|nom|centre|niveau|telephone|groupes)\}/g, (token, key) => values[key])
    .split("\n")
    .filter((line) => !["🎓 Niveau :", "📞"].includes(line.trim()))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
