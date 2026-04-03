#include "esp32-hal-adc.h"
#include "esp32-hal.h"
#include "freertos/projdefs.h"
#include <cmath>
#include <freertos/FreeRTOS.h>
#include <Arduino.h>
#include <MQ135.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <BLE2902.h>
#include <string>
#include <DHTesp.h>
#define MQ135_PIN1 32
#define DHT_PIN 25
#define SERVICE_UUID           "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHARACTERISTIC_UUID_RX "62216f56-9f93-4948-b42d-bcd763812c37"
#define PPM_CHARACTERISTIC_UUID_TX "6269b0bb-4c37-4095-84a6-e20d591c5501"
#define TEMP_CHARACTERISTIC_UUID_TX "43ebd405-99d1-43eb-9bf9-5fa6b1662c4e"
#define HUMIDITY_CHARACTERISTIC_UUID_TX "8c3c69b4-60ed-41a1-ae6c-8ca3ab436f51"
#define RZERO  38.68

//MQ135 mq135(MQ135_PIN1,38.68);
MQ135 mq135(MQ135_PIN1, RZERO);

void ppm_data_task(void* ptr);
void ble_task(void* ptr);
DHTesp dht;



BLECharacteristic *ppmTxCharacteristic = nullptr;
float ppmValue = 0;
BLECharacteristic *humidityTxCharacteristic = nullptr;
float humidityValue = 0;
BLECharacteristic *temperatureTxCharacteristic = nullptr;
float tempValue = 0;
bool deviceConnected = false;
bool oldDeviceConnected = false;

class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *pServer) override {
    deviceConnected = true;
    Serial.println("Client connected");
  }

  void onDisconnect(BLEServer *pServer) override {
    deviceConnected = false;
    Serial.println("Client disconnected");
  }
};

class MyCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) override {
      std::string rxValue = pCharacteristic->getValue();
    if (rxValue.length() > 0) {
      Serial.print("Received: ");
      Serial.println(rxValue.c_str());
    }
  }
};


void setup (){
    disableCore0WDT();
    disableCore1WDT();
    Serial.begin(115200);
    Serial.println("Starting");
    analogReadResolution(10);
    dht.setup(DHT_PIN, DHTesp::DHT11);
    BLEDevice::init("ESP32_UART_BLE");
    BLEServer *pServer = BLEDevice::createServer();
    pServer->setCallbacks(new MyServerCallbacks());

    BLEService *pService = pServer->createService(SERVICE_UUID);

    ppmTxCharacteristic = pService->createCharacteristic(
        PPM_CHARACTERISTIC_UUID_TX,
        BLECharacteristic::PROPERTY_NOTIFY
    );
    ppmTxCharacteristic->addDescriptor(new BLE2902());

    humidityTxCharacteristic= pService->createCharacteristic(
        HUMIDITY_CHARACTERISTIC_UUID_TX,
        BLECharacteristic::PROPERTY_NOTIFY
    );
    humidityTxCharacteristic->addDescriptor(new BLE2902());
    temperatureTxCharacteristic= pService->createCharacteristic(
        TEMP_CHARACTERISTIC_UUID_TX,
        BLECharacteristic::PROPERTY_NOTIFY
    );
    temperatureTxCharacteristic->addDescriptor(new BLE2902());

    BLECharacteristic *pRxCharacteristic = pService->createCharacteristic(
        CHARACTERISTIC_UUID_RX, BLECharacteristic::PROPERTY_WRITE
    );
    pRxCharacteristic->setCallbacks(new MyCallbacks());

    pService->start();
    pServer->getAdvertising()->start();
    xTaskCreate(ppm_data_task, "ppm_data_task", 6000, nullptr, 1, nullptr);

    Serial.println("Starting tasks");
    delay(500);
    xTaskCreate(ble_task, "ble_task",5000, nullptr, 1, nullptr);

}


void ppm_data_task(void* ptr){
    for(;;){
        float ppm = mq135.getPPM();
        float rzero = mq135.getRZero();
        if (!std::isnan(ppm)){
            ppmValue = ppm;
        }
        Serial.print("1: PPM: ");
        Serial.print(ppm);
        Serial.print("RZero: ");
        Serial.println(rzero);
        TempAndHumidity val = dht.getTempAndHumidity();
        if (!std::isnan(val.humidity)){
            humidityValue = val.humidity;
        }
        if (!std::isnan(val.temperature)){
            tempValue = val.temperature;
        }
        if (dht.getStatus() == 0) {
            Serial.printf("Temp: %f C | Humidity: %f %%\n",val.temperature,val.humidity);
        } else {
            Serial.print("DHT11 read failed: ");
            Serial.println(dht.getStatusString());
        }
        vTaskDelay(pdMS_TO_TICKS(1500));

    }
}

void ble_task(void* ptr){
    for(;;){
        if (deviceConnected) {
            Serial.println("Sending value 1");
            uint8_t *bp = reinterpret_cast<uint8_t*>(&ppmValue);
            ppmTxCharacteristic->setValue(bp, 4);
            ppmTxCharacteristic->notify();

            uint8_t *bh = reinterpret_cast<uint8_t*>(&tempValue);
            temperatureTxCharacteristic->setValue(bh, 4);
            temperatureTxCharacteristic->notify();

            uint8_t *bt = reinterpret_cast<uint8_t*>(&humidityValue);
            humidityTxCharacteristic->setValue(bt, 4);
            humidityTxCharacteristic->notify();
            vTaskDelay(pdMS_TO_TICKS(1000));
        }

        if (!deviceConnected && oldDeviceConnected) {
            vTaskDelay(pdMS_TO_TICKS(500));
            BLEDevice::startAdvertising();
            Serial.println("Advertising");
            oldDeviceConnected = false;
        }

        if (deviceConnected && !oldDeviceConnected) {
            oldDeviceConnected = true;
        }
    }
}
void loop(){
}
