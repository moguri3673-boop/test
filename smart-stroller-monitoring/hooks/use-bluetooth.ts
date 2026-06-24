"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  BLE_DEVICE_NAME,
  STROLLER_SERVICE_UUID,
  SENSOR_CHARACTERISTIC_UUID,
  CONTROL_CHARACTERISTIC_UUID,
  HM10_USES_SINGLE_CHARACTERISTIC,
  CCCD_DESCRIPTOR_UUID,
  BLE_SENSOR_POLL_MS,
  BLE_DEVICE_FILTERS,
  BLE_OPTIONAL_SERVICES,
} from "@/lib/ble-config";
import {
  enqueueGatt,
  gattSettle,
  writeHm10Characteristic,
} from "@/lib/ble-gatt";
import {
  parseSensorLine,
  splitIncomingLines,
  extractLatestSensorReading,
  type SensorData,
} from "@/lib/parse-sensor-line";
import {
  formatBleError,
  isBluetoothUserCancel,
  prefersWideBleScan,
} from "@/lib/ble-errors";

export type { SensorData };

export interface BluetoothState {
  isConnected: boolean;
  isConnecting: boolean;
  isSupported: boolean;
  isSupportReady: boolean;
  isHm10Mode: boolean;
  deviceName: string | null;
  error: string | null;
  sensorData: SensorData;
  hasLiveData: boolean;
}

export interface ConnectOptions {
  /** true면 acceptAllDevices (모바일에서 목록이 비었을 때) */
  wideSearch?: boolean;
}

export interface BluetoothActions {
  connect: (options?: ConnectOptions) => Promise<void>;
  disconnect: () => void;
  sendCommand: (command: string) => Promise<void>;
}

const INITIAL_SENSOR: SensorData = { temperature: 0, roll: 0, pitch: 0 };
const POST_CONNECT_READ_BURST = 6;

/** 화면 디버그 패널 제거 — 개발 시에만 콘솔 로그 */
const BLE_DEV_LOG =
  typeof process !== "undefined" && process.env.NODE_ENV === "development";

function bleLog(_message: string) {
  if (BLE_DEV_LOG) {
    console.debug("[BLE]", _message);
  }
}

function isWebBluetoothAvailable(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.bluetooth !== "undefined"
  );
}

function decodeDataView(value: DataView): string {
  if (value.byteLength === 0) return "";
  return new TextDecoder("utf-8", { fatal: false }).decode(
    value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength)
  );
}

async function requestBleDevice(wideSearch: boolean): Promise<BluetoothDevice> {
  const bluetooth = navigator.bluetooth;
  if (!bluetooth) {
    throw new DOMException("Web Bluetooth 미지원", "NotSupportedError");
  }

  const optionalServices = [...BLE_OPTIONAL_SERVICES];

  if (wideSearch) {
    return bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices,
    });
  }

  return bluetooth.requestDevice({
    filters: BLE_DEVICE_FILTERS,
    optionalServices,
  });
}

async function enableNotifications(
  char: BluetoothRemoteGATTCharacteristic
): Promise<void> {
  try {
    const cccd = await char.getDescriptor(CCCD_DESCRIPTOR_UUID);
    await cccd.writeValue(new Uint8Array([0x01, 0x00]));
  } catch {
    // 일부 펌웨어는 descriptor 없이 startNotifications 만으로 동작
  }
  await char.startNotifications();
}

