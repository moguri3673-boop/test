"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { BluetoothStatus } from "./bluetooth-status";
import { MonitoringCard } from "./monitoring-card";
import { ModeSwitch } from "./mode-switch";
import { ControlButtons } from "./control-buttons";
import { TemperatureSlider } from "./temperature-slider";
import { useBluetooth } from "@/hooks/use-bluetooth";
import { log } from "console";

// 명령어 정의 (하드웨어 프로토콜에 맞게 수정)
const COMMANDS = {
  FAN_ON: "FAN:ON",
  FAN_OFF: "FAN:OFF",
  HEATER_ON: "HEATER:ON",
  HEATER_OFF: "HEATER:OFF",
  SET_MODE_AUTO: "MODE:AUTO",
  SET_MODE_MANUAL: "MODE:MANUAL",
  SET_MIN: (temp: number) => `SET_MIN:${temp.toFixed(1)}`,
  SET_MAX: (temp: number) => `SET_MAX:${temp.toFixed(1)}`,
};

/** 우노+HM-10 펌웨어가 실제로 처리하는 명령만 BLE로 전송 */
function isHm10SupportedCommand(command: string): boolean {
  const c = command.trim();

  console.log("c: ", c);
  return c.startsWith("SET_MIN:") || c.startsWith("SET_MAX:");
}

