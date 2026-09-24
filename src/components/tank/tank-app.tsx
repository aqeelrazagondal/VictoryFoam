"use client";

import type { ReactNode } from "react";

import { ClientErrorBoundary } from "@/components/error-boundary";
import { AppShell } from "@/components/tank/app-shell";
import { AuthGate } from "@/components/tank/auth-gate";
import { Button } from "@/components/ui/button";
import { TankProvider } from "@/lib/tank/context";

function TankCrashFallback() {
  return (
    <div className="container-tank flex min-h-[60vh] flex-col justify-center">
      <h1>Calculator error</h1>
      <p className="mt-2 text-muted-foreground">
        Reload the calculator. Do not repeat a pour until you can see the log again.
      </p>
      <Button
        className="mt-6 w-full max-w-md"
        size="touch"
        type="button"
        onClick={() => window.location.reload()}
      >
        Reload calculator
      </Button>
    </div>
  );
}

export function TankApp({ children }: { children: ReactNode }) {
  return (
    <ClientErrorBoundary fallback={<TankCrashFallback />}>
      <AuthGate>
        <TankProvider>
          <AppShell>{children}</AppShell>
        </TankProvider>
      </AuthGate>
    </ClientErrorBoundary>
  );
}
