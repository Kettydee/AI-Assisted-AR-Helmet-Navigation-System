#pragma once

#include <Arduino.h>

// I2C Bus Pins (OLED, MPU6050, BH1750)
#define I2C_SDA_PIN 21
#define I2C_SCL_PIN 22

// UART GPS Pins (NEO-6M)
#define GPS_RX_PIN 16
#define GPS_TX_PIN 17
#define GPS_BAUDRATE 9600

// Display Parameters
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define OLED_I2C_ADDR 0x3C

// Audio & Controls
#define PUSH_TO_TALK_PIN 4
#define AUDIO_MUTE_PIN 5

// Hazard & Fall Detection Thresholds
#define POTHOLE_Z_THRESHOLD 2.5f    // in G's
#define CRASH_DECEL_THRESHOLD 4.0f  // in G's
#define TILT_ROLL_THRESHOLD 60.0f   // in degrees

// Banana Pi BPI-M4 Vision UART Pins
#define BPI_UART_RX_PIN 18
#define BPI_UART_TX_PIN 19
#define BPI_UART_BAUDRATE 115200
#define VISION_ALERT_DURATION_MS 3000

// Banana Pi M4 also forwards SIM7600X GPS fixes on the same UART as
// "GPS:<lat>:<lon>:<fix>" (see vision-ai/gps_sim7600x.py --serial-out).
// A fix older than this is treated as lost.
#define GPS_FIX_TIMEOUT_MS 5000
