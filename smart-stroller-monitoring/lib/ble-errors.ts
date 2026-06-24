/** 사용자가 기기 선택 창에서 취소한 경우 */
export function isBluetoothUserCancel(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false;
  return error.name === "NotFoundError" || error.name === "AbortError";
}

/**
 * 모바일(안드로이드 Chrome 등)에서는 acceptAllDevices가 목록 표시에 유리한 경우가 많음
 */
export function prefersWideBleScan(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function formatBleError(error: unknown): string {
  if (error instanceof DOMException) {
    switch (error.name) {
      case "NotFoundError":
        return (
          "블루투스 장치를 찾지 못했거나 선택을 취소했습니다. " +
          "HM-10 전원·페어링 LED를 확인한 뒤 다시 연결해 주세요."
        );
      case "SecurityError":
        return (
          "Bluetooth 권한이 거부되었습니다. " +
          "HTTPS(또는 localhost)에서 접속했는지, Chrome 위치·근처 기기 권한을 허용했는지 확인해 주세요."
        );
      case "NetworkError":
        return (
          "연결이 끊어졌습니다. HM-10이 멀리 있거나 절전 모드일 수 있습니다. " +
          "모듈 전원을 껐다 켠 뒤 다시 연결해 주세요."
        );
      case "InvalidStateError":
        return "이미 연결 중이거나 GATT 상태가 올바르지 않습니다. 연결 해제 후 다시 시도해 주세요.";
      case "NotSupportedError":
        return "이 브라우저 또는 기기는 Web Bluetooth를 지원하지 않습니다. Android Chrome을 사용해 주세요.";
      default:
        return error.message || `Bluetooth 오류 (${error.name})`;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "알 수 없는 Bluetooth 오류가 발생했습니다.";
}
