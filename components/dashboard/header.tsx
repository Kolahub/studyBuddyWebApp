import * as React from "react";

interface DashboardHeaderProps {
  heading: string;
  text?: string;
  children?: React.ReactNode;
  suppressHydrationWarning?: boolean;
}

export function DashboardHeader({
  heading,
  text,
  children,
  suppressHydrationWarning = false,
}: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between px-2">
      <div className="grid gap-1">
        <h1
          className="font-heading text-3xl md:text-4xl"
          {...(suppressHydrationWarning
            ? { suppressHydrationWarning: true }
            : {})}
        >
          {heading}
        </h1>
        {text && (
          <p
            className="text-lg text-muted-foreground"
            {...(suppressHydrationWarning
              ? { suppressHydrationWarning: true }
              : {})}
          >
            {text}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
