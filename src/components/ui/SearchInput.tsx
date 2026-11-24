"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  shortcut?: string;
  containerClassName?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onChange,
      placeholder = "Search...",
      shortcut,
      className,
      containerClassName,
      ...props
    },
    ref
  ) => {
    return (
      <div className={cn("relative flex items-center", containerClassName)}>
        <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-[var(--aurora-text-muted)]" />
        <input
          ref={ref}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "h-10 w-full rounded-full border border-[var(--aurora-glass-border)] bg-[var(--aurora-glass-bg-subtle)] pl-10 pr-10 text-sm text-[var(--aurora-text-strong)] placeholder:text-[var(--aurora-text-muted)] backdrop-blur-md transition-all focus:border-[var(--aurora-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--aurora-glow)]",
            className
          )}
          {...props}
        />
        {value ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onChange("")}
            className="absolute right-3 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-[var(--aurora-text-muted)] transition-colors hover:bg-[var(--aurora-glass-bg)] hover:text-[var(--aurora-text-strong)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : shortcut ? (
          <kbd className="pointer-events-none absolute right-3 hidden rounded-md border border-[var(--aurora-glass-border)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--aurora-text-muted)] sm:inline-block">
            {shortcut}
          </kbd>
        ) : null}
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";
