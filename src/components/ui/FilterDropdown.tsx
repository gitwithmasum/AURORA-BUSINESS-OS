"use client";

import * as React from "react";
import { Check, ChevronDown, Filter } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface FilterOption<T extends string = string> {
  value: T;
  label: string;
  hint?: string;
}

export interface FilterDropdownProps<T extends string = string> {
  label?: string;
  value: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
  icon?: React.ReactNode;
  className?: string;
}

export function FilterDropdown<T extends string = string>({
  label,
  value,
  options,
  onChange,
  icon,
  className,
}: FilterDropdownProps<T>) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const active = options.find((opt) => opt.value === value) ?? options[0];

  return (
    <div ref={rootRef} className={cn("relative inline-block", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="aurora-capsule flex h-9 cursor-pointer items-center gap-2 px-3.5 text-xs font-medium text-[var(--aurora-text-strong)] transition-all hover:border-[var(--aurora-glass-border-strong)]"
      >
        <span className="text-[var(--aurora-accent)]">
          {icon ?? <Filter className="h-3.5 w-3.5" />}
        </span>
        {label && (
          <span className="text-[var(--aurora-text-muted)]">{label}:</span>
        )}
        <span className="truncate">{active?.label}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-[var(--aurora-text-muted)] transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="aurora-glass-elevated absolute right-0 z-40 mt-2 min-w-[210px] rounded-[20px] p-1.5"
        >
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition-colors",
                  selected
                    ? "bg-[var(--aurora-glass-bg)] font-semibold text-[var(--aurora-text-strong)]"
                    : "text-[var(--aurora-text)] hover:bg-[var(--aurora-glass-bg-subtle)]"
                )}
              >
                <div>
                  <div>{opt.label}</div>
                  {opt.hint && (
                    <div className="text-[10px] text-[var(--aurora-text-muted)]">
                      {opt.hint}
                    </div>
                  )}
                </div>
                {selected && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-[var(--aurora-accent)]" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
