"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function AuroraLogoMark({
  className,
  bare = false,
}: {
  className?: string;
  bare?: boolean;
}) {
  const uid = React.useId().replace(/:/g, "");

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden transition-all duration-300",
        !bare &&
          "h-9 w-9 rounded-xl border border-amber-300/30 bg-gradient-to-br from-[#161f38] via-[#0c1224] to-[#070b18] shadow-[0_0_12px_rgba(245,186,75,0.18)] group-hover:border-amber-300/50 group-hover:shadow-[0_0_18px_rgba(245,186,75,0.32)]",
        className
      )}
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        className={cn(bare ? "h-full w-full" : "h-5 w-5 transition-transform duration-300 group-hover:scale-105")}
      >
        <defs>
          <linearGradient
            id={`${uid}-gb`}
            x1="32"
            y1="8"
            x2="12"
            y2="54"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FFF8D2" />
            <stop offset="45%" stopColor="#F7C964" />
            <stop offset="100%" stopColor="#BC7A1E" />
          </linearGradient>
          <linearGradient
            id={`${uid}-gd`}
            x1="20"
            y1="20"
            x2="32"
            y2="54"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#E6A139" />
            <stop offset="100%" stopColor="#7C450D" />
          </linearGradient>
          <linearGradient
            id={`${uid}-gri`}
            x1="32"
            y1="18"
            x2="49"
            y2="54"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FFF2BF" />
            <stop offset="55%" stopColor="#E9A842" />
            <stop offset="100%" stopColor="#A66418" />
          </linearGradient>
          <linearGradient
            id={`${uid}-gro`}
            x1="32"
            y1="8"
            x2="56"
            y2="54"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FCE18E" />
            <stop offset="55%" stopColor="#D78F2B" />
            <stop offset="100%" stopColor="#8C4E0F" />
          </linearGradient>
        </defs>

        {/* Outer A Prism */}
        <polygon points="32,7 8,55 14.5,55 32,19" fill={`url(#${uid}-gb)`} />
        <polygon points="32,19 14.5,55 20.5,55 32,27.5" fill={`url(#${uid}-gd)`} />
        <polygon points="32,19 32,27.5 43.5,55 49.5,55" fill={`url(#${uid}-gri)`} />
        <polygon points="32,7 32,19 49.5,55 56,55" fill={`url(#${uid}-gro)`} />

        {/* Inner Split Delta */}
        <polygon points="32,33.5 23,54 32,50.5" fill={`url(#${uid}-gb)`} />
        <polygon points="32,33.5 32,50.5 41,54" fill={`url(#${uid}-gd)`} />

        {/* Top-Right & Base Sparkles */}
        <path
          d="M41.5 17.5 L42.7 21.3 L46.5 22.5 L42.7 23.7 L41.5 27.5 L40.3 23.7 L36.5 22.5 L40.3 21.3 Z"
          fill="#FFFBE0"
        />
        <path
          d="M32 47.4 L32.8 49.7 L35.1 50.5 L32.8 51.3 L32 53.6 L31.2 51.3 L28.9 50.5 L31.2 49.7 Z"
          fill="#FFF6CA"
        />
      </svg>
    </div>
  );
}

export function AuroraBrandTitle({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 leading-none", className)}>
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "font-display truncate font-normal tracking-[0.14em] bg-gradient-to-r from-[#FFF0B8] via-[#F2BE58] to-[#D9912E] [[data-theme='light-glass']_&]:from-[#C27D16] [[data-theme='light-glass']_&]:via-[#9E5F0B] [[data-theme='light-glass']_&]:to-[#754305] bg-clip-text text-transparent drop-shadow-[0_1px_1px_rgba(0,0,0,0.22)]",
            compact ? "text-[16px]" : "text-[20px]"
          )}
        >
          AURORA
        </span>
        <span className="system-code inline-flex items-center rounded border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-bold tracking-widest text-[var(--aurora-accent)] leading-none select-none">
          HUB
        </span>
      </div>
      <div
        className={cn(
          "mt-0.5 truncate font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--aurora-text-muted)]",
          compact ? "text-[9px]" : "text-[10px]"
        )}
      >
        BUSINESS HUB
      </div>
    </div>
  );
}
