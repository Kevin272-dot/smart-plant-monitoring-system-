# CHAPTER 3: METHODOLOGY

## 3.1 System Design Overview
The proposed methodology focuses on a deeply decoupled, highly responsive Internet of Things (IoT) architecture designed for real-time botanical telemetry. The core design involves an embedded edge sensor layer for continuous environmental data acquisition, a scalable serverless cloud backend for secure data storage, and an interactive React-based frontend dashboard for visualizing plant health heuristics.

## 3.2 Hardware Architecture
The physical hardware relies upon low-cost, highly efficient embedded components. It strictly incorporates high-precision probes including a DHT22 (temperature and humidity), an analog soil moisture sensor, and a Light Dependent Resistor (LDR), all seamlessly interfaced with an ESP32 development board. This edge node natively aggregates the physical-world data and mirrors it on a local OLED display.

## 3.3 Software Architecture

## 3.4 Communication Protocol
To ensure rapid telemetry persistence, the ESP32 firmware relies on a standardized an 802.11 Wi-Fi stack. It constructs lightweight JSON payloads and transmits them sequentially via HTTP POST requests to the remote Supabase REST API every 30 seconds. To deliver zero-latency updates to the end user, the React web dashboard maintains an active Server-Sent Events (SSE) connection with the PostgreSQL backend.
