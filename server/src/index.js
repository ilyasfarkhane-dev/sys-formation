import { app } from "./app.js";
import { checkSecret } from "./auth.js";
import { pool, query } from "./db.js";
import { ensureTeachers } from "./schema-ensure.js";
checkSecret();
await query("SELECT 1");
await ensureTeachers();
const server = app.listen(Number(process.env.PORT || 4000), "0.0.0.0", () =>
  console.log(`CentreFlow API · port ${process.env.PORT || 4000}`),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    server.close(async () => {
      try {
        const { stopWhatsApp } = await import("./whatsapp.js");
        stopWhatsApp();
      } catch {}
      await pool.end();
      process.exit(0);
    }),
  );
