"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, RotateCcw } from "lucide-react";
import type { DashboardWidgetConfig, WidgetId } from "@/types/dashboard";
import { GlassButton, GlassDialog, GlassSwitch } from "@/components/ui";

export interface CustomizeWidgetsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgets: DashboardWidgetConfig[];
  onToggleVisibility: (id: WidgetId) => void;
  onMoveWidget: (index: number, direction: -1 | 1) => void;
  onReset: () => void;
}

export function CustomizeWidgetsModal({
  open,
  onOpenChange,
  widgets,
  onToggleVisibility,
  onMoveWidget,
  onReset,
}: CustomizeWidgetsModalProps) {
  return (
    <GlassDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Customize Dashboard Layout"
      description="Show, hide, or rearrange modular dashboard widgets. Preferences persist locally in your browser."
      maxWidth="md"
      footer={
        <>
          <GlassButton variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Default
          </GlassButton>
          <GlassButton
            variant="primary"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Done
          </GlassButton>
        </>
      }
    >
      <div className="space-y-2.5">
        {widgets.map((widget, idx) => (
          <div
            key={widget.id}
            className="aurora-glass-subtle flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5"
          >
            <div className="flex items-center gap-1.5">
              <GlassButton
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={idx === 0}
                aria-label={`Move ${widget.title} up`}
                onClick={() => onMoveWidget(idx, -1)}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </GlassButton>
              <GlassButton
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={idx === widgets.length - 1}
                aria-label={`Move ${widget.title} down`}
                onClick={() => onMoveWidget(idx, 1)}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </GlassButton>
            </div>

            <div className="min-w-0 flex-1">
              <GlassSwitch
                checked={widget.visible}
                onCheckedChange={() => onToggleVisibility(widget.id)}
                label={widget.title}
              />
            </div>
          </div>
        ))}
      </div>
    </GlassDialog>
  );
}
