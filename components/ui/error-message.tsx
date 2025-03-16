import React from "react";
import { AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ErrorMessageProps {
  message: string;
  variant?: "default" | "destructive";
  onDismiss?: () => void;
  className?: string;
}

export function ErrorMessage({
  message,
  variant = "default",
  onDismiss,
  className,
}: ErrorMessageProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-md border p-4",
        variant === "destructive"
          ? "border-destructive/50 bg-destructive/10 text-destructive"
          : "border-border bg-muted/50",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        <span>{message}</span>
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </Button>
      )}
    </div>
  );
}

export function ApiErrorMessage({
  error,
  className,
  onRetry,
  onDismiss,
}: {
  error: Error | null;
  className?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  if (!error) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <ErrorMessage
        message={error.message || "An error occurred"}
        variant="destructive"
        onDismiss={onDismiss}
      />
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-primary hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}
