/** 아두이노 전송 형식: `온도,roll,pitch` + 줄바꿈(\n 또는 \r\n) */
export interface SensorData {
  temperature: number;
  roll: number;
  pitch: number;
}

const SENSOR_LINE_RE =
  /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;

/** 한 줄 파싱 — 3필드 `온도,roll,pitch` 전용 (실패 시 null) */
export function parseSensorLine(line: string): SensorData | null {
  const text = line.trim().replace(/\r/g, "");
  if (!text) return null;

  // 앱→우노 명령 에코는 센서값이 아님
  if (
    text.startsWith("SET_") ||
    text.startsWith("FAN:") ||
    text.startsWith("HEATER:") ||
    text.startsWith("MODE:")
  ) {
    return null;
  }

  const direct = SENSOR_LINE_RE.exec(text);
  if (direct) {
    const temperature = Number.parseFloat(direct[1]);
    const roll = Number.parseFloat(direct[2]);
    const pitch = Number.parseFloat(direct[3]);
    if (isValidSensorTriple(temperature, roll, pitch)) {
      return { temperature, roll, pitch };
    }
    return null;
  }

  // 호환: 6필드 구형 포맷
  const parts = text.split(",").map((p) => p.trim());
  if (parts.length >= 6) {
    const temperature = Number.parseFloat(parts[0]);
    const roll = Number.parseFloat(parts[4]);
    const pitch = Number.parseFloat(parts[5]);
    if (isValidSensorTriple(temperature, roll, pitch)) {
      return { temperature, roll, pitch };
    }
  }

  return null;
}

function isValidSensorTriple(
  temperature: number,
  roll: number,
  pitch: number
): boolean {
  return (
    Number.isFinite(temperature) &&
    Number.isFinite(roll) &&
    Number.isFinite(pitch)
  );
}

export interface RxLineResult {
  lines: string[];
  remainder: string;
}

/**
 * notify/read 청크를 줄 단위로 분리.
 * 불완전한 마지막 줄은 remainder에 보관해 다음 청크와 이어 붙임.
 */
export function splitIncomingLines(
  buffer: string,
  chunk: string
): RxLineResult {
  if (!chunk) {
    return { lines: [], remainder: buffer };
  }

  const combined = (buffer + chunk).replace(/\0/g, "");
  const parts = combined.split(/\r?\n/);
  const remainder = parts.pop() ?? "";
  const lines = parts.map((l) => l.trim()).filter(Boolean);
  return { lines, remainder };
}

/** 버퍼에 쌓인 텍스트에서 가장 최근 유효 센서값 (폴링 read용) */
export function extractLatestSensorReading(
  text: string
): { raw: string; data: SensorData } | null {
  if (!text) return null;

  const cleaned = text.replace(/\0/g, "");
  const { lines, remainder } = splitIncomingLines("", cleaned);
  const candidates = [...lines];
  if (remainder.trim()) {
    const fromPartial = parseSensorLine(remainder);
    if (fromPartial) {
      return { raw: remainder.trim(), data: fromPartial };
    }
  }

  let last: { raw: string; data: SensorData } | null = null;
  for (const line of candidates) {
    const parsed = parseSensorLine(line);
    if (parsed) {
      last = { raw: line, data: parsed };
    }
  }
  if (last) return last;

  // 줄바꿈 없이 붙어 오는 청크 (HM-10 read/notify)
  const re =
    /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/g;
  let match: RegExpExecArray | null = null;
  let lastMatch: RegExpExecArray | null = null;
  while ((match = re.exec(cleaned)) !== null) {
    if (match[0].includes("SET_")) continue;
    lastMatch = match;
  }
  if (lastMatch) {
    const data: SensorData = {
      temperature: Number.parseFloat(lastMatch[1]),
      roll: Number.parseFloat(lastMatch[2]),
      pitch: Number.parseFloat(lastMatch[3]),
    };
    if (isValidSensorTriple(data.temperature, data.roll, data.pitch)) {
      return { raw: lastMatch[0], data };
    }
  }

  return null;
}
