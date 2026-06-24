/*
 * Arduino Uno + HM-10 (BLE) — 웹앱 호환 샘플
 *
 * 웹앱 수신 포맷 (둘 중 하나):
 *   1) 온도,roll,pitch\n           예: 24.5,1.2,15.4
 *   2) 내부온,습,외부온,습,roll,pitch\n  (6필드, 앱이 1·5·6번 사용)
 *
 * HM-10 ↔ Uno: SoftwareSerial 또는 Serial(3,4핀 등) 보드레이트 9600/115200 동일
 * HM-10 기본 UUID: ffe0 / ffe1 (웹앱과 동일)
 */

#include <SoftwareSerial.h>
#include <DHT.h>

#define DHT_PIN 23        // Uno는 23 없음 → 실제 핀으로 변경 (예: 7)
#define FAN_PIN 19        // Uno는 19 없음 → 실제 핀으로 변경 (예: 8)
#define HEATER_PIN 18     // Uno는 18 없음 → 실제 핀으로 변경 (예: 9)
#define HM10_RX 2
#define HM10_TX 3

#define DHTTYPE DHT11

DHT dht(DHT_PIN, DHTTYPE);
SoftwareSerial hm10(HM10_RX, HM10_TX);

bool isAutoMode = true;
float autoHeaterBelow = 20.0f;
float autoFanAbove = 25.0f;

unsigned long lastSend = 0;
const unsigned long SEND_MS = 500;

void setup() {
  Serial.begin(115200);
  hm10.begin(9600);  // HM-10 AT+BAUD? 와 동일하게

  pinMode(FAN_PIN, OUTPUT);
  pinMode(HEATER_PIN, OUTPUT);
  digitalWrite(FAN_PIN, LOW);
  digitalWrite(HEATER_PIN, LOW);

  dht.begin();
  Serial.println("Uno + HM-10 ready");
}

void loop() {
  // 앱 → 우노 명령 (한 줄)
  if (hm10.available()) {
    String cmd = hm10.readStringUntil('\n');
    cmd.trim();
    if (cmd == "MODE:AUTO") isAutoMode = true;
    else if (cmd == "MODE:MANUAL") isAutoMode = false;
    else if (!isAutoMode) {
      if (cmd == "FAN:ON") { digitalWrite(FAN_PIN, HIGH); digitalWrite(HEATER_PIN, LOW); }
      else if (cmd == "FAN:OFF") digitalWrite(FAN_PIN, LOW);
      else if (cmd == "HEATER:ON") { digitalWrite(HEATER_PIN, HIGH); digitalWrite(FAN_PIN, LOW); }
      else if (cmd == "HEATER:OFF") digitalWrite(HEATER_PIN, LOW);
    }
  }

  float temp = dht.readTemperature();
  if (isnan(temp)) temp = 0.0f;

  // 데모: roll/pitch (BNO055 없으면 0)
  float roll = 0.0f;
  float pitch = 0.0f;

  if (isAutoMode) {
    if (temp > autoFanAbove) {
      digitalWrite(FAN_PIN, HIGH);
      digitalWrite(HEATER_PIN, LOW);
    } else if (temp < autoHeaterBelow) {
      digitalWrite(FAN_PIN, LOW);
      digitalWrite(HEATER_PIN, HIGH);
    } else {
      digitalWrite(FAN_PIN, LOW);
      digitalWrite(HEATER_PIN, LOW);
    }
  }

  if (millis() - lastSend >= SEND_MS) {
    lastSend = millis();
    // 웹앱 3필드 포맷
    hm10.print(temp, 1);
    hm10.print(",");
    hm10.print(roll, 1);
    hm10.print(",");
    hm10.print(pitch, 1);
    hm10.print("\n");
  }
}
