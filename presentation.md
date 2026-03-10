# 🌱 Smart Plant Monitoring System — Presentation Guide

> **Project Idea:** Cloud-Based IoT Plant Health Monitor  
> **Course:** 1st Year — MDP (Multidisciplinary Project)

---

## 📌 Slide 1 — Title Slide

**Smart Plant Monitoring System**  
_Real-time IoT-based plant health tracking with cloud analytics and SMS alerts_

- Team members 
- VIT Chennai — 1st Year MDP Project  
- Tech Stack: ESP32 · DHT22 · Soil Sensor · LDR · OLED · Supabase · React · Twilio SMS

---

## 📌 Slide 2 — Problem Statement

- Indoor plants die due to **irregular watering** and **unmonitored conditions**
- Manual checking of soil moisture, temperature, and light is tedious and unreliable
- No easy way to get **instant alerts** when a plant is in distress
- Existing systems are expensive or limited to a single metric

**Goal:** Build an affordable, cloud-connected monitoring system that tracks multiple environmental parameters and sends **SMS alerts** to the owner in real-time.

---

## 📌 Slide 3 — Objectives

1. Monitor **soil moisture**, **temperature**, **humidity**, and **light intensity** in real-time
2. Store sensor data in a **cloud database** (Supabase / PostgreSQL)
3. Provide a **live web dashboard** with charts, trend analysis, and health scoring
4. Send **Twilio SMS alerts** when sensor values cross critical thresholds
5. Generate **daily health reports** with weather-aware recommendations
6. Use **ML-based pattern analysis** (trend detection, anomaly detection, cycle detection)

---

## 📌 Slide 4 — System Architecture

```
┌───────────────────────┐            ┌──────────────────────────┐          ┌────────────────────┐
│    SENSOR LAYER       │            │     CLOUD BACKEND        │          │   USER INTERFACE   │
├───────────────────────┤            ├──────────────────────────┤          ├────────────────────┤
│                       │            │                          │          │                    │
│  ESP32 Dev Board      │  HTTP POST │  Supabase PostgreSQL     │  REST +  │  React Dashboard   │
│  + DHT22 (Temp/Hum)   │──(30s)────▶│  ┌────────────────────┐ │  SSE     │  ┌──────────────┐  │
│  + Soil Moisture Probe│            │  │   readings table   │ │─────────▶│  │ Live Charts  │  │
│  + LDR (Light)        │            │  │   alerts table      │ │          │  │ Health Score │  │
│  + OLED Display       │            │  └────────────────────┘ │          │  │ Predictions  │  │
│  Local live display   │            │                          │          │  │ Alerts List  │  │
│  for on-device status │            │  Edge Functions (Deno)   │          │  └──────────────┘  │
└───────────────────────┘            │  ┌────────────────────┐ │          └────────────────────┘
                                     │  │ soil_alert         │ │
                                     │  │ daily_report       │ │
                                     │  └────────────────────┘ │
                                     └──────────┬───────────────┘
                                                │
                                     ┌──────────▼───────────────┐
                                     │   EXTERNAL SERVICES      │
                                     ├──────────────────────────┤
                                     │  📱 Twilio SMS Alerts    │
                                     │  🌦️ OpenWeatherMap API   │
                                     └──────────────────────────┘
```

---

## 📌 Slide 5 — Data Flow Diagram

```
 ┌──────────┐     ┌──────────────┐     ┌───────────────────┐     ┌──────────────┐
 │  Sensors │────▶│  HTTP POST   │────▶│  Supabase DB      │────▶│  Dashboard   │
 │ (ESP32)  │     │  /readings   │     │  (PostgreSQL)     │     │  (React App) │
 └──────────┘     └──────────────┘     └────────┬──────────┘     └──────────────┘
                                                │
                                       ┌────────▼──────────┐
                                       │  Edge Function    │
                                       │  (soil_alert)     │
                                       └────────┬──────────┘
                                                │
                                  ┌─────────────┼─────────────┐
                                  ▼             ▼             ▼
                           ┌───────────┐ ┌───────────┐ ┌────────────┐
                           │ alerts DB │ │ Twilio    │ │ Dashboard  │
                           │  table    │ │ SMS       │ │ Real-time  │
                           └───────────┘ └───────────┘ └────────────┘
```

---

## 📌 Slide 6 — Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Hardware** | ESP32, DHT22, Soil Sensor, LDR, OLED | Collect and display live environmental data |
| **Embedded Firmware** | ESP32 Wi-Fi + sensor polling + HTTP client | Read sensors and push real-world values to Supabase |
| **Database** | Supabase (PostgreSQL) | Cloud storage with real-time subscriptions |
| **Backend** | Deno Edge Functions | Serverless alert processing & report generation |
| **Frontend** | React 18 + TypeScript + Vite | Interactive dashboard with live charts |
| **Charts** | Chart.js + react-chartjs-2 | Time-series visualizations |
| **Alerts** | Twilio SMS API | Instant SMS notifications to owner |
| **Weather** | OpenWeatherMap API | Weather-aware plant care recommendations |
| **Deployment** | Vercel (frontend), Supabase Cloud (backend) | Production hosting |
| **Security** | JWT, Row-Level Security, API keys | Data protection |

