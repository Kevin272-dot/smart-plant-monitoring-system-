/**
 * 🌱 Smart Plant Monitoring System - Daily Report Edge Function
 * =============================================================
 * Generates comprehensive daily reports with sensor analytics,
 * health assessments, and weather-aware recommendations.
 */

/// <reference lib="deno.window" />
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface SensorReading {
  soil: number;
  light: number;
  temp: number;
  humidity: number;
  water?: number;
  timestamp: string;
}

interface Statistics {
  avg: number;
  min: number;
  max: number;
  trend: "rising" | "falling" | "stable";
}

interface DailyStats {
  temp: Statistics;
  soil: Statistics;
  light: Statistics;
  humidity: Statistics;
  water?: Statistics;
  readingCount: number;
}

interface WeatherData {
  condition: string;
  temp: number;
  humidity: number;
  windSpeed: number;
  rainExpected: boolean;
  alerts: string[];
}

// ═══════════════════════════════════════════════════════════════════
// ANALYTICS HELPERS
// ═══════════════════════════════════════════════════════════════════

function calculateStats(values: number[]): Statistics {
  if (values.length === 0) {
    return { avg: 0, min: 0, max: 0, trend: "stable" };
  }

  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  // Calculate trend from first half vs second half
  const midpoint = Math.floor(values.length / 2);
  const firstHalfAvg = values.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint || 0;
  const secondHalfAvg = values.slice(midpoint).reduce((a, b) => a + b, 0) / (values.length - midpoint) || 0;
  const diff = secondHalfAvg - firstHalfAvg;

  let trend: "rising" | "falling" | "stable" = "stable";
  if (diff > avg * 0.05) trend = "rising";
  else if (diff < -avg * 0.05) trend = "falling";

  return { avg, min, max, trend };
}

function analyzeDailyData(readings: SensorReading[]): DailyStats {
  const temps = readings.map((r) => r.temp);
  const soils = readings.map((r) => r.soil);
  const lights = readings.map((r) => r.light ?? 0);
  const humidity = readings.map((r) => r.humidity);
  const waters = readings.map((r) => r.water ?? 0).filter((w) => w > 0);

  return {
    temp: calculateStats(temps),
    soil: calculateStats(soils),
    light: calculateStats(lights),
    humidity: calculateStats(humidity),
    water: waters.length > 0 ? calculateStats(waters) : undefined,
    readingCount: readings.length,
  };
}

// ═══════════════════════════════════════════════════════════════════
// HEALTH ASSESSMENT
// ═══════════════════════════════════════════════════════════════════

function generateHealthAlerts(stats: DailyStats): string[] {
  const alerts: string[] = [];

  // Soil moisture
  if (stats.soil.avg < 1800) {
    alerts.push("🚨 Soil consistently dry — increase watering frequency!");
  } else if (stats.soil.avg > 2600) {
    alerts.push("⚠️ Soil too wet — reduce watering to prevent root rot.");
  } else if (stats.soil.trend === "falling") {
    alerts.push("📉 Soil moisture declining — consider watering soon.");
  }

  // Temperature
  if (stats.temp.max > 38) {
    alerts.push("🔥 Temperature spikes detected — ensure shade/ventilation.");
  } else if (stats.temp.min < 15) {
    alerts.push("❄️ Cold periods detected — protect from temperature drops.");
  } else if (stats.temp.trend === "rising" && stats.temp.avg > 30) {
    alerts.push("📈 Temperature trending upward — monitor for heat stress.");
  }

  // Light
  if (stats.light.avg < 500) {
    alerts.push("🌑 Insufficient light exposure — move to brighter location.");
  } else if (stats.light.avg > 1600) {
    alerts.push("☀️ High light intensity — ensure no direct harsh sunlight.");
  }

  // Humidity
  if (stats.humidity.avg > 85) {
    alerts.push("🌫️ High humidity — watch for fungal diseases.");
  } else if (stats.humidity.avg < 40) {
    alerts.push("🏜️ Low humidity — consider misting or humidifier.");
  }

  // Water level (if available)
  if (stats.water && stats.water.avg < 30) {
    alerts.push("💧 Water reservoir low — refill soon!");
  }

  return alerts;
}

// ═══════════════════════════════════════════════════════════════════
// WEATHER INTEGRATION
// ═══════════════════════════════════════════════════════════════════

