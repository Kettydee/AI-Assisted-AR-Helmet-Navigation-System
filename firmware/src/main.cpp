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
HardwareSerial BpiSerial(2); // Hardware UART for Banana Pi M4
BLEServer* pServer = nullptr;
BLECharacteristic* pNavCharacteristic = nullptr;
BLECharacteristic* pHazardCharacteristic = nullptr;

bool deviceConnected = false;

enum class NavigationDirection : uint8_t {
    LEFT = 1,
    RIGHT = 2,
    STRAIGHT = 3,
    U_TURN = 4,
    DESTINATION = 5,
};

enum class AvoidanceDirection : uint8_t {
    CENTER,
    LEFT,
    RIGHT,
};

NavigationDirection currentTurnDirection = NavigationDirection::STRAIGHT;
uint16_t currentTurnDistance = 0;

// Vision Hazard State (from Banana Pi M4)
bool visionAlertActive = false;
unsigned long visionAlertStartTime = 0;
AvoidanceDirection currentAvoidanceDirection = AvoidanceDirection::CENTER;

// GPS State (Banana Pi M4 / SIM7600X, forwarded as "GPS:<lat>:<lon>:<fix>")
bool gpsFixValid = false;
float gpsLatitude = 0.0f;
float gpsLongitude = 0.0f;
unsigned long gpsLastFixTime = 0;

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
        // Compact packet: [direction: 1 byte][distance metres: 2 bytes, big-endian].
        // No display wording or icon data needs to be sent by the phone.
        auto rxValue = pCharacteristic->getValue();
        if (rxValue.length() != 3) {
            Serial.println("Ignored invalid navigation packet (expected 3 bytes).");
            return;
        }

        uint8_t directionId = static_cast<uint8_t>(rxValue[0]);
        if (directionId < static_cast<uint8_t>(NavigationDirection::LEFT) ||
            directionId > static_cast<uint8_t>(NavigationDirection::DESTINATION)) {
            Serial.println("Ignored navigation packet with unknown direction.");
            return;
        }

        currentTurnDirection = static_cast<NavigationDirection>(directionId);
        currentTurnDistance =
            (static_cast<uint16_t>(static_cast<uint8_t>(rxValue[1])) << 8) |
            static_cast<uint8_t>(rxValue[2]);
    }
};

const char* navigationLabel(NavigationDirection direction) {
    switch (direction) {
        case NavigationDirection::LEFT: return "LEFT";
        case NavigationDirection::RIGHT: return "RIGHT";
        case NavigationDirection::STRAIGHT: return "STRAIGHT";
        case NavigationDirection::U_TURN: return "U-TURN";
        case NavigationDirection::DESTINATION: return "DESTINATION";
    }
    return "STRAIGHT";
}

const char* avoidanceLabel(AvoidanceDirection direction) {
    switch (direction) {
        case AvoidanceDirection::LEFT: return "LEFT";
        case AvoidanceDirection::RIGHT: return "RIGHT";
        case AvoidanceDirection::CENTER: return "CENTER";
    }
    return "CENTER";
}

void drawThickLine(int x1, int y1, int x2, int y2) {
    display.drawLine(x1, y1, x2, y2, SSD1306_WHITE);
    display.drawLine(x1 + 1, y1, x2 + 1, y2, SSD1306_WHITE);
    display.drawLine(x1, y1 + 1, x2, y2 + 1, SSD1306_WHITE);
}

void drawDirectionArrow(NavigationDirection direction, int x, int y, int size) {
    int centerX = x + size / 2;
    int centerY = y + size / 2;

    switch (direction) {
        case NavigationDirection::LEFT:
            drawThickLine(centerX, y + size, centerX, centerY);
            drawThickLine(centerX, centerY, x + size / 3, centerY);
            display.fillTriangle(x, centerY, x + size / 3, y,
                                 x + size / 3, y + size, SSD1306_WHITE);
            break;
        case NavigationDirection::RIGHT:
            drawThickLine(centerX, y + size, centerX, centerY);
            drawThickLine(centerX, centerY, x + size * 2 / 3, centerY);
            display.fillTriangle(x + size, centerY, x + size * 2 / 3, y,
                                 x + size * 2 / 3, y + size, SSD1306_WHITE);
            break;
        case NavigationDirection::STRAIGHT:
            drawThickLine(centerX, y + size, centerX, y + size / 3);
            display.fillTriangle(centerX, y, x, y + size / 3, x + size, y + size / 3, SSD1306_WHITE);
            break;
        case NavigationDirection::U_TURN:
            drawThickLine(x + size * 3 / 4, y + size, x + size * 3 / 4, y + size / 3);
            drawThickLine(x + size * 3 / 4, y + size / 3, x + size / 3, y + size / 3);
            drawThickLine(x + size / 3, y + size / 3, x + size / 3, y + size * 2 / 3);
            display.fillTriangle(x + size / 3, y + size, x, y + size * 2 / 3,
                                 x + size * 2 / 3, y + size * 2 / 3, SSD1306_WHITE);
            break;
        case NavigationDirection::DESTINATION:
            drawThickLine(x + size / 4, y, x + size / 4, y + size);
            display.drawRect(x + size / 4, y, size * 3 / 4, size / 2, SSD1306_WHITE);
            display.fillRect(x + size / 4, y, size * 3 / 8, size / 4, SSD1306_WHITE);
            display.fillRect(x + size * 5 / 8, y + size / 4, size * 3 / 8, size / 4, SSD1306_WHITE);
            break;
    }
}

