"use client";

import { Thermometer, MoveHorizontal, MoveVertical } from "lucide-react";
import { Card } from "@/components/ui/card";

interface MonitoringCardProps {
  temperature: number;
  roll: number;
  pitch: number;
  isConnected?: boolean;
  hasLiveData?: boolean;
}

export function MonitoringCard({
  temperature,
  roll,
  pitch,
  isConnected = false,
  hasLiveData = false,
}: MonitoringCardProps) {
  const showValues = isConnected && hasLiveData;
  return (
    <Card className="mb-6 overflow-hidden border-0 bg-primary shadow-xl">
      <div className="relative p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />

        <div className="relative z-10">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-lg bg-primary-foreground/10 p-2">
              <Thermometer className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium text-primary-foreground/80">
              실시간 모니터링
            </span>
          </div>

          <div className="flex items-end justify-between">
            <div className="flex-1">
              {showValues ? (
                <>
                  <div className="flex items-baseline">
                    <span className="text-6xl font-bold tracking-tight text-primary-foreground">
                      {temperature.toFixed(1)}
                    </span>
                    <span className="ml-1 text-2xl font-medium text-primary-foreground/70">
                      °C
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-primary-foreground/60">
                    유모차 내부 온도
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-baseline">
                    <span className="text-5xl font-bold tracking-tight text-primary-foreground/50">
                      --.-
                    </span>
                    <span className="ml-1 text-2xl font-medium text-primary-foreground/30">
                      °C
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-primary-foreground/40">
                    {isConnected ? "데이터 수신 대기 중" : "연결 대기 중"}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-primary-foreground/10 p-3 backdrop-blur-sm">
              <div className="mb-1 flex items-center gap-2">
                <MoveHorizontal className="h-4 w-4 text-primary-foreground/80" />
                <span className="text-xs text-primary-foreground/70">좌우 기울기 (Roll)</span>
              </div>
              <p className="text-2xl font-bold text-primary-foreground">
                {showValues ? roll.toFixed(1) : isConnected ? "--.-" : "--.-"}
                <span className="ml-1 text-base font-medium text-primary-foreground/70">°</span>
              </p>
            </div>

            <div className="rounded-xl bg-primary-foreground/10 p-3 backdrop-blur-sm">
              <div className="mb-1 flex items-center gap-2">
                <MoveVertical className="h-4 w-4 text-primary-foreground/80" />
                <span className="text-xs text-primary-foreground/70">앞뒤 기울기 (Pitch)</span>
              </div>
              <p className="text-2xl font-bold text-primary-foreground">
                {showValues ? pitch.toFixed(1) : isConnected ? "--.-" : "--.-"}
                <span className="ml-1 text-base font-medium text-primary-foreground/70">°</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