export function StrollerDashboard() {
  const [bluetoothState, bluetoothActions] = useBluetooth();

  const [isAutoMode, setIsAutoMode] = useState(true);
  const [fanOn, setFanOn] = useState(false);
  const [heaterOn, setHeaterOn] = useState(false);
  const [autoHeaterOnBelow, setAutoHeaterOnBelow] = useState(18);
  const [autoFanOnAbove, setAutoFanOnAbove] = useState(28);
  const [hasVibratedForCurrentDanger, setHasVibratedForCurrentDanger] =
    useState(false);

  const setMinDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setMaxDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendHm10Command = useCallback(
    async (command: string) => {
      if (!bluetoothState.isConnected) return;
      if (
        bluetoothState.isHm10Mode &&
        !isHm10SupportedCommand(command)
      ) {
        return;
      }
      await bluetoothActions.sendCommand(command);
    },
    [
      bluetoothState.isConnected,
      bluetoothState.isHm10Mode,
      bluetoothActions,
    ]
  );

  // 연결 안됐을 때 보여줄 기본값
  const displayTemperature = bluetoothState.isConnected
    ? bluetoothState.sensorData.temperature
    : 0;
  const displayRoll = bluetoothState.isConnected
    ? bluetoothState.sensorData.roll
    : 0;
  const displayPitch = bluetoothState.isConnected
    ? bluetoothState.sensorData.pitch
    : 0;
  const isRollDanger = bluetoothState.isConnected && Math.abs(displayRoll) >= 20;
  const isPitchSlope = bluetoothState.isConnected && Math.abs(displayPitch) >= 20;

  const autoStatus = isAutoMode
    ? fanOn
      ? {
          text: "현재 설정 온도 유지를 위해 쿨링팬 가동 중 ❄️",
          tone: "fan" as const,
        }
      : heaterOn
      ? {
          text: "현재 설정 온도 유지를 위해 필름히터 가동 중 🔥",
          tone: "heater" as const,
        }
      : {
          text: "적정 온도가 유지되고 있습니다 ✨",
          tone: "idle" as const,
        }
    : {
        text: "",
        tone: "idle" as const,
      };

  // 모드 변경 핸들러
  const handleModeChange = useCallback(
    async (autoMode: boolean) => {
      setIsAutoMode(autoMode);

      if (bluetoothState.isConnected) {
        try {
          await sendHm10Command(
            autoMode ? COMMANDS.SET_MODE_AUTO : COMMANDS.SET_MODE_MANUAL
          );
        } catch (err) {
          console.error("모드 변경 명령 전송 실패:", err);
        }
      }
    },
    [bluetoothState.isConnected, sendHm10Command]
  );

  // 팬 제어 핸들러
  const handleFanToggle = useCallback(
    async (on: boolean) => {
      setFanOn(on);

      if (bluetoothState.isConnected) {
        try {
          await sendHm10Command(on ? COMMANDS.FAN_ON : COMMANDS.FAN_OFF);
        } catch (err) {
          console.error("팬 제어 명령 전송 실패:", err);
        }
      }
    },
    [bluetoothState.isConnected, sendHm10Command]
  );

  // 히터 제어 핸들러
  const handleHeaterToggle = useCallback(
    async (on: boolean) => {
      setHeaterOn(on);

      if (bluetoothState.isConnected) {
        try {
          await sendHm10Command(on ? COMMANDS.HEATER_ON : COMMANDS.HEATER_OFF);
        } catch (err) {
          console.error("히터 제어 명령 전송 실패:", err);
        }
      }
    },
    [bluetoothState.isConnected, sendHm10Command]
  );

  const handleHeaterThresholdChange = useCallback(
    (temp: number) => {
      setAutoHeaterOnBelow(temp);
      if (!bluetoothState.isConnected) return;

      if (setMinDebounceRef.current) {
        clearTimeout(setMinDebounceRef.current);
      }
      setMinDebounceRef.current = window.setTimeout(() => {
        void sendHm10Command(COMMANDS.SET_MIN(temp)).catch((err) => {
          console.error("히터 기준 온도 전송 실패:", err);
        });
      }, 500);
    },
    [bluetoothState.isConnected, sendHm10Command]
  );

  const handleFanThresholdChange = useCallback(
    (temp: number) => {
      setAutoFanOnAbove(temp);
      if (!bluetoothState.isConnected) return;

      if (setMaxDebounceRef.current) {
        clearTimeout(setMaxDebounceRef.current);
      }
      setMaxDebounceRef.current = window.setTimeout(() => {
        void sendHm10Command(COMMANDS.SET_MAX(temp)).catch((err) => {
          console.error("팬 기준 온도 전송 실패:", err);
        });
      }, 500);
    },
    [bluetoothState.isConnected, sendHm10Command]
  );

  // 연결 5초 후 온도 기준 동기화 (SET_MIN → SET_MAX 순차 전송)
  useEffect(() => {
    if (!bluetoothState.isConnected) return;

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          await sendHm10Command(COMMANDS.SET_MIN(autoHeaterOnBelow));
          await new Promise((r) => setTimeout(r, 400));
          await sendHm10Command(COMMANDS.SET_MAX(autoFanOnAbove));
        } catch (err) {
          console.error("온도 기준 동기화 실패:", err);
        }
      })();
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [bluetoothState.isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  // 사용자 설정값 기준: 히터 기준 미만이면 히터 ON, 팬 기준 초과면 팬 ON
  useEffect(() => {
    if (!bluetoothState.isConnected) return;
    if (!isAutoMode) return;

    if (displayTemperature > autoFanOnAbove) {
      setFanOn(true);
      setHeaterOn(false);
      return;
    }

    if (displayTemperature < autoHeaterOnBelow) {
      setFanOn(false);
      setHeaterOn(true);
      return;
    }

    setFanOn(false);
    setHeaterOn(false);
  }, [bluetoothState.isConnected, isAutoMode, displayTemperature, autoHeaterOnBelow, autoFanOnAbove]);

  // 좌우 기울기 위험 시 빨간 UI 유지 + 0.5초 간격 3회 진동
  useEffect(() => {
    if (!isRollDanger) {
      setHasVibratedForCurrentDanger(false);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(0);
      }
      return;
    }

    if (hasVibratedForCurrentDanger) return;

    setHasVibratedForCurrentDanger(true);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([500, 500, 500, 500, 500]);
    }
  }, [isRollDanger, hasVibratedForCurrentDanger]);

  // 연결 해제 시 상태 초기화
  useEffect(() => {
    if (!bluetoothState.isConnected) {
      setFanOn(false);
      setHeaterOn(false);
      setHasVibratedForCurrentDanger(false);
    }
  }, [bluetoothState.isConnected]);

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isRollDanger ? "bg-red-600" : "bg-background"
      }`}
    >
      <div className="mx-auto max-w-md px-4 py-6 pb-10">
        {isPitchSlope && !isRollDanger && (
          <p className="mb-3 text-right text-xs font-medium text-amber-600">
            경사로 주행 중
          </p>
        )}

        {isRollDanger && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center shadow-sm">
            <p className="text-sm font-bold text-red-700">전복 위험! 즉시 자세를 바로잡아 주세요</p>
            <p className="mt-1 text-xs text-red-600">
              좌우 기울기 {displayRoll.toFixed(1)}° 감지됨 (20° 이상 위험)
            </p>
          </div>
        )}

        {/* Header */}
        <header className="mb-6 text-center">
          <h1 className={`text-xl font-bold ${isRollDanger ? "text-red-50" : "text-foreground"}`}>
            스마트 유모차 모니터
          </h1>
          <p
            className={`mt-1 text-sm ${
              isRollDanger ? "text-red-100" : "text-muted-foreground"
            }`}
          >
            모니터링 및 제어 시스템
          </p>
        </header>

        {/* Bluetooth Status */}
        <BluetoothStatus
          isConnected={bluetoothState.isConnected}
          isConnecting={bluetoothState.isConnecting}
          isSupported={bluetoothState.isSupported}
          isSupportReady={bluetoothState.isSupportReady}
          hasLiveData={bluetoothState.hasLiveData}
          deviceName={bluetoothState.deviceName}
          error={bluetoothState.error}
          onConnect={() => bluetoothActions.connect()}
          onDisconnect={bluetoothActions.disconnect}
        />

        {/* Temperature & Tilt Monitoring Card */}
        <MonitoringCard
          temperature={displayTemperature}
          roll={displayRoll}
          pitch={displayPitch}
          isConnected={bluetoothState.isConnected}
          hasLiveData={bluetoothState.hasLiveData}
        />

        {/* Mode Switch */}
        <ModeSwitch
          isAutoMode={isAutoMode}
          onModeChange={handleModeChange}
          autoStatusText={autoStatus.text}
          autoStatusTone={autoStatus.tone}
        />

        {/* Manual Control Buttons */}
        <ControlButtons
          isAutoMode={isAutoMode}
          fanOn={fanOn}
          heaterOn={heaterOn}
          onFanToggle={handleFanToggle}
          onHeaterToggle={handleHeaterToggle}
          disabled={!bluetoothState.isConnected}
        />

        {/* Target Temperature Slider */}
        <TemperatureSlider
          isAutoMode={isAutoMode}
          autoHeaterOnBelow={autoHeaterOnBelow}
          autoFanOnAbove={autoFanOnAbove}
          onAutoHeaterOnBelowChange={handleHeaterThresholdChange}
          onAutoFanOnAboveChange={handleFanThresholdChange}
          disabled={!bluetoothState.isConnected}
        />

        {/* Connection Info */}
        {!bluetoothState.isConnected && (
          <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              블루투스 장치를 연결하면
              <br />
              실시간 모니터링이 시작됩니다
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
