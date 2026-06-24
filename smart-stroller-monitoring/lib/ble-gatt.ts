/** Web Bluetooth GATT 작업을 한 번에 하나만 실행 (read/write 충돌 방지) */

let gattChain: Promise<void> = Promise.resolve();

export function enqueueGatt<T>(task: () => Promise<T>): Promise<T> {
  const run = gattChain.then(task, task);
  gattChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

const GATT_SETTLE_MS = 80;

export function gattSettle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, GATT_SETTLE_MS));
}

type GattChar = BluetoothRemoteGATTCharacteristic;

/**
 * HM-10 ffe1: Android Chrome은 보통 write(응답 있음)가 안정적.
 * 실패 시 writeWithoutResponse 재시도.
 */
export async function writeHm10Characteristic(
  char: GattChar,
  payload: BufferSource
): Promise<void> {
  const props = char.properties;
  const errors: unknown[] = [];

  if (props.write) {
    try {
      await char.writeValue(payload);
      return;
    } catch (e) {
      errors.push(e);
    }
  }

  if (
    props.writeWithoutResponse &&
    typeof char.writeValueWithoutResponse === "function"
  ) {
    try {
      await char.writeValueWithoutResponse(payload);
      return;
    } catch (e) {
      errors.push(e);
    }
  }

  if (errors.length === 0) {
    throw new Error("ffe1에 write / writeWithoutResponse 속성이 없습니다.");
  }

  throw errors[errors.length - 1];
}
