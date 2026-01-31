/**
 * 🌱 Smart Plant Monitoring System - Soil Alert Edge Function
 * ============================================================
 * Monitors sensor readings and triggers alerts when thresholds are exceeded.
 * Features cooldown mechanism to prevent alert spam.
 */

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

interface SensorReading {
  id: number;
  soil: number;
  light: number;
  temp: number;
  humidity: number;
  timestamp: string;
}

interface AlertThresholds {
  soil_dry: number;
  soil_wet: number;
  temp_high: number;
  temp_low: number;
  light_low: number;
  humidity_high: number;
  humidity_low: number;
}

const THRESHOLDS: AlertThresholds = {
  soil_dry: 1800,      // Below = too dry
  soil_wet: 2600,      // Above = too wet
  temp_high: 35,       // Above = too hot
  temp_low: 15,        // Below = too cold
  light_low: 500,      // Below = insufficient light
  humidity_high: 85,   // Above = fungal risk
  humidity_low: 35,    // Below = too dry air
};

const COOLDOWN_MINUTES = 30;  // Minimum time between same alert type

// ═══════════════════════════════════════════════════════════════════
// ALERT LOGIC
// ═══════════════════════════════════════════════════════════════════

interface Alert {
  type: string;
  severity: "critical" | "warning" | "info";
  message: string;
  value: number;
  threshold: number;
}

function analyzeReading(reading: SensorReading): Alert[] {
  const alerts: Alert[] = [];

  // Soil moisture checks
  if (reading.soil < THRESHOLDS.soil_dry) {
    alerts.push({
      type: "soil_dry",
      severity: reading.soil < THRESHOLDS.soil_dry - 200 ? "critical" : "warning",
      message: "🚨 Soil too dry — water your plant immediately!",
      value: reading.soil,
      threshold: THRESHOLDS.soil_dry,
    });
  } else if (reading.soil > THRESHOLDS.soil_wet) {
    alerts.push({
      type: "soil_wet",
      severity: "warning",
      message: "💦 Soil too wet — reduce watering to prevent root rot.",
      value: reading.soil,
      threshold: THRESHOLDS.soil_wet,
    });
  }

  // Temperature checks
  if (reading.temp > THRESHOLDS.temp_high) {
    alerts.push({
      type: "temp_high",
      severity: reading.temp > 40 ? "critical" : "warning",
      message: "🔥 High temperature — ensure ventilation and shade!",
      value: reading.temp,
      threshold: THRESHOLDS.temp_high,
    });
  } else if (reading.temp < THRESHOLDS.temp_low) {
    alerts.push({
      type: "temp_low",
      severity: reading.temp < 10 ? "critical" : "warning",
      message: "❄️ Low temperature — protect plant from cold!",
      value: reading.temp,
      threshold: THRESHOLDS.temp_low,
    });
  }

  // Light checks
  if (reading.light < THRESHOLDS.light_low) {
    alerts.push({
      type: "light_low",
      severity: "info",
      message: "🌑 Low light — consider moving plant to brighter spot.",
      value: reading.light,
      threshold: THRESHOLDS.light_low,
    });
  }

  // Humidity checks
  if (reading.humidity > THRESHOLDS.humidity_high) {
    alerts.push({
      type: "humidity_high",
      severity: "warning",
      message: "🌫️ High humidity — watch for fungal diseases!",
      value: reading.humidity,
      threshold: THRESHOLDS.humidity_high,
    });
  } else if (reading.humidity < THRESHOLDS.humidity_low) {
    alerts.push({
      type: "humidity_low",
      severity: "info",
      message: "🏜️ Low humidity — consider misting your plant.",
      value: reading.humidity,
      threshold: THRESHOLDS.humidity_low,
    });
  }

  return alerts;
}

// ═══════════════════════════════════════════════════════════════════
// COOLDOWN CHECK
// ═══════════════════════════════════════════════════════════════════

async function isAlertOnCooldown(
  supabase: SupabaseClient,
  alertType: string
): Promise<boolean> {
  const cooldownTime = new Date(
    Date.now() - COOLDOWN_MINUTES * 60 * 1000
  ).toISOString();

  const { data } = await supabase
    .from("alerts")
    .select("id")
    .eq("type", alertType)
    .gte("triggered_at", cooldownTime)
    .limit(1);

  return (data?.length ?? 0) > 0;
}

// ═══════════════════════════════════════════════════════════════════
// NOTIFICATION
// ═══════════════════════════════════════════════════════════════════

async function sendSlackNotification(
  webhookUrl: string,
  alerts: Alert[],
  reading: SensorReading
): Promise<boolean> {
  const severityEmoji = {
    critical: "🚨",
    warning: "⚠️",
    info: "ℹ️",
  };

  const alertMessages = alerts
    .map((a) => `${severityEmoji[a.severity]} *${a.type}*: ${a.message}\n   └ Value: ${a.value} (threshold: ${a.threshold})`)
    .join("\n\n");

  const payload = {
    text: `🌱 *Plant Alert*\n\n${alertMessages}\n\n📊 *Current Readings:*\n• Soil: ${reading.soil}\n• Temp: ${reading.temp}°C\n• Light: ${reading.light}\n• Humidity: ${reading.humidity}%\n\n🕐 ${new Date().toLocaleString()}`,
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch {
    console.error("Failed to send Slack notification");
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY");
  const SLACK_WEBHOOK = Deno.env.get("SLACK_WEBHOOK_URL") ?? Deno.env.get("EMAIL_WEBHOOK_URL");

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase environment variables" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    db: { schema: "public" },
  });

  // Fetch latest reading
  const { data, error } = await supabase
    .from("readings")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(1);

  if (error) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch readings", details: error }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!data || data.length === 0) {
    return new Response(
      JSON.stringify({ message: "No sensor data available" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  const reading = data[0] as SensorReading;
  const alerts = analyzeReading(reading);

  // Filter out alerts that are on cooldown
  const activeAlerts: Alert[] = [];
  for (const alert of alerts) {
    const onCooldown = await isAlertOnCooldown(supabase, alert.type);
    if (!onCooldown) {
      activeAlerts.push(alert);
    }
  }

  // Process active alerts
  const loggedAlerts: string[] = [];
  
  for (const alert of activeAlerts) {
    // Log alert to database
    await supabase.from("alerts").insert({
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      reading_id: reading.id,
      triggered_at: new Date().toISOString(),
    });
    loggedAlerts.push(alert.type);
  }

  // Send Slack notification if there are active alerts
  let notificationSent = false;
  if (activeAlerts.length > 0 && SLACK_WEBHOOK) {
    notificationSent = await sendSlackNotification(SLACK_WEBHOOK, activeAlerts, reading);
  }

  // Return response
  return new Response(
    JSON.stringify({
      success: true,
      reading: reading,
      alerts_detected: alerts.length,
      alerts_triggered: activeAlerts.length,
      alerts_on_cooldown: alerts.length - activeAlerts.length,
      logged_alerts: loggedAlerts,
      notification_sent: notificationSent,
      thresholds: THRESHOLDS,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
});