export function useBluetooth(): [BluetoothState, BluetoothActions] {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isSupportReady, setIsSupportReady] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sensorData, setSensorData] = useState<SensorData>(INITIAL_SENSOR);
  const [hasLiveData, setHasLiveData] = useState(false);

  const deviceRef = useRef<BluetoothDevice | null>(null);
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(
    null
  );
  const rxBufferRef = useRef("");
  const notifyHandlerRef = useRef<((event: Event) => void) | null>(null);
  const disconnectHandlerRef = useRef<(() => void) | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const txInProgressRef = useRef(false);
  const emptyReadCountRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const resetTelemetry = useCallback(() => {
    rxBufferRef.current = "";
    emptyReadCountRef.current = 0;
    setSensorData(INITIAL_SENSOR);
    setHasLiveData(false);
  }, []);

  const applyParsedSensor = useCallback(
    (raw: string, data: SensorData, source: "notify" | "read") => {
      setSensorData(data);
      setHasLiveData(true);
      bleLog(
        `[${source}] ${raw} → T=${data.temperature} R=${data.roll} P=${data.pitch}`
      );
    },
    []
  );

  const processRxChunk = useCallback(
    (chunk: string, byteLength: number, source: "notify" | "read") => {
      if (byteLength > 0) {
        emptyReadCountRef.current = 0;
      } else if (source === "read") {
        emptyReadCountRef.current += 1;
        if (emptyReadCountRef.current === 5) {
          bleLog("read 0B 반복 — 우노→HM-10 UART·AT+NOTI1 확인");
        }
        return;
      }

      if (!chunk) return;

      const { lines, remainder } = splitIncomingLines(
        rxBufferRef.current,
        chunk
      );
      rxBufferRef.current = remainder;

      let parsedAny = false;
      for (const line of lines) {
        const parsed = parseSensorLine(line);
        if (parsed) {
          applyParsedSensor(line, parsed, source);
          parsedAny = true;
        } else if (line.length > 0) {
          bleLog(`[${source}] 명령/비센서: ${line.slice(0, 40)}`);
        }
      }

      if (!parsedAny && remainder.trim()) {
        const fromPartial = parseSensorLine(remainder);
        if (fromPartial) {
          applyParsedSensor(remainder.trim(), fromPartial, source);
          parsedAny = true;
        }
      }

      const stream = lines.join("\n") + (remainder ? `\n${remainder}` : "");
      if (!parsedAny) {
        const latest = extractLatestSensorReading(stream || chunk);
        if (latest) {
          applyParsedSensor(latest.raw, latest.data, source);
        }
      }
    },
    [applyParsedSensor]
  );

  const ingestTextChunk = useCallback(
    (chunk: string, byteLength: number, source: "notify" | "read") => {
      return enqueueGatt(async () => {
        processRxChunk(chunk, byteLength, source);
      });
    },
    [processRxChunk]
  );

  const readCharacteristicOnce = useCallback(async () => {
    const char = characteristicRef.current;
    const device = deviceRef.current;
    if (!char || !device?.gatt?.connected) return;

    return enqueueGatt(async () => {
      try {
        const value = await char.readValue();
        processRxChunk(decodeDataView(value), value.byteLength, "read");
      } catch {
        // read 실패 — notify·다음 폴링에서 재시도
      }
    });
  }, [processRxChunk]);

  const startPolling = useCallback(() => {
    stopPolling();
    void readCharacteristicOnce();
    pollTimerRef.current = setInterval(() => {
      void readCharacteristicOnce();
    }, BLE_SENSOR_POLL_MS);
  }, [readCharacteristicOnce, stopPolling]);

  const teardownGatt = useCallback(async () => {
    stopPolling();

    const char = characteristicRef.current;
    const handler = notifyHandlerRef.current;

    if (char && handler) {
      try {
        char.removeEventListener("characteristicvaluechanged", handler);
        await char.stopNotifications();
      } catch {
        // 이미 끊긴 연결
      }
    }

    const device = deviceRef.current;
    const onDisconnect = disconnectHandlerRef.current;
    if (device && onDisconnect) {
      device.removeEventListener("gattserverdisconnected", onDisconnect);
    }

    characteristicRef.current = null;
    notifyHandlerRef.current = null;
    disconnectHandlerRef.current = null;

    try {
      deviceRef.current?.gatt?.disconnect();
    } catch {
      // ignore
    }
    deviceRef.current = null;
  }, [stopPolling]);

  const handleGattDisconnected = useCallback(() => {
    bleLog("GATT disconnected");
    setIsConnected(false);
    setDeviceName(null);
    void teardownGatt();
  }, [teardownGatt]);

  useEffect(() => {
    setIsSupported(isWebBluetoothAvailable());
    setIsSupportReady(true);
  }, []);

  const connect = useCallback(
    async (options?: ConnectOptions) => {
      if (!isWebBluetoothAvailable()) {
        setError(formatBleError(new DOMException("", "NotSupportedError")));
        return;
      }

      if (isConnecting) return;

      try {
        setIsConnecting(true);
        setError(null);
        resetTelemetry();
        bleLog("연결 시도…");

        await teardownGatt();

        const wideSearch =
          options?.wideSearch ?? prefersWideBleScan();

        bleLog(
          wideSearch
            ? "검색: 전체 BLE"
            : `검색: ${BLE_DEVICE_NAME}, ffe0`
        );

        const device = await requestBleDevice(wideSearch);
        deviceRef.current = device;

        const name = device.name ?? "";
        setDeviceName(name || "알 수 없는 기기");
        bleLog(`선택: ${name || "(이름 없음)"}`);

        const server = device.gatt;
        if (!server) {
          throw new Error("GATT 서버를 사용할 수 없습니다.");
        }

        const gatt = await server.connect();
        bleLog("GATT 연결됨");

        const service = await gatt.getPrimaryService(STROLLER_SERVICE_UUID);
        const sensorChar = await service.getCharacteristic(
          SENSOR_CHARACTERISTIC_UUID
        );
        characteristicRef.current = sensorChar;

        const p = sensorChar.properties;
        bleLog(
          `ffe1: read=${p.read} write=${p.write} notify=${p.notify} wnr=${p.writeWithoutResponse}`
        );

        const onNotify = (event: Event) => {
          const target = event.target as BluetoothRemoteGATTCharacteristic;
          if (!target.value) return;
          void ingestTextChunk(
            decodeDataView(target.value),
            target.value.byteLength,
            "notify"
          );
        };

        notifyHandlerRef.current = onNotify;
        sensorChar.addEventListener("characteristicvaluechanged", onNotify);
        await enableNotifications(sensorChar);
        bleLog("Notify 활성화");

        const onDisconnect = () => handleGattDisconnected();
        disconnectHandlerRef.current = onDisconnect;
        device.addEventListener("gattserverdisconnected", onDisconnect);

        startPolling();

        for (let i = 0; i < POST_CONNECT_READ_BURST; i++) {
          await new Promise((r) => setTimeout(r, BLE_SENSOR_POLL_MS));
          await readCharacteristicOnce();
        }

        setIsConnected(true);
        bleLog("연결 완료");
      } catch (err) {
        if (isBluetoothUserCancel(err)) {
          setError(null);
          bleLog("장치 선택 취소");
        } else {
          const message = formatBleError(err);
          setError(message);
          bleLog(`오류: ${message}`);
        }
        await teardownGatt();
        setIsConnected(false);
        setDeviceName(null);
      } finally {
        setIsConnecting(false);
      }
    },
    [
      isConnecting,
      resetTelemetry,
      teardownGatt,
      ingestTextChunk,
      handleGattDisconnected,
      startPolling,
      readCharacteristicOnce,
    ]
  );

  const disconnect = useCallback(() => {
    bleLog("연결 해제");
    void teardownGatt();
    setIsConnected(false);
    setDeviceName(null);
    setError(null);
    resetTelemetry();
  }, [teardownGatt, resetTelemetry]);

  const sendCommand = useCallback(async (command: string) => {
    const char = characteristicRef.current;
    const device = deviceRef.current;
    if (!char || !device?.gatt?.connected) {
      throw new Error("연결된 characteristic(ffe1)이 없습니다.");
    }

    const trimmed = command.trim();
    const payload = new TextEncoder().encode(
      command.endsWith("\n") || command.endsWith("\r")
        ? command
        : `${command}\r\n`
    );

    return enqueueGatt(async () => {
      txInProgressRef.current = true;
      await gattSettle();

      try {
        await writeHm10Characteristic(char, payload);
        bleLog(`TX OK: ${trimmed}`);
      } catch (err) {
        const message = formatBleError(err);
        bleLog(`TX 실패: ${trimmed} — ${message}`);
        throw new Error(message);
      } finally {
        txInProgressRef.current = false;
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      void teardownGatt();
    };
  }, [teardownGatt]);

  void CONTROL_CHARACTERISTIC_UUID;

  return [
    {
      isConnected,
      isConnecting,
      isSupported,
      isSupportReady,
      isHm10Mode: HM10_USES_SINGLE_CHARACTERISTIC,
      deviceName,
      error,
      sensorData,
      hasLiveData,
    },
    { connect, disconnect, sendCommand },
  ];
}