---

## 📌 Slide 7 — Database Design

### Entity-Relationship Diagram

```
┌─────────────────────────────┐          ┌─────────────────────────────────┐
│         readings            │          │           alerts                │
├─────────────────────────────┤          ├─────────────────────────────────┤
│ id         SERIAL (PK)     │◀────┐    │ id           SERIAL (PK)       │
│ soil       INTEGER          │     └────│ reading_id   INTEGER (FK)      │
│ light      INTEGER          │          │ type         VARCHAR(50)       │
│ temp       REAL             │          │ severity     VARCHAR(20)       │
│ humidity   REAL             │          │ message      TEXT              │
│ timestamp  TIMESTAMPTZ      │          │ triggered_at TIMESTAMPTZ       │
└─────────────────────────────┘          └─────────────────────────────────┘

Relationship: alerts.reading_id → readings.id (Many-to-One)
Security: Both tables have Row-Level Security (RLS) enabled
```

---

## 📌 Slide 8 — Sensor Thresholds (Snake Plant Optimized)

| Sensor | Critical Low | Warning Low | Optimal Range | Warning High | Critical High |
|--------|-------------|-------------|---------------|-------------|--------------|
| 🌊 Soil Moisture | < 5% | < 10% | 10–80% | > 80% | — |
| 🌡️ Temperature | < 10°C | < 15°C | 15–29°C | > 35°C | > 40°C |
| 💡 Light | — | < 5% | 10–80% | — | > 90% |
| 💨 Humidity | — | < 30% | 30–50% | > 80% | — |

**Alert severities:** `critical` → `warning` → `info`  
**Cooldown:** 30-minute cooldown per alert type to prevent notification spam

---

## 📌 Slide 9 — SMS Alert System (Twilio)

### How Alerts Work

```
1. New sensor reading inserted into database
         │
         ▼
2. soil_alert Edge Function triggered
         │
         ▼
3. Compare values against thresholds
         │
    ┌────┴────┐
    │ NORMAL  │──▶ No action
    └─────────┘
    ┌────────────┐
    │ THRESHOLD  │──▶ Check cooldown (30 min)
    │ EXCEEDED   │         │
    └────────────┘    ┌────┴────┐
                      │COOLDOWN │──▶ Skip (already notified)
                      └─────────┘
                      ┌─────────┐
                      │  SEND   │──▶ Save alert to DB
                      │         │──▶ Send Twilio SMS to owner
                      └─────────┘
```

### Example SMS Message
```
🚨 PLANT ALERT: Soil moisture critically low (3%)!
Water your Bird's Nest Snake Plant immediately.
— Smart Plant Monitor
```

---

## 📌 Slide 10 — Dashboard Features

### 1. Real-Time Stats Cards
- Temperature, Soil Moisture, Light, Humidity
- Trend badges (↑ rising / ↓ falling / → stable)

### 2. Health Score Indicator
- 0–100% score based on all sensor values
- Color-coded: Green (> 70%) → Yellow (40–70%) → Red (< 40%)
- Contextual tips for each health level

### 3. Interactive Charts
- 24-hour time-series line charts per sensor
- Multi-metric overlay chart
- Radar chart for system health overview
- 6-hour prediction chart

### 4. ML Pattern Analysis
- **Trend Detection** — Linear regression on recent values
- **Daily Cycle Detection** — Hourly pattern analysis (peak/low hours)
- **Anomaly Detection** — Z-score statistical analysis
- **AI Insights** — Plant-specific recommendations combining all signals

### 5. Weather Integration
- Live weather from OpenWeatherMap
- Weather-aware watering recommendations

### 6. Predictions Panel
- Predicted temperature and soil moisture (next hour)
- Watering recommendation (Yes / No / No!)

---

## 📌 Slide 11 — Hardware Prototype

### Physical Components

| Component | Role in System |
|-----------|----------------|
| **ESP32 Dev Board** | Main controller with Wi-Fi connectivity |
| **DHT22 Sensor** | Measures temperature and humidity |
| **Soil Moisture Sensor** | Measures soil water content |
| **LDR / Light Sensor** | Measures ambient light intensity |
| **OLED Display** | Shows live values and device status locally |
| **Breadboard + Jumper Wires** | Hardware integration and prototyping |

### Hardware Workflow

1. Sensors capture real-time environmental values from the plant setup
2. ESP32 reads each sensor and formats the reading packet
3. OLED displays current temperature, humidity, soil, and light values
4. ESP32 uploads readings to Supabase over Wi-Fi at regular intervals
5. Dashboard and SMS alert pipeline react to real hardware data

