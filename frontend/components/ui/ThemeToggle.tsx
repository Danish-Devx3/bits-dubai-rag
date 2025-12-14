"use client";

import { Moon, Sun } from "lucide-react";

interface ThemeToggleProps {
  theme: "light" | "dark";
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="relative h-10 w-10 flex items-center justify-center rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm hover:bg-secondary/50 dark:hover:bg-secondary/30 transition-all duration-300 hover:scale-110 active:scale-95 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 group"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      <div className="relative">
        {theme === "light" ? (
          <Moon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-all duration-300 group-hover:rotate-12" />
        ) : (
          <Sun className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-all duration-300 group-hover:rotate-90" />
        )}
      </div>
      <span className="absolute inset-0 rounded-xl bg-primary/0 group-hover:bg-primary/5 transition-all duration-300"></span>
    </button>
  );
}
