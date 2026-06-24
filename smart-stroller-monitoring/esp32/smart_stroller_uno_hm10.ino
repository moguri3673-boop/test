/*
 * Arduino Uno + HM-10 + DHT22 + MPU6050
 * 웹앱 포맷: "온도,roll,pitch\r\n"
 */

#include <Wire.h>
#include <DHT.h>
#include <SoftwareSerial.h>

// 핀 설정
#define BT_RX_PIN        2   // HM-10 블루투스 TX ➡️ 우노 2번
#define BT_TX_PIN        3   // HM-10 블루투스 RX ➡️ 우노 3번
#define DHT_INSIDE_PIN   5   // 흰색 DHT22 데이터 핀 ➡️ 우노 5번
#define HEATER_PIN       6   // 히터 온열 시트 릴레이 IN ➡️ 우노 6번
#define FAN_PIN          7   // 쿨링팬 릴레이 IN ➡️ 우노 7번

#define DHTTYPE DHT22
DHT dhtInside(DHT_INSIDE_PIN, DHTTYPE);
SoftwareSerial bleSerial(BT_RX_PIN, BT_TX_PIN);

// MPU6050 6축 센서 I2C 고유 주소 (검증된 고정 주소 사용)
const int MPU_ADDR = 0x68;

// 자이로 센서 데이터 저장 변수
int16_t AcX, AcY, AcZ, Tmp, GyX, GyY, GyZ;

// 상보필터 및 각도 계산용 변수
float accAngleX, accAngleY;
float roll = 0, pitch = 0;
unsigned long prevTime = 0;

// 앱에서 설정할 목표 온도 범위 기본값
float targetMaxTemp = 28.0;
float targetMinTemp = 18.0;

// 블루투스 전송 주기 제어용 타이머 변수 (0.5초 간격)
unsigned long lastBleSendMs = 0;
const unsigned long BLE_SEND_INTERVAL_MS = 500;

void setup() {
  Serial.begin(9600);
  bleSerial.begin(9600);
  Wire.begin();
  Wire.setClock(100000L); // I2C 느리게 → SoftwareSerial( HM-10 ) 간섭 줄임

  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B);
  Wire.write(0);
  Wire.endTransmission(true);

  pinMode(FAN_PIN, OUTPUT);
  pinMode(HEATER_PIN, OUTPUT);

  digitalWrite(FAN_PIN, LOW);
  digitalWrite(HEATER_PIN, LOW);

  dhtInside.begin();
  prevTime = millis();

  Serial.println(F("===================================="));
  Serial.println(F("   반려견 스마트 유모차 가동 (6축)   "));
  Serial.println(F("   웹앱 양방향 연동 모드 활성화 완료  "));
  Serial.println(F("===================================="));
}

void loop() {
  bleSerial.listen(); // SoftwareSerial HM-10 우선

  if (bleSerial.available()) {
    String rxValue = bleSerial.readStringUntil('\n');
    rxValue.trim();

    if (rxValue.length() > 0) {
      Serial.print(F("▶ 앱 수신 명령: "));
      Serial.println(rxValue);

      if (rxValue.startsWith("SET_MAX:")) {
        targetMaxTemp = rxValue.substring(8).toFloat();
        Serial.print(F("-> [완료] 상한 온도 변경: "));
        Serial.println(targetMaxTemp);
      } else if (rxValue.startsWith("SET_MIN:")) {
        targetMinTemp = rxValue.substring(8).toFloat();
        Serial.print(F("-> [완료] 하한 온도 변경: "));
        Serial.println(targetMinTemp);
      }
    }
  }

  float tempIn = dhtInside.readTemperature();
  if (isnan(tempIn)) tempIn = 0.0;

  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 14, true);

  AcX = Wire.read() << 8 | Wire.read();
  AcY = Wire.read() << 8 | Wire.read();
  AcZ = Wire.read() << 8 | Wire.read();
  Tmp = Wire.read() << 8 | Wire.read();
  GyX = Wire.read() << 8 | Wire.read();
  GyY = Wire.read() << 8 | Wire.read();
  GyZ = Wire.read() << 8 | Wire.read();

  unsigned long currentTime = millis();
  float dt = (currentTime - prevTime) / 1000.0;
  prevTime = currentTime;

  if (dt <= 0 || dt > 0.2) dt = 0.02;

  accAngleX = atan2(AcY, AcZ) * 180 / PI;
  accAngleY = atan2(-AcX, sqrt(pow(AcY, 2) + pow(AcZ, 2))) * 180 / PI;

  float gyroRateX = GyX / 131.0;
  float gyroRateY = GyY / 131.0;

  roll = 0.96 * (roll + gyroRateX * dt) + 0.04 * accAngleX;
  pitch = 0.96 * (pitch + gyroRateY * dt) + 0.04 * accAngleY;

  if (tempIn >= targetMaxTemp) {
    digitalWrite(FAN_PIN, HIGH);
    digitalWrite(HEATER_PIN, LOW);
  } else if (tempIn <= targetMinTemp) {
    digitalWrite(FAN_PIN, LOW);
    digitalWrite(HEATER_PIN, HIGH);
  } else {
    digitalWrite(FAN_PIN, LOW);
    digitalWrite(HEATER_PIN, LOW);
  }

  unsigned long now = millis();
  if (now - lastBleSendMs >= BLE_SEND_INTERVAL_MS) {
    lastBleSendMs = now;

    float absRoll = abs(roll);
    float absPitch = abs(pitch);

    bleSerial.print(tempIn, 1);
    bleSerial.print(',');
    bleSerial.print(absRoll, 1);
    bleSerial.print(',');
    bleSerial.print(absPitch, 1);
    bleSerial.print("\r\n");
    bleSerial.flush(); // HM-10으로 전송 완료 대기

    Serial.print(F("[USB 모니터] 온도: "));
    Serial.print(tempIn, 1);
    Serial.print(F("°C | 설정: "));
    Serial.print(targetMinTemp, 0);
    Serial.print(F("~"));
    Serial.print(targetMaxTemp, 0);
    Serial.print(F("°C | R: "));
    Serial.print(absRoll, 1);
    Serial.print(F(" P: "));
    Serial.println(absPitch, 1);
  }

  delay(20);
}