async function fetchWeather(apiKey: string, city: string): Promise<WeatherData | null> {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`
    );
    const data = await response.json();

    if (!response.ok) return null;

    const alerts: string[] = [];
    const temp = data.main?.temp;
    const humidity = data.main?.humidity;
    const windSpeed = data.wind?.speed;
    const condition = data.weather?.[0]?.main?.toLowerCase();
    const rainExpected = !!data.rain || condition === "rain";

    // Generate weather-based alerts
    if (temp > 40) alerts.push("🔥 EXTREME HEAT — Keep plants shaded & hydrated!");
    else if (temp > 35) alerts.push("🌡️ Hot weather — increase watering frequency.");
    else if (temp < 5) alerts.push("❄️ FROST WARNING — Move plants indoors!");
    else if (temp < 10) alerts.push("🥶 Cold weather — protect sensitive plants.");

    if (humidity > 90) alerts.push("💨 Very high humidity — watch for fungal diseases.");
    else if (humidity < 30) alerts.push("🏜️ Dry air — mist your plants.");

    if (windSpeed > 15) alerts.push("🌬️ Strong winds — secure or shelter plants.");

    if (condition === "thunderstorm") alerts.push("⛈️ THUNDERSTORM — Bring potted plants inside!");
    else if (rainExpected) alerts.push("🌧️ Rain expected — skip watering today.");
    else if (condition === "snow") alerts.push("🌨️ SNOW WARNING — Protect all outdoor plants!");

    return {
      condition: data.weather?.[0]?.description ?? "Unknown",
      temp,
      humidity,
      windSpeed,
      rainExpected,
      alerts,
    };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// REPORT FORMATTER
// ═══════════════════════════════════════════════════════════════════

function formatTrendEmoji(trend: "rising" | "falling" | "stable"): string {
  return trend === "rising" ? "📈" : trend === "falling" ? "📉" : "➡️";
}

function generateReport(
  stats: DailyStats,
  healthAlerts: string[],
  weather: WeatherData | null,
  city: string
): string {
  const now = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let report = `🌱 *Daily Plant Report*\n📅 ${now}\n\n`;

  // Sensor Statistics
  report += `📊 *24-Hour Statistics* (${stats.readingCount} readings)\n`;
  report += `├─ 🌡️ Temp: ${stats.temp.avg.toFixed(1)}°C (${stats.temp.min.toFixed(1)}-${stats.temp.max.toFixed(1)}) ${formatTrendEmoji(stats.temp.trend)}\n`;
  report += `├─ 💧 Soil: ${stats.soil.avg.toFixed(0)} (${stats.soil.min}-${stats.soil.max}) ${formatTrendEmoji(stats.soil.trend)}\n`;
  report += `├─ 💡 Light: ${stats.light.avg.toFixed(0)} (${stats.light.min}-${stats.light.max}) ${formatTrendEmoji(stats.light.trend)}\n`;
  report += `└─ 💨 Humidity: ${stats.humidity.avg.toFixed(1)}% (${stats.humidity.min.toFixed(1)}-${stats.humidity.max.toFixed(1)}) ${formatTrendEmoji(stats.humidity.trend)}\n`;

  if (stats.water) {
    report += `   🚰 Water: ${stats.water.avg.toFixed(0)}%\n`;
  }

  // Health Assessment
  report += `\n🏥 *Health Assessment*\n`;
  if (healthAlerts.length > 0) {
    report += healthAlerts.map((a) => `• ${a}`).join("\n");
  } else {
    report += "✅ All readings within healthy ranges!";
  }

  // Weather Section
  if (weather) {
    report += `\n\n🌦️ *Weather (${city})*\n`;
    report += `${weather.condition.charAt(0).toUpperCase() + weather.condition.slice(1)} | ${weather.temp?.toFixed(1)}°C | 💧${weather.humidity}%`;

    if (weather.alerts.length > 0) {
      report += `\n\n⚠️ *Weather Alerts*\n`;
      report += weather.alerts.map((a) => `• ${a}`).join("\n");
    }

    if (weather.rainExpected) {
      report += `\n\n💡 *Tip:* Rain expected — no need to water today!`;
    }
  }

  return report;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const supabaseUrl = Deno.env.get("PROJECT_URL") ?? Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase environment variables" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Fetch last 24 hours of readings
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("readings")
    .select("*")
    .gte("timestamp", since)
    .order("timestamp", { ascending: true });

  if (error) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch readings", details: error }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!data || data.length === 0) {
    return new Response(
      JSON.stringify({ message: "No data available for report" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Analyze data
  const stats = analyzeDailyData(data as SensorReading[]);
  const healthAlerts = generateHealthAlerts(stats);

  // Fetch weather (optional)
  const weatherKey = Deno.env.get("WEATHER_KEY");
  const city = Deno.env.get("WEATHER_CITY") ?? "Chennai";
  const weather = weatherKey ? await fetchWeather(weatherKey, city) : null;

  // Generate report
  const report = generateReport(stats, healthAlerts, weather, city);

  // Send to webhook
  const webhookUrl = Deno.env.get("EMAIL_WEBHOOK_URL") ?? Deno.env.get("SLACK_WEBHOOK_URL");
  if (!webhookUrl) {
    return new Response(
      JSON.stringify({ error: "No webhook URL configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const webhookResponse = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: report }),
  });

  return new Response(
    JSON.stringify({
      success: true,
      message: "Daily report sent successfully",
      stats,
      alerts: healthAlerts,
      weather: weather,
      webhook_status: webhookResponse.status,
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
