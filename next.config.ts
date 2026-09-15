import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  /* config options here */
  // يمنع Turbopack من الصعود لمجلد المستخدم (فيه package-lock.json قديم غير
  // متعلق بالمشروع) وتخمين جذر خاطئ لمساحة العمل.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
