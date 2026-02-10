import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary-600 text-white",
        secondary: "border-transparent bg-surface-200 text-surface-900 dark:bg-surface-800 dark:text-surface-100",
        destructive: "border-transparent bg-red-600 text-white",
        outline: "text-surface-900 dark:text-surface-100",
        success: "border-transparent bg-green-600 text-white",
        warning: "border-transparent bg-yellow-500 text-white",
        ftc: "border-transparent bg-ftc-orange text-white",
        frc: "border-transparent bg-frc-red text-white",
        // Status badges
        pending: "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        inProgress: "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        completed: "border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        blocked: "border-transparent bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        // Priority badges
        low: "border-transparent bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400",
        medium: "border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
        high: "border-transparent bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
        critical: "border-transparent bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
