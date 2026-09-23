"use client";

import type { ReactNode } from "react";

import { AppShell } from "@/components/tank/app-shell";
import { AuthGate } from "@/components/tank/auth-gate";
import { TankProvider } from "@/lib/tank/context";

export function TankApp({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <TankProvider>
        <AppShell>{children}</AppShell>
      </TankProvider>
    </AuthGate>
  );
}
