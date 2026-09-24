"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="font-heading text-3xl font-semibold">Something went wrong</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Reload this page. If it happens again, try later or email Victory Foam.
      </p>
      <Button className="mt-6" type="button" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