bool parseGpsLine(const String& line, float& lat, float& lon, bool& fix) {
    // Format: "GPS:<lat>:<lon>:<fix>", e.g. "GPS:37.774900:-122.419400:1"
    if (!line.startsWith("GPS:")) {
        return false;
    }
    String rest = line.substring(4);
    int latEnd = rest.indexOf(':');
    int lonEnd = rest.indexOf(':', latEnd + 1);
    if (latEnd < 0 || lonEnd < 0) {
        return false;
    }
    lat = rest.substring(0, latEnd).toFloat();
    lon = rest.substring(latEnd + 1, lonEnd).toFloat();
    fix = rest.substring(lonEnd + 1).toInt() != 0;
    return true;
}

void drawCenteredText(const String& text, int y, uint8_t size) {
    int16_t x1, y1;
    uint16_t width, height;
    display.setTextSize(size);
    display.getTextBounds(text, 0, y, &x1, &y1, &width, &height);
    display.setCursor((SCREEN_WIDTH - width) / 2, y);
    display.print(text);
}

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

void renderHUD(NavigationDirection direction, uint16_t distanceMeters) {
    display.clearDisplay();

    // Small top-right dot confirms a live GPS fix is reaching the ESP32 over UART.
    if (gpsFixValid) {
        display.fillCircle(SCREEN_WIDTH - 4, 4, 2, SSD1306_WHITE);
    }

    // A pothole warning temporarily takes priority over map navigation.
    if (visionAlertActive) {
        display.drawTriangle(2, 12, 8, 1, 14, 12, SSD1306_WHITE);
        display.setTextSize(1);
        display.setCursor(7, 4);
        display.print(F("!"));
        display.setCursor(20, 3);
        display.print(F("POTHOLE"));

        NavigationDirection arrowDirection = NavigationDirection::STRAIGHT;
        if (currentAvoidanceDirection == AvoidanceDirection::LEFT) {
            arrowDirection = NavigationDirection::LEFT;
        } else if (currentAvoidanceDirection == AvoidanceDirection::RIGHT) {
            arrowDirection = NavigationDirection::RIGHT;
        }
        drawDirectionArrow(arrowDirection, 49, 16, 30);
        drawCenteredText(String(avoidanceLabel(currentAvoidanceDirection)), 51, 1);
        display.display();
        return;
    }

    drawDirectionArrow(direction, 50, 1, 28);
    drawCenteredText(String(navigationLabel(direction)), 33, 1);

    if (direction == NavigationDirection::DESTINATION) {
        drawCenteredText(String("ARRIVED"), 49, 1);
    } else {
        drawCenteredText(String(distanceMeters) + " m", 46, 2);
    }
    
    display.display();
}

void setup() {
    Serial.begin(115200);
    Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);

    // Banana Pi BPI-M4 Hardware UART
    BpiSerial.begin(BPI_UART_BAUDRATE, SERIAL_8N1, BPI_UART_RX_PIN, BPI_UART_TX_PIN);

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
    // Read incoming vision alerts + GPS fixes from Banana Pi M4 over UART
    while (BpiSerial.available()) {
        String line = BpiSerial.readStringUntil('\n');
        line.trim();
        if (line.startsWith("POTHOLE_ALERT")) {
            Serial.println("Vision Alert from Banana Pi M4: " + line);
            if (line.startsWith("POTHOLE_ALERT:LEFT:")) {
                currentAvoidanceDirection = AvoidanceDirection::LEFT;
            } else if (line.startsWith("POTHOLE_ALERT:RIGHT:")) {
                currentAvoidanceDirection = AvoidanceDirection::RIGHT;
            } else {
                currentAvoidanceDirection = AvoidanceDirection::CENTER;
            }
            visionAlertActive = true;
            visionAlertStartTime = millis();
            digitalWrite(AUDIO_MUTE_PIN, HIGH); // Auto audio ducking
        } else if (line.startsWith("GPS:")) {
            float lat, lon;
            bool fix;
            if (parseGpsLine(line, lat, lon, fix) && fix) {
                gpsLatitude = lat;
                gpsLongitude = lon;
                gpsFixValid = true;
                gpsLastFixTime = millis();
            }
        }
    }

    // Auto-clear vision alert after timeout
    if (visionAlertActive && (millis() - visionAlertStartTime > VISION_ALERT_DURATION_MS)) {
        visionAlertActive = false;
        digitalWrite(AUDIO_MUTE_PIN, LOW); // Restore audio
    }

    // Drop a stale GPS fix so the HUD indicator reflects a lost signal
    if (gpsFixValid && (millis() - gpsLastFixTime > GPS_FIX_TIMEOUT_MS)) {
        gpsFixValid = false;
    }

    // Render HUD navigation overlay
    renderHUD(currentTurnDirection, currentTurnDistance);

    // Push-To-Talk input check
    if (digitalRead(PUSH_TO_TALK_PIN) == LOW) {
        Serial.println("PTT Pressed: Activating phone voice assistant");
        delay(300); // Debounce
    }

    delay(50);
}
