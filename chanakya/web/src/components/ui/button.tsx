import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius-md)] border text-[12px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "border-accent bg-accent text-accent-fg hover:brightness-110",
        secondary: "border-border bg-panel-2 text-fg hover:border-muted",
        ghost: "border-transparent bg-transparent text-muted hover:bg-panel-2 hover:text-fg",
        danger: "border-danger/60 bg-transparent text-danger hover:bg-danger/10",
      },
      size: { sm: "h-6 px-2", md: "h-7 px-3", lg: "h-9 px-4 text-[13px]" },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
