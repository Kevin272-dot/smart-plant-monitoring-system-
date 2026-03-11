/**
 * 🌱 Smart Plant Monitoring System - Soil Alert Edge Function
 * ============================================================
 * Monitors sensor readings and triggers alerts when thresholds are exceeded.
 * Features cooldown mechanism to prevent alert spam.
 */
// deno-lint-ignore-file

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
  soil_dry: 10,        // Below 10% = too dry (ESP32 sends 0-100%)
  soil_wet: 80,        // Above 80% = too wet (Snake Plant prefers dry)
  temp_high: 35,       // Above = too hot
  temp_low: 15,        // Below = too cold
  light_low: 5,        // Below 5% = insufficient light
  humidity_high: 80,   // Above 80% = too humid for Snake Plant
  humidity_low: 30,    // Below 30% = too dry air
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

interface SMSResult {
  success: boolean;
  status?: number;
  error?: string;
}

function analyzeReading(reading: SensorReading): Alert[] {
  const alerts: Alert[] = [];

  // Soil moisture checks
  if (reading.soil < THRESHOLDS.soil_dry) {
    alerts.push({
      type: "soil_dry",
      severity: reading.soil < 5 ? "critical" : "warning",
      message: "🚨 Soil too dry — water your Snake Plant!",
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
// NOTIFICATION (Twilio SMS)
// ═══════════════════════════════════════════════════════════════════

async function sendTwilioSMS(
  accountSid: string,
  authToken: string,
  from: string | null,
  messagingServiceSid: string | null,
  to: string,
  alerts: Alert[],
  reading: SensorReading
): Promise<SMSResult> {
  const severityEmoji: Record<string, string> = {
    critical: "🚨",
    warning: "⚠️",
    info: "ℹ️",
  };

  const alertMessages = alerts
    .map((a) => `${severityEmoji[a.severity]} ${a.type}: ${a.message}`)
    .join("\n");

  const body = `🌱 Plant Alert\n\n${alertMessages}\n\nReadings: Soil ${reading.soil}% | Temp ${reading.temp}°C | Light ${reading.light}% | Humidity ${reading.humidity}%`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const credentials = btoa(`${accountSid}:${authToken}`);

  try {
    const params = new URLSearchParams({
      To: to,
      Body: body,
    });

    if (messagingServiceSid) {
      params.set("MessagingServiceSid", messagingServiceSid);
    } else if (from) {
      params.set("From", from);
    } else {
      return {
        success: false,
        error: "Missing Twilio sender configuration",
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Twilio SMS request failed", {
        status: response.status,
        body: errorText,
      });
      return {
        success: false,
        status: response.status,
        error: errorText,
      };
    }

    return {
      success: true,
      status: response.status,
    };
  } catch (error) {
    console.error("Failed to send Twilio SMS", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown Twilio request error",
    };
  }
}

function getEnv(...keys: string[]): string | null {
  for (const key of keys) {
    const value = Deno.env.get(key)?.trim();
    if (value) return value;
  }

  return null;
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
  const SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY", "SERVICE_ROLE_KEY");
  const TWILIO_SID = getEnv("TWILIO_ACCOUNT_SID", "TWILIO_SID");
  const TWILIO_TOKEN = getEnv("TWILIO_AUTH_TOKEN", "TWILIO_TOKEN");
  const TWILIO_FROM = getEnv("TWILIO_PHONE_FROM", "TWILIO_FROM");
  const TWILIO_MESSAGING_SERVICE_SID = getEnv(
    "TWILIO_MESSAGING_SERVICE_SID",
    "TWILIO_SERVICE_SID"
  );
  const TWILIO_TO = getEnv("ALERT_PHONE_TO", "TWILIO_TO");

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

  // Send Twilio SMS if there are active alerts
  let notificationSent = false;
  let notificationError: string | null = null;
  let missingTwilioConfig: string[] = [];
  if (
    activeAlerts.length > 0 &&
    TWILIO_SID &&
    TWILIO_TOKEN &&
    TWILIO_TO &&
    (TWILIO_FROM || TWILIO_MESSAGING_SERVICE_SID)
  ) {
    const smsResult = await sendTwilioSMS(
      TWILIO_SID,
      TWILIO_TOKEN,
      TWILIO_FROM,
      TWILIO_MESSAGING_SERVICE_SID,
      TWILIO_TO,
      activeAlerts,
      reading
    );
    notificationSent = smsResult.success;
    notificationError = smsResult.success
      ? null
      : smsResult.error ?? `Twilio request failed with status ${smsResult.status ?? "unknown"}`;
  } else if (activeAlerts.length > 0) {
    missingTwilioConfig = [
      !TWILIO_SID ? "TWILIO_ACCOUNT_SID/TWILIO_SID" : null,
      !TWILIO_TOKEN ? "TWILIO_AUTH_TOKEN/TWILIO_TOKEN" : null,
      !TWILIO_FROM && !TWILIO_MESSAGING_SERVICE_SID
        ? "TWILIO_PHONE_FROM/TWILIO_FROM or TWILIO_MESSAGING_SERVICE_SID/TWILIO_SERVICE_SID"
        : null,
      !TWILIO_TO ? "ALERT_PHONE_TO/TWILIO_TO" : null,
    ].filter((value): value is string => value !== null);
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
      notification_error: notificationError,
      missing_twilio_config: missingTwilioConfig,
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
