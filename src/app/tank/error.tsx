"use client";

import { Button } from "@/components/ui/button";

export default function TankError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container-tank flex min-h-[50vh] flex-col justify-center">
      <h1>Calculator error</h1>
      <p className="mt-2 text-muted-foreground">
        The tank calculator hit an unexpected error. Try again without repeating a pour until the log
        reloads.
      </p>
      <Button className="mt-6 w-full max-w-md" size="touch" type="button" onClick={() => reset()}>
        Reload calculator
      </Button>
    </div>
  );
}
