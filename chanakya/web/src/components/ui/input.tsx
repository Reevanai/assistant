import * as React from "react";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-[var(--radius-md)] border border-border bg-bg px-2 text-[13px] text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none disabled:opacity-50";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, "h-8", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(field, "min-h-16 py-1.5", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(field, "h-8 pr-6", className)} {...props}>
      {children}
    </select>
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted", className)} {...props} />;
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-[11px] text-danger">{message}</p>;
}

export function FormMessage({ ok, message }: { ok?: boolean; message?: string }) {
  if (!message) return null;
  return (
    <p role={ok ? "status" : "alert"} className={cn("rounded-[var(--radius-md)] border px-2 py-1.5 text-[12px]",
      ok ? "border-success/40 bg-success/10 text-success" : "border-danger/40 bg-danger/10 text-danger")}>
      {message}
    </p>
  );
}
