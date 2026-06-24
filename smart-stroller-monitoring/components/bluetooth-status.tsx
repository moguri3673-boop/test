"use client";

import { Bluetooth, BluetoothOff, BluetoothSearching, Loader2 } from "lucide-react";

interface BluetoothStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
  isSupported: boolean;
  isSupportReady: boolean;
  hasLiveData?: boolean;
  deviceName: string | null;
  error: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function BluetoothStatus({
  isConnected,
  isConnecting,
  isSupported,
  isSupportReady,
  hasLiveData = false,
  deviceName,
  error,
  onConnect,
  onDisconnect,
}: BluetoothStatusProps) {
  const handleClick = () => {
    if (isConnected) {
      onDisconnect();
    } else if (!isConnecting) {
      onConnect();
    }
  };

  if (!isSupportReady) {
    return (
      <div className="mb-4 flex flex-col items-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2.5 text-sm font-medium text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Bluetooth 확인 중...</span>
        </div>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="mb-4 flex flex-col items-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">
          <BluetoothOff className="h-4 w-4" />
          <span>브라우저가 Bluetooth를 지원하지 않습니다</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Android Chrome을 사용해 주세요
        </p>
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-col items-center gap-2">
      <button
        onClick={handleClick}
        disabled={isConnecting}
        className={`
          inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium
          transition-all duration-300 ease-in-out
          disabled:cursor-not-allowed disabled:opacity-70
          ${
            isConnected
              ? "bg-accent text-accent-foreground shadow-md shadow-accent/30"
              : isConnecting
              ? "bg-primary/80 text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }
        `}
        aria-label={
          isConnected
            ? "Bluetooth 연결됨 - 클릭하여 해제"
            : isConnecting
            ? "연결 중..."
            : "Bluetooth 연결하기"
        }
      >
        {isConnecting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>장치 검색 중...</span>
          </>
        ) : isConnected ? (
          <>
            <Bluetooth className="h-4 w-4" />
            <span>{deviceName || "연결됨"}</span>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-foreground/60 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-foreground"></span>
            </span>
          </>
        ) : (
          <>
            <BluetoothSearching className="h-4 w-4" />
            <span>장치 연결하기</span>
          </>
        )}
      </button>

      {isConnected && (
        <p className="text-center text-xs text-muted-foreground">
          {hasLiveData ? "실시간 수신 중" : "센서 데이터 대기 중"}
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {!isConnected && !isConnecting && !error && (
        <p className="text-center text-xs text-muted-foreground">
          버튼을 눌러 <strong className="font-medium">HMSoft</strong> 장치를
          선택하세요
        </p>
      )}
    </div>
  );
}
