"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      className={cn("relative min-h-11 min-w-11", className)}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <Sun className={cn("h-4 w-4 transition-transform", isDark ? "scale-0" : "scale-100")} />
      <Moon className={cn("absolute h-4 w-4 transition-transform", isDark ? "scale-100" : "scale-0")} />
    </Button>
  );
}
