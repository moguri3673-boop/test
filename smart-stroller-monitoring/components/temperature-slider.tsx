"use client";

import { Target, Minus, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

interface TemperatureSliderProps {
  isAutoMode: boolean;
  autoHeaterOnBelow: number;
  autoFanOnAbove: number;
  onAutoHeaterOnBelowChange: (temp: number) => void;
  onAutoFanOnAboveChange: (temp: number) => void;
  disabled?: boolean;
}

export function TemperatureSlider({
  isAutoMode,
  autoHeaterOnBelow,
  autoFanOnAbove,
  onAutoHeaterOnBelowChange,
  onAutoFanOnAboveChange,
  disabled = false,
}: TemperatureSliderProps) {
  const isEnabled = isAutoMode && !disabled;
  const minTemp = 15;
  const maxTemp = 35;
  const gap = 0.5;

  const handleHeaterDecrement = () => {
    if (autoHeaterOnBelow > minTemp) {
      onAutoHeaterOnBelowChange(Number((autoHeaterOnBelow - 0.5).toFixed(1)));
    }
  };

  const handleHeaterIncrement = () => {
    const next = Number((autoHeaterOnBelow + 0.5).toFixed(1));
    if (next <= autoFanOnAbove - gap) {
      onAutoHeaterOnBelowChange(next);
    }
  };

  const handleFanDecrement = () => {
    const next = Number((autoFanOnAbove - 0.5).toFixed(1));
    if (next >= autoHeaterOnBelow + gap) {
      onAutoFanOnAboveChange(next);
    }
  };

  const handleFanIncrement = () => {
    if (autoFanOnAbove < maxTemp) {
      onAutoFanOnAboveChange(Number((autoFanOnAbove + 0.5).toFixed(1)));
    }
  };

  return (
    <Card
      className={`border-0 bg-card shadow-sm transition-opacity duration-300 ${
        !isEnabled ? "pointer-events-none opacity-50" : ""
      }`}
    >
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-accent/10 p-2">
              <Target className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">자동 제어 온도 설정</p>
              <p className="text-xs text-muted-foreground">히터/쿨링팬 작동 기준</p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">히터 작동 시작 (미만)</p>
            <p className="text-sm font-bold text-orange-600">{autoHeaterOnBelow.toFixed(1)}°C</p>
          </div>
          <Slider
            value={[autoHeaterOnBelow]}
            onValueChange={([value]) =>
              onAutoHeaterOnBelowChange(Number(Math.min(value, autoFanOnAbove - gap).toFixed(1)))
            }
            min={minTemp}
            max={maxTemp}
            step={0.5}
            disabled={!isEnabled}
            className="w-full"
          />
          <div className="mt-3 flex items-center justify-center gap-4">
            <button
              onClick={handleHeaterDecrement}
              disabled={!isEnabled || autoHeaterOnBelow <= minTemp}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-sm transition-all hover:bg-secondary/80 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="히터 기준 감소"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              onClick={handleHeaterIncrement}
              disabled={!isEnabled || autoHeaterOnBelow >= autoFanOnAbove - gap}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm transition-all hover:bg-accent/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="히터 기준 증가"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mb-2">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">쿨링팬 작동 시작 (초과)</p>
            <p className="text-sm font-bold text-blue-600">{autoFanOnAbove.toFixed(1)}°C</p>
          </div>
          <Slider
            value={[autoFanOnAbove]}
            onValueChange={([value]) =>
              onAutoFanOnAboveChange(Number(Math.max(value, autoHeaterOnBelow + gap).toFixed(1)))
            }
            min={minTemp}
            max={maxTemp}
            step={0.5}
            disabled={!isEnabled}
            className="w-full"
          />
          <div className="mt-3 flex items-center justify-center gap-4">
            <button
              onClick={handleFanDecrement}
              disabled={!isEnabled || autoFanOnAbove <= autoHeaterOnBelow + gap}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-sm transition-all hover:bg-secondary/80 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="팬 기준 감소"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              onClick={handleFanIncrement}
              disabled={!isEnabled || autoFanOnAbove >= maxTemp}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm transition-all hover:bg-accent/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="팬 기준 증가"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex justify-between text-xs text-muted-foreground">
          <span>{minTemp}°C</span>
          <span>0.5°C 단위 조절</span>
          <span>{maxTemp}°C</span>
        </div>

        {!isEnabled && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            {disabled
              ? "블루투스 연결이 필요합니다"
              : "자동 모드에서만 자동 제어 온도를 설정할 수 있습니다"}
          </p>
        )}
      </div>
    </Card>
  );
}
