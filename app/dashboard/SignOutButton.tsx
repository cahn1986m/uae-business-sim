"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export default function SignOutButton() {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
      className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
    >
      تسجيل خروج
    </button>
  );
}
