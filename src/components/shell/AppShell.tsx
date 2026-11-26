"use client";

import * as React from "react";
import { GlassSidebar } from "./GlassSidebar";
import { TopGlassNavbar } from "./TopGlassNavbar";
import { PwaProvider } from "@/components/pwa/PwaProvider";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="aurora-canvas">
      <div className="mx-auto flex max-w-[1640px] gap-4 px-3 py-4 sm:px-5 lg:gap-5 lg:px-6">
        <GlassSidebar />
        <div className="min-w-0 flex-1">
          <TopGlassNavbar />
          <main className="pb-10">{children}</main>
        </div>
      </div>
      <PwaProvider />
    </div>
  );
}
