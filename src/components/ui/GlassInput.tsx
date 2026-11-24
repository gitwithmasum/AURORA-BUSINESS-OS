"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface FormFieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-xs font-medium text-[var(--aurora-text-strong)]"
        >
          {label}
          {required && (
            <span className="ml-1 text-[var(--aurora-danger)]">*</span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-[11px] font-medium text-[var(--aurora-danger)]">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-[var(--aurora-text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

export interface GlassInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  hasError?: boolean;
}

export const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className, leftIcon, rightElement, hasError, ...props }, ref) => {
    return (
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3.5 text-[var(--aurora-text-muted)]">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            "h-10 w-full rounded-[16px] border bg-[var(--aurora-glass-bg-subtle)] px-3.5 text-sm text-[var(--aurora-text-strong)] placeholder:text-[var(--aurora-text-muted)] backdrop-blur-md transition-all focus:border-[var(--aurora-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--aurora-glow)] disabled:cursor-not-allowed disabled:opacity-50",
            leftIcon && "pl-10",
            rightElement && "pr-10",
            hasError
              ? "border-[var(--aurora-danger)]"
              : "border-[var(--aurora-glass-border)]",
            className
          )}
          {...props}
        />
        {rightElement && (
          <span className="absolute right-3 flex items-center">
            {rightElement}
          </span>
        )}
      </div>
    );
  }
);

GlassInput.displayName = "GlassInput";

export const GlassTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { hasError?: boolean }
>(({ className, hasError, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-[88px] w-full rounded-[16px] border bg-[var(--aurora-glass-bg-subtle)] px-3.5 py-2.5 text-sm text-[var(--aurora-text-strong)] placeholder:text-[var(--aurora-text-muted)] backdrop-blur-md transition-all focus:border-[var(--aurora-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--aurora-glow)]",
      hasError
        ? "border-[var(--aurora-danger)]"
        : "border-[var(--aurora-glass-border)]",
      className
    )}
    {...props}
  />
));

GlassTextarea.displayName = "GlassTextarea";

export interface GlassSelectOption {
  value: string;
  label: string;
}

export interface GlassSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: GlassSelectOption[];
  hasError?: boolean;
}

export const GlassSelect = React.forwardRef<HTMLSelectElement, GlassSelectProps>(
  ({ className, options, hasError, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-10 w-full cursor-pointer rounded-[16px] border bg-[var(--aurora-surface)] px-3.5 text-sm text-[var(--aurora-text-strong)] transition-all focus:border-[var(--aurora-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--aurora-glow)]",
        hasError
          ? "border-[var(--aurora-danger)]"
          : "border-[var(--aurora-glass-border)]",
        className
      )}
      {...props}
    >
      {options.map((opt) => (
        <option
          key={opt.value}
          value={opt.value}
          className="bg-[var(--aurora-surface)] text-[var(--aurora-text-strong)]"
        >
          {opt.label}
        </option>
      ))}
    </select>
  )
);

GlassSelect.displayName = "GlassSelect";

export interface GlassSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export function GlassSwitch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
}: GlassSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className="flex w-full cursor-pointer items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
    >
      {(label || description) && (
        <div>
          {label && (
            <div className="text-sm font-medium text-[var(--aurora-text-strong)]">
              {label}
            </div>
          )}
          {description && (
            <div className="text-xs text-[var(--aurora-text-muted)]">
              {description}
            </div>
          )}
        </div>
      )}
      <span
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200",
          checked
            ? "border-transparent bg-[var(--aurora-accent)]"
            : "border-[var(--aurora-glass-border-strong)] bg-[var(--aurora-glass-bg-subtle)]"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </span>
    </button>
  );
}
