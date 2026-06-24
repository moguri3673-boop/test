"use client";

import { Fan, Flame, Power, PowerOff } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ControlButtonsProps {
  isAutoMode: boolean;
  fanOn: boolean;
  heaterOn: boolean;
  onFanToggle: (on: boolean) => void;
  onHeaterToggle: (on: boolean) => void;
  disabled?: boolean;
}

export function ControlButtons({
  isAutoMode,
  fanOn,
  heaterOn,
  onFanToggle,
  onHeaterToggle,
  disabled = false,
}: ControlButtonsProps) {
  const isDisabled = isAutoMode || disabled;
  const containerClass = disabled ? "pointer-events-none opacity-50" : "";
  const fanCardClass = fanOn ? "bg-blue-50/80 ring-1 ring-blue-200" : "bg-card";
  const heaterCardClass = heaterOn ? "bg-orange-50/80 ring-1 ring-orange-200" : "bg-card";

  return (
    <div
      className={`mb-6 transition-opacity duration-300 ${containerClass}`}
    >
      <h2 className="mb-3 text-sm font-semibold text-foreground">수동 제어</h2>
      <div className="grid grid-cols-2 gap-4">
        {/* Fan Control */}
        <Card className={`overflow-hidden border-0 shadow-sm ${fanCardClass}`}>
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <div
                className={`rounded-lg p-2 transition-colors duration-300 ${
                  fanOn ? "bg-blue-100 text-blue-600" : "bg-muted text-muted-foreground"
                }`}
              >
                <Fan className={`h-5 w-5 ${fanOn ? "animate-spin" : ""}`} style={{ animationDuration: "1s" }} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">쿨링팬</p>
                <p className="text-xs text-muted-foreground">FAN</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onFanToggle(true)}
                disabled={isDisabled}
                className={`
                  flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5
                  text-sm font-medium transition-all duration-200
                  ${
                    fanOn
                      ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }
                  disabled:cursor-not-allowed
                `}
              >
                <Power className="h-4 w-4" />
                ON
              </button>
              <button
                onClick={() => onFanToggle(false)}
                disabled={isDisabled}
                className={`
                  flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5
                  text-sm font-medium transition-all duration-200
                  ${
                    !fanOn
                      ? "bg-secondary text-secondary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }
                  disabled:cursor-not-allowed
                `}
              >
                <PowerOff className="h-4 w-4" />
                OFF
              </button>
            </div>
          </div>
        </Card>

        {/* Heater Control */}
        <Card className={`overflow-hidden border-0 shadow-sm ${heaterCardClass}`}>
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <div
                className={`rounded-lg p-2 transition-colors duration-300 ${
                  heaterOn ? "bg-orange-100 text-orange-500" : "bg-muted text-muted-foreground"
                }`}
              >
                <Flame className={`h-5 w-5 ${heaterOn ? "animate-pulse" : ""}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">필름히터</p>
                <p className="text-xs text-muted-foreground">HEATER</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onHeaterToggle(true)}
                disabled={isDisabled}
                className={`
                  flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5
                  text-sm font-medium transition-all duration-200
                  ${
                    heaterOn
                      ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }
                  disabled:cursor-not-allowed
                `}
              >
                <Power className="h-4 w-4" />
                ON
              </button>
              <button
                onClick={() => onHeaterToggle(false)}
                disabled={isDisabled}
                className={`
                  flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5
                  text-sm font-medium transition-all duration-200
                  ${
                    !heaterOn
                      ? "bg-secondary text-secondary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }
                  disabled:cursor-not-allowed
                `}
              >
                <PowerOff className="h-4 w-4" />
                OFF
              </button>
            </div>
          </div>
        </Card>
      </div>
      {isDisabled && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {disabled ? "블루투스 연결이 필요합니다" : "자동 모드에서는 수동 제어가 비활성화됩니다"}
        </p>
      )}
    </div>
  );
}
