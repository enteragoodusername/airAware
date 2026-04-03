// ---- Configuration & BLE UUIDs ----
const SERVICE_UUID  = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const CHAR_PPM      = '6269b0bb-4c37-4095-84a6-e20d591c5501';
const CHAR_TEMP     = '43ebd405-99d1-43eb-9bf9-5fa6b1662c4e';
const CHAR_HUMIDITY = '8c3c69b4-60ed-41a1-ae6c-8ca3ab436f51';

const BLE_OPTIONS = {
    filters: [
        { name: "ESP32_UART_BLE" },
        { services: [SERVICE_UUID] }
    ],
    optionalServices: [SERVICE_UUID]
};
