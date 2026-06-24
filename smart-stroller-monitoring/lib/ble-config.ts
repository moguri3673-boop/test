/** HM-10 / HMSoft 모듈 (UART BLE) */

export const BLE_DEVICE_NAME = "HMSoft";

/** 서비스 UUID — HM-10 기본 UART 서비스 */
export const STROLLER_SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb";

/** 특성 UUID — 센서 수신·명령 송신 공통 (ffe1) */
export const SENSOR_CHARACTERISTIC_UUID =
  "0000ffe1-0000-1000-8000-00805f9b34fb";

export const CONTROL_CHARACTERISTIC_UUID = SENSOR_CHARACTERISTIC_UUID;

export const HM10_USES_SINGLE_CHARACTERISTIC = true;

/** Client Characteristic Configuration (notify 활성화) */
export const CCCD_DESCRIPTOR_UUID = "00002902-0000-1000-8000-00805f9b34fb";

/** 아두이노 전송 주기와 맞춘 read 폴링(ms) */
export const BLE_SENSOR_POLL_MS = 500;

/**
 * requestDevice filters — HMSoft + FFE0 우선
 * (모바일에서 목록이 비면 connect({ wideSearch: true }) 사용)
 */
export const BLE_DEVICE_FILTERS: BluetoothLEScanFilter[] = [
  { name: BLE_DEVICE_NAME },
  { namePrefix: BLE_DEVICE_NAME },
  { namePrefix: "HM" },
  { services: [STROLLER_SERVICE_UUID] },
];

export const BLE_OPTIONAL_SERVICES = [STROLLER_SERVICE_UUID] as const;
