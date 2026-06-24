#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BNO055.h>
#include <utility/imumaths.h>
#include <DHT.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// 1) Pin and sensor setup
#define DHTPIN 23
#define DHTTYPE DHT11
#define FAN_PIN 19
#define HEATER_PIN 18

// 2) BLE UUIDs (must match web app)
static const char *SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb";
static const char *SENSOR_CHAR_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb";   // notify/read
static const char *CONTROL_CHAR_UUID = "0000ffe2-0000-1000-8000-00805f9b34fb";  // write

// 3) Objects
DHT dht(DHTPIN, DHTTYPE);
Adafruit_BNO055 bno = Adafruit_BNO055(55);

BLEServer *pServer = nullptr;
BLECharacteristic *pSensorChar = nullptr;
BLECharacteristic *pControlChar = nullptr;
BLEAdvertising *pAdvertising = nullptr;

// 4) Runtime state
bool deviceConnected = false;
bool isAutoMode = true;
bool fanOn = false;
bool heaterOn = false;
float targetTemp = 25.0f;

unsigned long lastSendMs = 0;
const unsigned long SEND_INTERVAL_MS = 500;  // 0.5s

// Safety threshold
const float ROLL_DANGER_DEG = 20.0f;

void applyActuatorState(bool nextFanOn, bool nextHeaterOn) {
  fanOn = nextFanOn;
  heaterOn = nextHeaterOn;

  digitalWrite(FAN_PIN, fanOn ? HIGH : LOW);
  digitalWrite(HEATER_PIN, heaterOn ? HIGH : LOW);
}

void stopAllActuators() {
  applyActuatorState(false, false);
}

// BLE server connect/disconnect callbacks
class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *server) override {
    deviceConnected = true;
    Serial.println("[BLE] Client connected");
  }

  void onDisconnect(BLEServer *server) override {
    deviceConnected = false;
    Serial.println("[BLE] Client disconnected, restart advertising...");
    server->startAdvertising();
  }
};

// App -> ESP32 command callbacks
class ControlCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *characteristic) override {
    std::string raw = characteristic->getValue();
    if (raw.empty()) return;

    String cmd = String(raw.c_str());
    cmd.trim();

    Serial.print("[BLE CMD] ");
    Serial.println(cmd);

    if (cmd == "MODE:AUTO") {
      isAutoMode = true;
      return;
    }

    if (cmd == "MODE:MANUAL") {
      isAutoMode = false;
      return;
    }

    // Manual controls (only in manual mode)
    if (!isAutoMode) {
      if (cmd == "FAN:ON") {
        applyActuatorState(true, false);
        return;
      }
      if (cmd == "FAN:OFF") {
        applyActuatorState(false, heaterOn);
        return;
      }
      if (cmd == "HEATER:ON") {
        applyActuatorState(false, true);
        return;
      }
      if (cmd == "HEATER:OFF") {
        applyActuatorState(fanOn, false);
        return;
      }
    }

    // TEMP:24.5
    if (cmd.startsWith("TEMP:")) {
      String tempText = cmd.substring(5);
      float parsed = tempText.toFloat();
      if (parsed > 0.0f) {
        targetTemp = parsed;
        Serial.print("[AUTO] targetTemp updated: ");
        Serial.println(targetTemp);
      }
    }
  }
};

void setupBLE() {
  BLEDevice::init("Smart_Stroller_ESP32");

  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  pSensorChar = pService->createCharacteristic(
      SENSOR_CHAR_UUID,
      BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  pSensorChar->addDescriptor(new BLE2902());

  pControlChar = pService->createCharacteristic(
      CONTROL_CHAR_UUID,
      BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
  pControlChar->setCallbacks(new ControlCallbacks());

  pService->start();

  pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  pServer->startAdvertising();

  Serial.println("[BLE] Advertising started");
}

void setup() {
  Serial.begin(115200);

  dht.begin();

  if (!bno.begin()) {
    Serial.println("BNO055 init failed. Check wiring.");
    while (true) {
      delay(1000);
    }
  }
  bno.setExtCrystalUse(true);

  pinMode(FAN_PIN, OUTPUT);
  pinMode(HEATER_PIN, OUTPUT);
  stopAllActuators();

  setupBLE();
}

void loop() {
  sensors_event_t event;
  bno.getEvent(&event);

  const float roll = event.orientation.z;
  const float pitch = event.orientation.y;
  const float absRoll = abs(roll);
  const float absPitch = abs(pitch);
  const float currentTemp = dht.readTemperature();

  // 1) Safety first: rollover danger => force shutdown
  const bool isEmergency = absRoll >= ROLL_DANGER_DEG;
  if (isEmergency) {
    stopAllActuators();
  }

  // 2) AUTO logic when safe
  if (!isEmergency && isAutoMode && !isnan(currentTemp)) {
    if (currentTemp > targetTemp + 1.0f) {
      applyActuatorState(true, false);
    } else if (currentTemp < targetTemp - 1.0f) {
      applyActuatorState(false, true);
    } else {
      stopAllActuators();
    }
  }

  // 3) Send data every 0.5s: "temp,roll,pitch\n"
  const unsigned long now = millis();
  if (now - lastSendMs >= SEND_INTERVAL_MS && !isnan(currentTemp)) {
    lastSendMs = now;

    char payload[64];
    snprintf(payload, sizeof(payload), "%.1f,%.1f,%.1f\n", currentTemp, absRoll, absPitch);

    pSensorChar->setValue((uint8_t *)payload, strlen(payload));
    if (deviceConnected) {
      pSensorChar->notify();
    }

    Serial.print("[TX] ");
    Serial.print(payload);
    Serial.print(" | mode=");
    Serial.print(isAutoMode ? "AUTO" : "MANUAL");
    Serial.print(" fan=");
    Serial.print(fanOn ? "ON" : "OFF");
    Serial.print(" heater=");
    Serial.println(heaterOn ? "ON" : "OFF");
  }

  delay(20);
}
