import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import { rm, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pino from "pino";
import qrcode from "qrcode";
import { whatsappDigits } from "./welcome.js";

const sessionDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "data",
  "whatsapp",
);
const logger = pino({ level: "silent" });
let generation = 0;
let sock = null;
let starting = null;
let reconnectTimer = null;
let connected = false;
let qr = "";
let accountPhone = "";

export function whatsappStatus() {
  return { connected, qr, phone: accountPhone };
}
export function ensureWhatsApp() {
  if (sock || starting || reconnectTimer) return starting || Promise.resolve();
  starting = connect().finally(() => {
    starting = null;
  });
  return starting;
}
export function stopWhatsApp() {
  generation += 1;
  clearTimeout(reconnectTimer);
  reconnectTimer = null;
  const current = sock;
  sock = null;
  connected = false;
  qr = "";
  accountPhone = "";
  try {
    current?.end(undefined);
  } catch {}
}
export async function logoutWhatsApp() {
  const current = sock;
  stopWhatsApp();
  try {
    await current?.logout();
  } catch {}
  await rm(sessionDir, { recursive: true, force: true });
}
async function connect() {
  const current = ++generation;
  clearTimeout(reconnectTimer);
  reconnectTimer = null;
  await mkdir(sessionDir, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  let version;
  try {
    version = (await fetchLatestBaileysVersion({ timeout: 8000 })).version;
  } catch {}
  const socket = makeWASocket({
    ...(version ? { version } : {}),
    auth: state,
    logger,
    printQRInTerminal: false,
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });
  if (current !== generation) {
    socket.end(undefined);
    return;
  }
  sock = socket;
  socket.ev.on("creds.update", saveCreds);
  socket.ev.on("connection.update", async (update) => {
    if (current !== generation) return;
    if (update.qr) {
      qr = await qrcode.toDataURL(update.qr);
      connected = false;
    }
    if (update.connection === "open") {
      connected = true;
      qr = "";
      accountPhone = whatsappDigits(
        String(socket.user?.id || "").split("@")[0].split(":")[0],
      );
    }
    if (update.connection === "close") {
      connected = false;
      accountPhone = "";
      if (sock === socket) sock = null;
      const code = update.lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        qr = "";
        return;
      }
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (current === generation)
          connect().catch((error) => console.error("WhatsApp", error.message));
      }, 3000);
    }
  });
}
function reject(message) {
  throw Object.assign(new Error(message), { status: 409 });
}
async function recipientJid(fromPhone, toPhone) {
  await ensureWhatsApp();
  for (let attempt = 0; attempt < 20 && !connected && !qr; attempt += 1)
    await new Promise((resolve) => setTimeout(resolve, 250));
  if (!connected)
    reject(
      "Connectez le WhatsApp du centre dans Paramètres. Le message part de ce numéro vers l’élève.",
    );
  const expected = whatsappDigits(fromPhone);
  if (!expected)
    reject("Enregistrez le téléphone du centre dans Paramètres.");
  if (accountPhone && accountPhone !== expected)
    reject(
      "Le WhatsApp connecté (" +
        accountPhone +
        ") n’est pas le numéro enregistré dans Paramètres (" +
        expected +
        ").",
    );
  const recipient = whatsappDigits(toPhone);
  if (!recipient) reject("Ajoutez le téléphone de l’élève pour envoyer le message.");
  const [onWhatsApp] = await sock.onWhatsApp(recipient);
  if (!onWhatsApp?.exists)
    reject("Ce numéro n’est pas inscrit sur WhatsApp.");
  return onWhatsApp.jid;
}
export async function sendWhatsApp(fromPhone, toPhone, text) {
  const jid = await recipientJid(fromPhone, toPhone);
  await sock.sendMessage(jid, { text });
}
export async function sendWhatsAppFile(fromPhone, toPhone, text, file) {
  const jid = await recipientJid(fromPhone, toPhone);
  await sock.sendMessage(jid, {
    document: file.buffer,
    mimetype: "application/pdf",
    fileName: file.name,
    caption: text,
  });
}
