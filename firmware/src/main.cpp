#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include "config.h"

// Hardware Instances
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
BLEServer* pServer = nullptr;
BLECharacteristic* pNavCharacteristic = nullptr;
BLECharacteristic* pHazardCharacteristic = nullptr;

bool deviceConnected = false;
String currentTurnPrompt = "SEARCHING...";
int currentTurnDistance = 0;

// BLE Service UUIDs
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define NAV_CHAR_UUID       "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define HAZARD_CHAR_UUID    "1c95d5e3-d8f7-413a-bf3d-7a2e5d7be87e"

class ServerCallbacks : public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) override {
        deviceConnected = true;
    }
    void onDisconnect(BLEServer* pServer) override {
        deviceConnected = false;
        pServer->startAdvertising();
    }
};

class NavDataCallback : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic* pCharacteristic) override {
        String rxValue = pCharacteristic->getValue().c_str();
        if (rxValue.length() > 0) {
            currentTurnPrompt = rxValue;
        }
    }
};

void initDisplay() {
    if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_I2C_ADDR)) {
        Serial.println(F("SSD1306 allocation failed"));
        for (;;);
    }
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(10, 20);
    display.println(F("AR HUD Initializing..."));
    display.display();
}

void renderHUD(const String& direction, int distanceMeters) {
    display.clearDisplay();
    
    // Top status bar
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.print(deviceConnected ? F("[BLE CONNECTED]") : F("[BLE SEARCHING]"));
    
    // Main turn indicator
    display.setTextSize(2);
    display.setCursor(10, 20);
    display.print(direction);

    // Distance indicator
    display.setTextSize(1);
    display.setCursor(10, 48);
    display.printf("in %d m", distanceMeters);
    
    display.display();
}

void setup() {
    Serial.begin(115200);
    Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);

    pinMode(PUSH_TO_TALK_PIN, INPUT_PULLUP);
    pinMode(AUDIO_MUTE_PIN, OUTPUT);
    digitalWrite(AUDIO_MUTE_PIN, LOW);

    initDisplay();

    // Initialize BLE
    BLEDevice::init("AR-Helmet-Nav");
    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new ServerCallbacks());

    BLEService* pService = pServer->createService(SERVICE_UUID);

    pNavCharacteristic = pService->createCharacteristic(
        NAV_CHAR_UUID,
        BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE
    );
    pNavCharacteristic->setCallbacks(new NavDataCallback());

    pHazardCharacteristic = pService->createCharacteristic(
        HAZARD_CHAR_UUID,
        BLECharacteristic::PROPERTY_NOTIFY
    );
    pHazardCharacteristic->addDescriptor(new BLE2902());

    pService->start();
    BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    BLEDevice::startAdvertising();

    Serial.println("AR Helmet BLE Server ready.");
}

void loop() {
    // Render HUD navigation overlay
    renderHUD(currentTurnPrompt, currentTurnDistance);

    // Push-To-Talk input check
    if (digitalRead(PUSH_TO_TALK_PIN) == LOW) {
        Serial.println("PTT Pressed: Activating phone voice assistant");
        delay(300); // Debounce
    }

    delay(100);
}
