"use client";

import { Zap, Hand } from "lucide-react";

interface ModeSwitchProps {
  isAutoMode: boolean;
  onModeChange: (isAuto: boolean) => void;
  autoStatusText: string;
  autoStatusTone: "fan" | "heater" | "idle";
}

export function ModeSwitch({
  isAutoMode,
  onModeChange,
  autoStatusText,
  autoStatusTone,
}: ModeSwitchProps) {
  const autoStatusClass =
    autoStatusTone === "fan"
      ? "text-blue-600"
      : autoStatusTone === "heater"
      ? "text-orange-600"
      : "text-muted-foreground";

  return (
    <div className="mb-6">
      <h2 className="mb-3 text-sm font-semibold text-foreground">제어 모드</h2>
      <div className="flex rounded-xl bg-card p-1.5 shadow-sm">
        <button
          onClick={() => onModeChange(true)}
          className={`
            flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3
            text-sm font-medium transition-all duration-300
            ${
              isAutoMode
                ? "bg-accent text-accent-foreground shadow-md"
                : "text-muted-foreground hover:bg-muted"
            }
          `}
          aria-pressed={isAutoMode}
        >
          <Zap className={`h-4 w-4 ${isAutoMode ? "animate-pulse" : ""}`} />
          <span>자동 (AUTO)</span>
        </button>
        <button
          onClick={() => onModeChange(false)}
          className={`
            flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3
            text-sm font-medium transition-all duration-300
            ${
              !isAutoMode
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:bg-muted"
            }
          `}
          aria-pressed={!isAutoMode}
        >
          <Hand className="h-4 w-4" />
          <span>수동 (MANUAL)</span>
        </button>
      </div>
      <p
        className={`mt-2 text-center text-xs ${
          isAutoMode ? autoStatusClass : "text-muted-foreground"
        }`}
      >
        {isAutoMode
          ? autoStatusText
          : "쿨링팬과 히터를 직접 제어할 수 있습니다"}
      </p>
    </div>
  );
}
