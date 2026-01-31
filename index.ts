/**
 * 🌱 Smart Plant Monitoring System - Main Entry Point
 * ====================================================
 * This file serves as a reference/documentation for the project.
 * The actual Edge Functions are in the supabase/functions directory.
 * 
 * Project Structure:
 * - simulator.py          → Sensor data simulator
 * - dashboard/index.html  → Real-time monitoring dashboard
 * - supabase/functions/
 *   - soil_alert/         → Real-time alert function
 *   - daily_report/       → Daily summary reports
 */

// Re-export for documentation purposes
export const PROJECT_INFO = {
  name: "Smart Plant Monitoring System",
  version: "2.0.0",
  description: "IoT-based plant monitoring with cloud analytics",
  
  features: [
    "Real-time sensor monitoring (soil, temp, light, humidity)",
    "Intelligent alerting with cooldown mechanism",
    "Daily reports with trend analysis",
    "Weather-aware recommendations",
    "Interactive dashboard with predictions",
  ],
  
  endpoints: {
    supabase: "https://yhgyeaygmampbvfanumx.supabase.co",
    readings: "/rest/v1/readings",
    alerts: "/rest/v1/alerts",
    functions: {
      soil_alert: "/functions/v1/soil_alert",
      daily_report: "/functions/v1/daily_report",
    },
  },
  
  thresholds: {
    soil: { dry: 1800, wet: 2600 },
    temp: { low: 15, high: 35 },
    light: { low: 500, high: 1600 },
    humidity: { low: 35, high: 85 },
  },
};

// Type definitions for the project
export interface SensorReading {
  id?: number;
  soil: number;
  light: number;
  temp: number;
  humidity: number;
  timestamp?: string;
}

export interface Alert {
  id?: number;
  type: string;
  severity: "critical" | "warning" | "info";
  message: string;
  reading_id?: number;
  triggered_at?: string;
}

console.log("🌱 Smart Plant Monitoring System v2.0.0");
console.log("See supabase/functions/ for Edge Function implementations.");