- Demonstrates a complete end-to-end IoT prototype, not just simulated input
- Supports live testing by changing the actual plant environment
- Useful for classroom demo because both the OLED and dashboard update together

---

## 📌 Slide 12 — Edge Functions (Serverless)

### soil_alert (Deno)
- Triggered on new readings
- Evaluates 7 threshold conditions
- 30-minute cooldown prevents alert spam
- Sends SMS via Twilio API
- Logs all alerts to database

### daily_report (Deno)
- Fetches last 24 hours of data
- Calculates avg / min / max / trend per sensor
- Integrates weather data from OpenWeatherMap
- Generates health assessment report
- Returns structured JSON + markdown report

---

## 📌 Slide 13 — Security Measures

| Measure | Implementation |
|---------|---------------|
| **Row-Level Security** | Enabled on `readings` and `alerts` tables |
| **JWT Authentication** | Supabase tokens for API access |
| **API Key Management** | Anon key (read-only) vs Service Role key (write) |
| **Environment Variables** | Secrets stored in `.env`, not hardcoded |
| **Edge Function Auth** | `verify_jwt = true` in Supabase config |
| **CORS** | Configured via Supabase and Vercel |

---

## 📌 Slide 14 — Deployment Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION SETUP                           │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────┐      ┌───────────────────────┐                  │
│  │   Vercel     │      │   Supabase Cloud      │                  │
│  │  (Frontend)  │◀────▶│                       │                  │
│  │              │      │  PostgreSQL Database   │                  │
│  │  React App   │      │  Edge Functions (Deno) │                  │
│  │  Vite Build  │      │  Real-time Engine      │                  │
│  │  CDN + SSL   │      │  REST API + Auth       │                  │
│  └──────────────┘      └───────────┬───────────┘                  │
│                                    │                               │
│                         ┌──────────▼──────────┐                   │
│                         │  External Services  │                   │
│                         │  • Twilio (SMS)     │                   │
│                         │  • OpenWeatherMap   │                   │
│                         └─────────────────────┘                   │
│                                                                    │
│  Live URL: https://smartplantmonitoringsystem.vercel.app/          │
└────────────────────────────────────────────────────────────────────┘
```

---

## 📌 Slide 15 — Demo Walkthrough

### Steps to Demo

1. **Power on the hardware prototype** — ESP32, sensors, and OLED start showing live values
2. **Explain the sensor board** — Point out DHT22, soil moisture sensor, LDR, OLED, and ESP32 connections
3. **Open the dashboard** — Show the same real-world readings appearing in the web app
4. **Change the environment live** — Touch the DHT22, shade the LDR, or vary soil moisture to show sensor response
5. **Watch alerts trigger** — SMS received on phone and the alert appears on the dashboard
6. **Show the OLED + cloud sync** — Demonstrate that local display and cloud dashboard stay aligned
7. **Highlight analytics** — Health score, trends, anomaly detection, and daily report flow

---

## 📌 Slide 16 — Results & Outcomes

- **Real-time monitoring** with 30-second refresh cycle
- **< 2 second latency** from sensor reading to dashboard update
- **SMS alerts** delivered within seconds of threshold breach
- **30-minute cooldown** eliminates notification spam
- **ML predictions** for next-hour temperature and soil moisture
- **Weather-aware** watering recommendations
- Successfully validated with **live hardware readings** from the ESP32 sensor board and OLED display

---

## 📌 Slide 17 — Future Enhancements

| Enhancement | Description |
|-------------|-------------|
| **Multi-Plant Support** | Monitor multiple plants with individual profiles |
| **Mobile App** | React Native companion app |
| **Camera Integration** | Visual health assessment via plant photos |
| **Automated Watering** | Relay/pump control via ESP32 GPIO |
| **Historical Analytics** | Weekly/monthly trend reports |
| **Voice Alerts** | Integration with Google Assistant / Alexa |
| **Solar Power** | Solar-powered sensor node |

---

## 📌 Slide 18 — Conclusion

The **Smart Plant Monitoring System** demonstrates a complete IoT pipeline:

> **Sensors → Cloud Database → Serverless Processing → Web Dashboard → SMS Alerts**

Key achievements:
- End-to-end cloud-native architecture
- Real-time data pipeline with intelligent alert processing
- ML-powered insights and predictions
- Scalable deployment on Vercel + Supabase
- Affordable and extensible design

---

## 📎 References

- Supabase Documentation — https://supabase.com/docs
- Twilio SMS API — https://www.twilio.com/docs/sms
- OpenWeatherMap API — https://openweathermap.org/api
- Chart.js — https://www.chartjs.org/
- React — https://react.dev/
- Vite — https://vitejs.dev/
- Deno — https://deno.land/
- ESP32 — https://www.espressif.com/en/products/socs/esp32
