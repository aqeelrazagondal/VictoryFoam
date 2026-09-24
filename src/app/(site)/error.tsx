"use client";

import { Button } from "@/components/ui/button";

export default function SiteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="font-heading text-3xl font-semibold">This page failed to load</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Try again. If the problem continues, use Contact to reach Victory Foam.
      </p>
      <Button className="mt-6" type="button" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
