-- طبقة المنصة المشتركة — game_state
-- عمود user_id مرتبط بحساب المستخدم من Neon Auth (جدول neon_auth."user" الذي
-- تديره Neon Auth تلقائياً — تأكدنا من اسمه وأعمدته بالاستعلام المباشر عن
-- قاعدة البيانات الفعلية، مش تخمين)، وعمود data من نوع JSON فاضي مبدئياً
-- لتخزين تقدم اللاعب بالمراحل العشرة لاحقاً. لا يوجد أي منطق لعبة هنا بعد —
-- فقط الجدول.

CREATE TABLE IF NOT EXISTS game_state (
  user_id UUID PRIMARY KEY REFERENCES neon_auth."user" (id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
