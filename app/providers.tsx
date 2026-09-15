"use client";

import type { ReactNode } from "react";
import { NeonAuthUIProvider } from "@neondatabase/auth/react/ui";
import { authClient } from "@/lib/auth/client";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <NeonAuthUIProvider authClient={authClient} redirectTo="/dashboard">
      {children}
    </NeonAuthUIProvider>
  );
}
