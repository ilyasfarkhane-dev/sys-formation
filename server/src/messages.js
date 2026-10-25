export const defaultReminder = `Bonjour {prenom} 👋

Rappel de *{centre}*.

La mensualité de *{groupe}* ({periode}) est en retard.

📌 Échéance : {echeance}
💰 Montant : {montant}
⏳ Reste à régler : {reste}

Merci de régulariser ce paiement dès que possible.
📞 {telephone}

*{centre}*`;
export const defaultReceipt = `Bonjour {prenom} 👋

Votre paiement est réglé. Merci pour votre confiance.

✅ *{groupe}* — {periode}
💰 {montant}
📅 Réglé le {date}
💳 {mode}
🧾 Reçu {recu}

Le reçu PDF est joint à ce message.
📞 {telephone}

*{centre}*`;
export const defaultMakeup = `Bonjour {prenom} 👋

La séance de *{groupe}* du {seance} ({horaire}) est reportée.

📌 Rattrapage : {date}
🕒 {debut} – {fin}
📍 {salle}

À très bientôt ✨
*{centre}*`;
export function fillMessage(template, values) {
  return String(template || "")
    .replace(/\{([a-z]+)\}/g, (token, key) =>
      values[key] == null ? "" : String(values[key]),
    )
    .split("\n")
    .filter((line) => !/^(📞|📍|⏳ Reste à régler :)\s*$/.test(line.trim()))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
