# 🌱 Smart Plant Monitoring System

A cloud-based IoT solution for monitoring plant health using environmental sensors, real-time analytics, and intelligent alerts.

![Version](https://img.shields.io/badge/version-2.0.0-green)
![Platform](https://img.shields.io/badge/platform-ESP32%20%7C%20Supabase-blue)
![License](https://img.shields.io/badge/license-MIT-orange)

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Configuration](#%EF%B8%8F-configuration)
- [Usage](#-usage)
- [API Reference](#-api-reference)
- [Project Structure](#-project-structure)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🌡️ **Real-time Monitoring** | Track temperature, humidity, soil moisture, and light intensity |
| 📊 **Analytics Dashboard** | Beautiful web dashboard with charts and predictions |
| 🚨 **Intelligent Alerts** | Smart notifications with cooldown to prevent spam |
| 📈 **Trend Analysis** | Identify rising/falling patterns in sensor data |
| 🌦️ **Weather Integration** | Weather-aware watering recommendations |
| 📱 **SMS Notifications** | Instant alerts via Twilio SMS |

---

## 🏗 Architecture

```
┌────────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  ESP32 + Sensors   │───▶│  Supabase Cloud  │───▶│    Dashboard    │
│ DHT22 + Soil + LDR │    │                  │    │   (Web App)     │
│ + OLED Display     │    │  ┌────────────┐  │    └─────────────────┘
└────────────────────┘    │  │ PostgreSQL │  │
                          │  │  Database  │  │    ┌─────────────────┐
                          │  └────────────┘  │───▶│   SMS Alerts    │
                          │                  │    └─────────────────┘
                          │  ┌────────────┐  │
                          │  │   Edge     │  │
                          │  │ Functions  │  │
                          │  └────────────┘  │
                          └──────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- ESP32 hardware setup with DHT22, soil moisture sensor, LDR, and OLED display
- Node.js 18+ (for Supabase CLI)
- Supabase account
- Twilio account (optional, for SMS alerts)
- Python 3.8+ (optional, only for simulator/testing)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/smart-plant-monitoring.git
   cd smart-plant-monitoring
   ```

2. **Install dependencies**
   ```bash
   # Python dependencies
   pip install requests

   # Supabase CLI
   npm install
   ```

3. **Set up Supabase**
   ```bash
   npx supabase login
   npx supabase init
   npx supabase link --project-ref your-project-ref
   ```

4. **Create database tables**
   ```sql
   -- Run in Supabase SQL Editor
   CREATE TABLE readings (
     id SERIAL PRIMARY KEY,
     soil INTEGER NOT NULL,
     light INTEGER NOT NULL,
     temp REAL NOT NULL,
     humidity REAL NOT NULL,
     timestamp TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE TABLE alerts (
     id SERIAL PRIMARY KEY,
     type VARCHAR(50) NOT NULL,
     severity VARCHAR(20) NOT NULL,
     message TEXT,
     reading_id INTEGER REFERENCES readings(id),
     triggered_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Enable Row Level Security
   ALTER TABLE readings ENABLE ROW LEVEL SECURITY;
   ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
   ```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file or set these in Supabase Edge Function secrets:

```env
# Required
SUPABASE_URL=https://your-project.supabase.co
SERVICE_ROLE_KEY=your-service-role-key

# Twilio SMS Alerts
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_FROM=+1234567890
ALERT_PHONE_TO=+0987654321

# Weather (Optional)
WEATHER_KEY=your-openweathermap-api-key
WEATHER_CITY=Chennai
```

### Sensor Thresholds

Default thresholds (customizable in `soil_alert/index.ts`):

| Sensor | Low | Optimal | High |
|--------|-----|---------|------|
| Soil Moisture | < 1800 | 1800-2600 | > 2600 |
| Temperature | < 15°C | 18-32°C | > 35°C |
| Light | < 500 | 500-1600 | > 1600 |
| Humidity | < 35% | 40-80% | > 85% |

---

## 📖 Usage

### Running the Hardware System

1. Connect the ESP32, DHT22, soil moisture sensor, LDR, and OLED display.
2. Power on the ESP32 and ensure it is connected to Wi-Fi.
3. Verify that the OLED shows live temperature, humidity, soil, and light values.
4. Confirm readings are being pushed to Supabase.
5. Open the dashboard to view live updates and alerts.

### Viewing the Dashboard

- Hosted (Vercel): https://smartplantmonitoringsystem.vercel.app/
- Local development:

```bash
npm install
npm run dev
```

### Optional: Running the Simulator

Use the simulator only for testing when the hardware is not available.

```bash
# Normal mode (healthy plant conditions)
python simulator.py

# Dry soil simulation
python simulator.py dry_soil

# Hot weather simulation
python simulator.py hot_weather

# Night time (low light)
python simulator.py night_time

# Random values
python simulator.py random
```

### Deploying Edge Functions

```bash
# Deploy all functions
npx supabase functions deploy soil_alert
npx supabase functions deploy daily_report

# Set secrets
npx supabase secrets set TWILIO_ACCOUNT_SID=your-sid
npx supabase secrets set TWILIO_AUTH_TOKEN=your-token
npx supabase secrets set TWILIO_PHONE_FROM=+1234567890
npx supabase secrets set ALERT_PHONE_TO=+0987654321
npx supabase secrets set WEATHER_KEY=your-api-key
```

---

## 📚 API Reference

### POST `/rest/v1/readings`

Insert a new sensor reading.

```json
{
  "soil": 2100,
  "light": 1200,
  "temp": 28.5,
  "humidity": 65.0
}
```

### GET `/functions/v1/soil_alert`

Check latest reading and trigger alerts if thresholds exceeded.

**Response:**
```json
{
  "success": true,
  "reading": { "soil": 2100, "temp": 28.5, ... },
  "alerts_detected": 0,
  "alerts_triggered": 0,
  "notification_sent": false
}
```

### GET `/functions/v1/daily_report`

Generate and send a comprehensive 24-hour report.

**Response:**
```json
{
  "success": true,
  "message": "Daily report sent successfully",
  "stats": {
    "temp": { "avg": 28.2, "min": 24.1, "max": 32.5, "trend": "stable" },
    "soil": { "avg": 2150, "min": 1900, "max": 2400, "trend": "falling" }
  }
}
```

---

## 📁 Project Structure

```
smart_plant_monitoring_system/
├── index.html                  # Vite app entry HTML
├── index.ts                    # Project metadata/types
├── simulator.py                # Optional Python simulator for testing
├── package.json                # Node dependencies and scripts
├── README.md                   # Project overview
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
├── src/                        # React dashboard source
│   ├── Dashboard.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── App.css
├── docs/                       # Static docs/demo assets
├── public/                     # Public assets
└── supabase/
    ├── config.toml             # Supabase configuration
    └── functions/
        ├── soil_alert/         # Real-time alert function
        │   ├── index.ts
        │   └── deno.json
        └── daily_report/       # Daily report generator
            └── index.ts
```

---

## 🛠 Tech Stack

| Component | Technology |
|-----------|------------|
| Hardware | ESP32, DHT22, Soil Moisture Sensor, LDR, OLED |
| Embedded Layer | ESP32 Wi-Fi firmware |
| Simulator | Python 3.x (optional testing utility) |
| Database | PostgreSQL (Supabase) |
| Backend | Supabase Edge Functions (Deno) |
| Frontend | React, TypeScript, Vite, Chart.js |
| Notifications | Twilio SMS |
| Security | JWT, Row Level Security |

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**L Kevin Daniel**  
VIT Chennai - 1st Year MDP Project

---

<p align="center">
  Made with 💚 for healthier plants
</p>
