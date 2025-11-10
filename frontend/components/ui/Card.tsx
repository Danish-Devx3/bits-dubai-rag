"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

export function Card({ children, className, padding = "md" }: CardProps) {
  const paddings = {
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };
  
  return (
    <div
      className={cn(
        "bg-white rounded-xl shadow-md border border-gray-200",
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

