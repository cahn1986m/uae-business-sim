// يشغّل db/schema.sql على قاعدة بيانات Neon المحددة بـ DATABASE_URL.
// الاستخدام: npm run db:migrate  (لازم .env.local فيه DATABASE_URL فعلي أولاً)

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL غير موجود بالـ environment. شغّل هيك: node --env-file=.env.local scripts/db-migrate.mjs"
  );
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const schemaPath = path.join(__dirname, "..", "db", "schema.sql");
const schema = readFileSync(schemaPath, "utf8");

try {
  await sql.query(schema);
  console.log("✅ تم إنشاء/تأكيد جدول game_state بنجاح.");
} catch (err) {
  console.error("❌ فشل تشغيل schema.sql:", err);
  process.exit(1);
}
