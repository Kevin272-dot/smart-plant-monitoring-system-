// deno-lint-ignore-file no-explicit-any no-unused-vars ban-unused-ignore jsx-button-has-type
// deno-lint-ignore-file
import { useState, useEffect, useMemo } from "react";
import { Line as ChartLine, Radar } from "react-chartjs-2";
import { createClient } from "@supabase/supabase-js";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  RadialLinearScale,
  ArcElement,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title
);


// Configuration is read from Vite environment variables. Create a .env file with VITE_ prefixed keys.
// Example keys are provided in `.env.example` (do NOT commit your real `.env`).
const SUPABASE_URL = (import.meta as any)?.env?.VITE_SUPABASE_URL || 'https://yhgyeaygmampbvfanumx.supabase.co';
const SUPABASE_KEY = (import.meta as any)?.env?.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloZ3llYXlnbWFtcGJ2ZmFudW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NTk3NTAsImV4cCI6MjA4MzAzNTc1MH0.VKlVMFg3RKHjmnseIWfBVc5QZX7vWJsq9oaiIu7kmwI';
const WEATHER_API_KEY = (import.meta as any)?.env?.VITE_WEATHER_API_KEY || 'a2f5686772b6e58369b6aa0af5c356f6';
const WEATHER_CITY = (import.meta as any)?.env?.VITE_WEATHER_CITY || 'Chennai';

// If required Vite env vars are missing, we will render a friendly placeholder component.
const MISSING_CONFIG = !SUPABASE_URL || !SUPABASE_KEY;
if (MISSING_CONFIG) {
  // eslint-disable-next-line no-console
  console.error('[Dashboard] Missing VITE_SUPABASE_URL or VITE_SUPABASE_KEY. Create a .env from .env.example and restart dev server.');
}

// Top-level component to render when env config is missing
function DashboardMissingConfig() {
  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 8 }}>Configuration required</h2>
      <p>VITE_SUPABASE_URL or VITE_SUPABASE_KEY is missing. Create a local <code>.env</code> from <code>.env.example</code> and restart the dev server.</p>
      <p>Example entries:</p>
      <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 12 }}>VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=REPLACE_WITH_YOUR_ANON_KEY
VITE_WEATHER_API_KEY=REPLACE_WITH_YOUR_OPENWEATHERMAP_KEY</pre>
    </div>
  );
}

// Clamp sensor values to valid percentage ranges (ESP32 already sends soil/light as %)
function clampReading(r: any) {
  return {
    ...r,
    temp: Math.max(-10, Math.min(60, Number(r.temp) || 0)),
    soil: Math.max(0, Math.min(100, Number(r.soil) || 0)),
    light: Math.max(0, Math.min(100, Number(r.light) || 0)),
    humidity: Math.max(0, Math.min(100, Number(r.humidity) || 0)),
  };
}

// Detect local alerts based on sensor readings (Bird's Nest Snake Plant)
// Snake plants prefer dry soil — overwatering is far worse than under-watering.
function detectLocalAlerts(readings: any[]) {
  if (!readings || readings.length === 0) return [];
  const alerts = [];
  const last = readings[readings.length - 1];
  const ts = new Date(last.timestamp).toISOString();
  if (last.soil < 10) {
    alerts.push({
      type: "soil_dry",
      severity: "warning",
      triggered_at: ts,
      message: "Soil is very dry — time to water your Snake Plant."
    });
  } else if (last.soil > 80) {
    alerts.push({
      type: "soil_wet",
      severity: "critical",
      triggered_at: ts,
      message: "Soil too wet — Snake Plants risk root rot! Let it dry out."
    });
  }
  if (last.temp > 35) {
    alerts.push({
      type: "temp_high",
      severity: "critical",
      triggered_at: ts,
      message: "Temperature is too high for Snake Plant."
    });
  } else if (last.temp < 10) {
    alerts.push({
      type: "temp_low",
      severity: "critical",
      triggered_at: ts,
      message: "Temperature dangerously low — Snake Plants can't survive below 10°C."
    });
  } else if (last.temp < 15) {
    alerts.push({
      type: "temp_low",
      severity: "warning",
      triggered_at: ts,
      message: "Temperature is getting cold for Snake Plant."
    });
  }
  if (last.light < 5) {
    alerts.push({
      type: "light_low",
      severity: "warning",
      triggered_at: ts,
      message: "Very low light — Snake Plants tolerate shade but need some light."
    });
  }
  if (last.humidity > 80) {
    alerts.push({
      type: "humidity_high",
      severity: "warning",
      triggered_at: ts,
      message: "High humidity — Snake Plants prefer drier air (30-50%)."
    });
  }
  return alerts;
}

const Dashboard = () => {
  const supabase = useMemo(() => createClient(SUPABASE_URL, SUPABASE_KEY), []);

  // Manual refresh helper for debugging (forces a fetch and logs results)
  const manualRefresh = async () => {
    try {
      console.log('[ManualRefresh] fetching readings...');
      const { data, error } = await supabase
        .from('readings')
        .select('timestamp,temp,soil,light,humidity')
        .order('timestamp', { ascending: false })
        .limit(48);
      console.log('[ManualRefresh] readings result:', { data, error });
      if (!error && data) setSensorReadings(data.slice().reverse().map(clampReading));

      console.log('[ManualRefresh] fetching alerts...');
      const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: alertData, error: alertError } = await supabase
        .from('alerts')
        .select('*')
        .gte('triggered_at', since7d)
        .order('triggered_at', { ascending: false });
      console.log('[ManualRefresh] alerts result:', { alertData, alertError });
      if (!alertError && alertData) setAlerts(alertData);
    } catch (e) {
      console.error('[ManualRefresh] failed', e);
    }
  };

  // deno-lint-ignore ban-unused-ignore
  // deno-lint-ignore ban-unused-ignore
  // deno-lint-ignore no-explicit-any
  const [sensorReadings, setSensorReadings] = useState<any[]>([]);
    // ML Pattern Analysis state
    const [mlTrend, setMlTrend] = useState<string>("--");
    const [mlTrendDesc, setMlTrendDesc] = useState<string>("Analyzing patterns...");
    const [mlCycle, setMlCycle] = useState<string>("--");
    const [mlCycleDesc, setMlCycleDesc] = useState<string>("Learning cycles...");
    const [mlAnomaly, setMlAnomaly] = useState<string>("--");
    const [mlAnomalyDesc, setMlAnomalyDesc] = useState<string>("Checking anomalies...");
    const [mlConfidence, setMlConfidence] = useState<string>("--");
    const [mlConfidenceFill, setMlConfidenceFill] = useState<number>(0);
    const [mlInsights, setMlInsights] = useState<Array<{icon: string, text: string, confidence: number}>>([{icon: "⏳", text: "Collecting data for analysis...", confidence: 0}]);
    const [analysisDetails, setAnalysisDetails] = useState<Array<{
      title: string;
      formula: string;
      values: Array<{ label: string; value: string }>;
    }>>([]);
    // ML Pattern Analysis helpers
      function formatAnalysisNumber(value: number, digits = 2) {
        return Number.isFinite(value) ? value.toFixed(digits) : "--";
      }

    function calculateStdDev(arr: number[]) {
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      const squareDiffs = arr.map(value => Math.pow(value - mean, 2));
      return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / arr.length);
    }

    function detectTrend(values: number[]) {
      const n = values.length;
      if (n < 3) {
        return { slope: 0, direction: 'insufficient_data', n };
      }
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += values[i];
        sumXY += i * values[i];
        sumX2 += i * i;
      }
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const direction = slope > 0.5 ? 'rising' : slope < -0.5 ? 'falling' : 'stable';
      return { slope, direction, n };
    }

    function detectDailyCycle(readings: any[]) {
      if (readings.length < 10) {
        return { detected: false, pattern: 'insufficient_data', readingCount: readings.length, hourCount: 0, variation: '0.0', peakHour: '--', lowHour: '--' };
      }
      const hourlyData: Record<number, number[]> = {};
      readings.forEach(r => {
        const hour = new Date(r.timestamp).getHours();
        if (!hourlyData[hour]) hourlyData[hour] = [];
        hourlyData[hour].push(r.temp);
      });
      const hourlyAvg = Object.entries(hourlyData).map(([hour, temps]) => ({
        hour: parseInt(hour),
        avgTemp: temps.reduce((a, b) => a + b, 0) / temps.length
      }));
      if (hourlyAvg.length < 4) {
        return { detected: false, pattern: 'insufficient_data', readingCount: readings.length, hourCount: hourlyAvg.length, variation: '0.0', peakHour: '--', lowHour: '--' };
      }
      const temps = hourlyAvg.map(h => h.avgTemp);
      const variation = Math.max(...temps) - Math.min(...temps);
      return {
        detected: variation > 3,
        pattern: variation > 5 ? 'strong_cycle' : variation > 3 ? 'moderate_cycle' : 'weak_cycle',
        variation: variation.toFixed(1),
        readingCount: readings.length,
        hourCount: hourlyAvg.length,
        peakHour: hourlyAvg.reduce((a, b) => a.avgTemp > b.avgTemp ? a : b).hour,
        lowHour: hourlyAvg.reduce((a, b) => a.avgTemp < b.avgTemp ? a : b).hour
      };
    }

    function calculateAnomalyScore(values: number[], latestValue: number) {
      if (values.length < 5) {
        return { score: 0, isAnomaly: false, zScore: '0.00', mean: 0, stdDev: 0, latestValue, sampleSize: values.length };
      }
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = calculateStdDev(values);
      if (stdDev === 0) {
        return { score: 0, isAnomaly: false, zScore: '0.00', mean, stdDev, latestValue, sampleSize: values.length };
      }
      const zScore = Math.abs((latestValue - mean) / stdDev);
      return {
        score: Math.min(100, zScore * 33).toFixed(0),
        isAnomaly: zScore > 2,
        zScore: zScore.toFixed(2),
        mean,
        stdDev,
        latestValue,
        sampleSize: values.length,
      };
    }

    function generateMLInsights(readings: any[], trend: any, cycle: any, anomaly: any, weather: any) {
      const insights = [];
      const latest = readings[readings.length - 1];
      // Snake Plant: dry soil is normal — only warn when very dry for extended period
      if (trend.direction === 'falling' && latest.soil < 15) {
        insights.push({ icon: '💧', text: 'Soil is drying out. Snake Plants like dry soil, but consider watering within 1-2 days if soil drops below 10%.', confidence: 80 });
      }
      if (latest.soil > 80) {
        insights.push({ icon: '🚨', text: 'Soil is too wet! Snake Plants are drought-tolerant — overwatering causes root rot. Let soil dry completely before watering again.', confidence: 95 });
      }
      if (trend.direction === 'rising' && latest.temp > 30) {
        insights.push({ icon: '🌡️', text: 'Temperature rising. Snake Plants tolerate warmth but prefer 15-29°C. Ensure good ventilation.', confidence: 78 });
      }
      if (weather) {
        if (weather.rain || weather.condition?.includes('rain')) {
          insights.push({ icon: '🌧️', text: 'Rain expected. Do NOT water — Snake Plants only need watering every 1-2 weeks and hate wet soil.', confidence: 95 });
        }
        if (weather.humidity > 80) {
          insights.push({ icon: '💨', text: 'High humidity detected. Snake Plants prefer 30-50% humidity — ensure good air circulation.', confidence: 82 });
        }
      }
      if (cycle.detected) {
        insights.push({ icon: '🔄', text: `Daily pattern detected: Temperature peaks around ${cycle.peakHour}:00 and dips around ${cycle.lowHour}:00.`, confidence: 75 });
      }
      if (anomaly.isAnomaly) {
        insights.push({ icon: '⚠️', text: 'Unusual reading detected! Values deviate significantly from normal patterns.', confidence: 90 });
      }
      // Optimal: dry-ish soil, indirect light, moderate temp
      if (latest.soil >= 10 && latest.soil <= 40 && latest.temp >= 18 && latest.temp <= 29 && latest.light >= 10 && latest.light <= 80) {
        insights.push({ icon: '✅', text: 'Perfect conditions for your Bird\'s Nest Snake Plant! Dry soil, indirect light, and comfortable temperature.', confidence: 95 });
      }
      if (readings.length >= 20) {
        const soilTrend = detectTrend(readings.slice(-20).map(r => r.soil));
        if (soilTrend.slope < -0.5) {
          const hoursUntilDry = Math.abs((latest.soil - 10) / (soilTrend.slope * 4));
          if (hoursUntilDry < 48) {
            insights.push({ icon: '⏰', text: `Soil drying naturally — will need water in ~${hoursUntilDry.toFixed(0)} hours. Perfect for Snake Plant!`, confidence: 70 });
          }
        }
      }
      // Snake Plant care reminder
      if (latest.soil >= 10 && latest.soil <= 30) {
        insights.push({ icon: '🪴', text: 'Bird\'s Nest Snake Plant reminder: Water only when soil is below 10%. These plants thrive on neglect!', confidence: 90 });
      }
      return insights.length > 0 ? insights : [{ icon: '📊', text: 'Collecting data for your Snake Plant. Keep sensors running for better analysis.', confidence: 50 }];
    }
  // deno-lint-ignore no-explicit-any
  const [tempData, setTempData] = useState<any>(null);
  // deno-lint-ignore no-explicit-any
  const [soilData, setSoilData] = useState<any>(null);
  const [currentTemp, setCurrentTemp] = useState<string>("--");
  const [currentSoil, setCurrentSoil] = useState<string>("--");
  const [currentLight, setCurrentLight] = useState<string>("--");
  const [currentHumidity, setCurrentHumidity] = useState<string>("--");
  const [multiChartData, setMultiChartData] = useState<any>(null);
  const [radarData, setRadarData] = useState<any>(null);
      // Radar chart update
      useEffect(() => {
        if (!sensorReadings || sensorReadings.length === 0) {
          setRadarData(null);
          return;
        }
        const temps = sensorReadings.map((r: any) => r.temp);
        const soils = sensorReadings.map((r: any) => r.soil);
        const lights = sensorReadings.map((r: any) => r.light ?? 0);
        const humidity = sensorReadings.map((r: any) => r.humidity);
        const avgTemp = temps.reduce((a: number, b: number) => a + b, 0) / temps.length;
        const avgSoil = soils.reduce((a: number, b: number) => a + b, 0) / soils.length;
        const avgLight = lights.reduce((a: number, b: number) => a + b, 0) / lights.length;
        const avgHumidity = humidity.reduce((a: number, b: number) => a + b, 0) / humidity.length;
        const radarScores = {
          "Temp Balance": Math.max(0, 100 - Math.abs(avgTemp - 22) * 4),
          "Soil Health": avgSoil <= 40 ? 90 : avgSoil <= 80 ? 70 : 30,
          "Light Level": avgLight >= 10 && avgLight <= 80 ? 90 : 50,
          "Humidity": avgHumidity >= 30 && avgHumidity <= 50 ? 90 : avgHumidity <= 80 ? 70 : 50,
          "Consistency": 85
        };
        setRadarData({
          labels: Object.keys(radarScores),
          datasets: [{
            label: "Health Metrics",
            data: Object.values(radarScores),
            borderColor: "#4ade80",
            backgroundColor: "rgba(74, 222, 128, 0.2)",
            pointBackgroundColor: "#4ade80"
          }]
        });
        console.log('[Dashboard] radarData updated', { radarScores });
      }, [sensorReadings]);
    // Multi-metric chart update
    useEffect(() => {
      if (!sensorReadings || sensorReadings.length === 0) {
        setMultiChartData(null);
        return;
      }
      const labels = sensorReadings.map((r: any) => new Date(r.timestamp).toLocaleTimeString());
      const temps = sensorReadings.map((r: any) => r.temp);
      const humidity = sensorReadings.map((r: any) => r.humidity);
      const lights = sensorReadings.map((r: any) => r.light ?? 0);
      setMultiChartData({
        labels,
        datasets: [
          {
            label: "Temp (°C)",
            data: temps,
            borderColor: "#f87171",
            tension: 0.4,
            pointRadius: 0
          },
          {
            label: "Humidity (%)",
            data: humidity,
            borderColor: "#a78bfa",
            tension: 0.4,
            pointRadius: 0
          },
          {
            label: "Light (%)",
            data: lights,
            borderColor: "#fbbf24",
            tension: 0.4,
            pointRadius: 0
          }
        ]
      });
      console.log('[Dashboard] multiChartData updated', { labels, temps, humidity, lights });
    }, [sensorReadings]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("--");
  const [trendBadges, setTrendBadges] = useState<{[k: string]: {text: string, className: string}}>({ temp: {text: "--", className: "trend trend-stable"}, soil: {text: "--", className: "trend trend-stable"}, light: {text: "--", className: "trend trend-stable"}, humidity: {text: "--", className: "trend trend-stable"} });
  const [healthScore, setHealthScore] = useState<string>("--");
  const [healthBarFill, setHealthBarFill] = useState<string>("0%");
  const [healthBarColor, setHealthBarColor] = useState<string>("linear-gradient(90deg, #4ade80, #22d3ee)");
  const [healthTips, setHealthTips] = useState<Array<{text: string, type: string}>>([]);
  const [weather, setWeather] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);

  // Prediction states
  const [predTemp, setPredTemp] = useState<string>("--");
  const [predTempSource, setPredTempSource] = useState<string>("--");
  const [predSoil, setPredSoil] = useState<string>("--");
  const [predSoilSource, setPredSoilSource] = useState<string>("--");
  const [predWatering, setPredWatering] = useState<string>("--");
  const [predWateringReason, setPredWateringReason] = useState<string>("--");
  const [predictionChartData, setPredictionChartData] = useState<any>(null);

  // Daily averages (past 7 days)
  const [dailyAverages, setDailyAverages] = useState<any[]>([]);
  // Weekly health averages (past 7 weeks)
  const [weeklyHealthAverages, setWeeklyHealthAverages] = useState<any[]>([]);

  // Helper to compute health score from a single reading (Snake Plant)
  function computeHealth(r: any) {
    let score = 100;
    if (r.soil > 80) score -= 35;
    else if (r.soil < 10) score -= 10;
    if (r.temp > 35) score -= 25;
    else if (r.temp < 10) score -= 30;
    else if (r.temp < 15) score -= 15;
    else if (r.temp > 29) score -= 5;
    if (r.light < 5) score -= 15;
    else if (r.light > 90) score -= 10;
    if (r.humidity > 80) score -= 10;
    return Math.max(0, score);
  }

  // Fetch historical data for daily & weekly averages
  useEffect(() => {
    const fetchHistorical = async () => {
      // --- Daily averages: past 7 days ---
      const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: weekData } = await supabase
        .from('readings')
        .select('timestamp,temp,soil,light,humidity')
        .gte('timestamp', since7d)
        .order('timestamp', { ascending: true });

      if (weekData && weekData.length > 0) {
        const clamped = weekData.map(clampReading);
        // Group by date string
        const byDay: Record<string, any[]> = {};
        clamped.forEach((r: any) => {
          const day = new Date(r.timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          if (!byDay[day]) byDay[day] = [];
          byDay[day].push(r);
        });
        const dailyAvg = Object.entries(byDay).map(([day, readings]) => ({
          day,
          temp: (readings.reduce((s: number, r: any) => s + r.temp, 0) / readings.length).toFixed(1),
          soil: (readings.reduce((s: number, r: any) => s + r.soil, 0) / readings.length).toFixed(0),
          light: (readings.reduce((s: number, r: any) => s + r.light, 0) / readings.length).toFixed(0),
          humidity: (readings.reduce((s: number, r: any) => s + r.humidity, 0) / readings.length).toFixed(0),
          count: readings.length
        }));
        setDailyAverages(dailyAvg);
      }

      // --- Weekly health: past 7 weeks ---
      const since7w = new Date(Date.now() - 49 * 24 * 60 * 60 * 1000).toISOString();
      const { data: monthData } = await supabase
        .from('readings')
        .select('timestamp,temp,soil,light,humidity')
        .gte('timestamp', since7w)
        .order('timestamp', { ascending: true });

      if (monthData && monthData.length > 0) {
        const clamped = monthData.map(clampReading);
        // Group by ISO week
        const byWeek: Record<string, any[]> = {};
        clamped.forEach((r: any) => {
          const d = new Date(r.timestamp);
          const startOfWeek = new Date(d);
          startOfWeek.setDate(d.getDate() - d.getDay());
          const weekLabel = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (!byWeek[weekLabel]) byWeek[weekLabel] = [];
          byWeek[weekLabel].push(r);
        });
        const weeklyAvg = Object.entries(byWeek).map(([week, readings]) => {
          const avgHealth = readings.reduce((s: number, r: any) => s + computeHealth(r), 0) / readings.length;
          return {
            week: `Week of ${week}`,
            health: Math.round(avgHealth),
            avgTemp: (readings.reduce((s: number, r: any) => s + r.temp, 0) / readings.length).toFixed(1),
            avgSoil: (readings.reduce((s: number, r: any) => s + r.soil, 0) / readings.length).toFixed(0),
            count: readings.length
          };
        });
        setWeeklyHealthAverages(weeklyAvg);
      }
    };
    fetchHistorical();
  }, [supabase, sensorReadings]); // Re-fetch when new readings arrive

  // Define a type for sensor readings
  type SensorReading = {
    timestamp: any;
    temp: number;
    soil: number;
    light: number;
    humidity: number;
  };
  
    useEffect(() => {
      const POLL_INTERVAL_MS = 30000;
      const fetchData = async () => {
        setError(null);
        // Supabase
        console.log('[Dashboard] fetching readings from supabase...');
        const { data, error: fetchError } = await supabase
          .from("readings")
          .select("timestamp,temp,soil,light,humidity")
          .order("timestamp", { ascending: false })
          .limit(48);
        console.log('[Dashboard] supabase.readings response:', { data, fetchError });
        if (fetchError) {
          console.error('[Dashboard] Supabase fetch error:', fetchError);
          setError(fetchError.message);
        } else if (data && data.length > 0) {
          console.log('[Dashboard] readings count:', data.length, 'first:', data[0], 'last:', data[data.length - 1]);
          // data is returned newest-first; create an ascending copy (oldest->newest) for UI
          const asc = data.slice().reverse().map(clampReading);
          setSensorReadings(asc);
          const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          let { data: alertData, error: alertError } = await supabase
            .from("alerts")
            .select("*")
            .gte("triggered_at", since7d)
            .order("triggered_at", { ascending: false });
          console.log('[Dashboard] supabase.alerts (past 7d) response:', { alertData, alertError });
          // If nothing returned (maybe timestamps mismatched), fetch latest 50 alerts without time filter
          if ((!alertData || alertData.length === 0) && !alertError) {
            const res = await supabase.from('alerts').select('*').order('triggered_at', { ascending: false }).limit(50);
            alertData = res.data;
            alertError = res.error;
            console.log('[Dashboard] supabase.alerts (latest 50) fallback response:', { alertData, alertError });
          }
          if (!alertError && alertData && alertData.length > 0) {
            setAlerts(alertData);
            console.log('[Dashboard] setAlerts count:', alertData.length);
          }

          const latest = asc[asc.length - 1];
            setCurrentTemp(latest.temp.toFixed(1));
            setCurrentSoil(`${latest.soil}%`);
            setCurrentLight(`${latest.light}%`);
            setCurrentHumidity(latest.humidity.toFixed(1));

            const newBadges: {[k: string]: {text: string, className: string}} = {};
            ['temp', 'soil', 'light', 'humidity'].forEach((field) => {
              const values = asc.map((r: any) => r[field]);
              const midpoint = Math.floor(values.length / 2);
              const firstHalf = values.slice(0, midpoint);
              const secondHalf = values.slice(midpoint);
              const avgFirst = firstHalf.reduce((a: number, b: number) => a + b, 0) / firstHalf.length;
              const avgSecond = secondHalf.reduce((a: number, b: number) => a + b, 0) / secondHalf.length;
              const diff = avgSecond - avgFirst;
              const threshold = avgFirst * 0.03;
              if (diff > threshold) newBadges[field] = { text: "📈 Rising", className: "trend trend-up" };
              else if (diff < -threshold) newBadges[field] = { text: "📉 Falling", className: "trend trend-down" };
              else newBadges[field] = { text: "➡️ Stable", className: "trend trend-stable" };
            });
            setTrendBadges(newBadges);

            let score = 100;
            const tips: Array<{text: string, type: string}> = [];
            // Snake Plant: dry soil is GOOD, wet soil is BAD
            if (latest.soil > 80) { score -= 35; tips.push({ text: "🚨 Too wet! Risk of root rot — don't water!", type: "critical" }); }
            else if (latest.soil < 10) { score -= 10; tips.push({ text: "💧 Time to water (once every 1-2 weeks)", type: "warning" }); }
            else if (latest.soil <= 40) { tips.push({ text: "🪴 Soil perfectly dry — Snake Plant happy!", type: "good" }); }
            else { tips.push({ text: "💧 Soil moist — skip watering for now", type: "good" }); }
            if (latest.temp > 35) { score -= 25; tips.push({ text: "🔥 Too hot!", type: "critical" }); }
            else if (latest.temp < 10) { score -= 30; tips.push({ text: "❄️ Dangerously cold!", type: "critical" }); }
            else if (latest.temp < 15) { score -= 15; tips.push({ text: "❄️ A bit cold for Snake Plant", type: "warning" }); }
            else if (latest.temp >= 15 && latest.temp <= 29) { tips.push({ text: "🌡️ Temperature ideal (15-29°C)", type: "good" }); }
            else { score -= 5; tips.push({ text: "🌡️ Warm but tolerable", type: "warning" }); }
            if (latest.light < 5) { score -= 15; tips.push({ text: "🌑 Too dark — needs some indirect light", type: "warning" }); }
            else if (latest.light >= 10 && latest.light <= 80) { tips.push({ text: "💡 Light level perfect", type: "good" }); }
            if (latest.humidity > 80) { score -= 10; tips.push({ text: "🌫️ Humidity too high (prefers 30-50%)", type: "warning" }); }
            else if (latest.humidity >= 30 && latest.humidity <= 50) { tips.push({ text: "💨 Humidity ideal", type: "good" }); }
            score = Math.max(0, score);
            setHealthScore(`${score}%`);
            setHealthBarFill(`${score}%`);
            setHealthBarColor(score > 70 ? "linear-gradient(90deg, #4ade80, #22d3ee)" : score > 40 ? "linear-gradient(90deg, #fbbf24, #f59e0b)" : "linear-gradient(90deg, #f87171, #ef4444)");
            setHealthTips(tips);
            setLastUpdate(new Date().toLocaleString());

            setTempData({
              labels: asc.map((r: any) => new Date(r.timestamp).toLocaleTimeString()),
              datasets: [{
                label: "Temperature (°C)",
                data: asc.map((r: any) => r.temp),
                borderColor: "#4ade80",
                backgroundColor: "rgba(74,222,128,0.2)",
                tension: 0.4,
              }],
            });
            setSoilData({
              labels: asc.map((r: any) => new Date(r.timestamp).toLocaleTimeString()),
              datasets: [{
                label: "Soil Moisture (%)",
                data: asc.map((r: any) => r.soil),
                borderColor: "#22d3ee",
                backgroundColor: "rgba(34,211,238,0.2)",
                tension: 0.4,
              }],
            });
            // Detect local alerts from the latest sensor reading and insert into Supabase if new
            try {
              const localAlerts = detectLocalAlerts(asc);
              console.log('[Dashboard] localAlerts detected:', localAlerts);
              if (localAlerts && localAlerts.length > 0) {
                // Compare with recent alerts fetched earlier (alertData)
                const existing = (typeof alertData !== 'undefined' && alertData) ? alertData : [];
                const newAlerts = localAlerts.filter((la: any) => !existing.some((e: any) => e.type === la.type && new Date(e.triggered_at).toISOString() === new Date(la.triggered_at).toISOString()));
                console.log('[Dashboard] newAlerts to insert:', newAlerts);
                if (newAlerts.length > 0) {
                  // Insert only columns that exist in the DB schema to avoid PostgREST PGRST204 errors.
                  // Many projects store only `type` and `triggered_at` in alerts — sanitize payload accordingly.
                  const payload = newAlerts.map((a: any) => ({ type: a.type, triggered_at: a.triggered_at }));
                  const { data: inserted, error: insertError } = await supabase.from('alerts').insert(payload).select();
                  console.log('[Dashboard] supabase.insert alerts result:', { inserted, insertError });
                  if (!insertError) {
                    // Prepend inserted alerts to state so recent appear first
                    setAlerts(prev => {
                      const next = (inserted || payload).concat(prev || []);
                      return next.slice(0, 50);
                    });
                  } else {
                    // If insert fails due to row-level security (RLS) we still want the UI to show
                    // the locally-detected alerts so the user sees them immediately.
                    console.error('[Dashboard] insertError:', insertError);
                    const isRls = (insertError && (insertError.code === '42501' || String(insertError.message).toLowerCase().includes('row-level security')));
                    if (isRls) {
                      console.warn('[Dashboard] Insert blocked by RLS. Showing local alerts locally but not persisted.');
                      // Show locally-detected alerts in UI so Recent Alerts isn't empty
                      setAlerts(prev => (payload || []).concat(prev || []).slice(0, 50));
                      // Provide guidance for how to fix in Supabase (console only)
                      console.info('[Dashboard] To persist alerts in Supabase, either:\n' +
                        ' - Disable RLS for the `alerts` table (not recommended for production),\n' +
                        ' - Add an insert policy allowing the client role to insert, or\n' +
                        ' - Insert alerts server-side (Edge Function or server) using the service_role key.');
                      setError('Insert blocked by Supabase row-level security (alerts not persisted). See console for guidance.');
                    } else {
                      // Other errors: keep local alerts visible too and log the error
                      setAlerts(prev => (payload || []).concat(prev || []).slice(0, 50));
                    }
                  }
                }
              }
            } catch (e) {
              console.error('Local alert detection/insert failed', e);
            }
          }
          // Fetch weather early so predictions can use it in the ML/prediction step
          let weatherLocal = weather;
          try {
            const resp = await fetch(
              `https://api.openweathermap.org/data/2.5/weather?q=${WEATHER_CITY}&appid=${WEATHER_API_KEY}&units=metric`
            );
            if (resp.ok) {
              const w = await resp.json();
              setWeather(w);
              weatherLocal = w;
            } else {
              setWeather(null);
              weatherLocal = null;
            }
          } catch (e) {
            setWeather(null);
            weatherLocal = null;
          }

          // --- ML Pattern Analysis ---
        if (data && data.length >= 5) {
          const temps = data.map((r: any) => r.temp);
          const soils = data.map((r: any) => r.soil);
          const latest = data[data.length - 1];
          const tempTrend = detectTrend(temps);
          const soilTrend = detectTrend(soils);
          const cycle = detectDailyCycle(data);
          const tempAnomaly = calculateAnomalyScore(temps.slice(0, -1), latest.temp);
          const soilAnomaly = calculateAnomalyScore(soils.slice(0, -1), latest.soil);
          const maxAnomaly = Math.max(parseFloat(String(tempAnomaly.score)), parseFloat(String(soilAnomaly.score)));
          const confidence = Math.min(95, 50 + data.length * 0.5);
          // Trend
          const trendEmoji = soilTrend.direction === 'rising' ? '📈' : soilTrend.direction === 'falling' ? '📉' : '➡️';
          setMlTrend(trendEmoji);
          setMlTrendDesc(`Soil: ${soilTrend.direction}, Temp: ${tempTrend.direction}`);
          // Daily Cycle
          setMlCycle(cycle.detected ? '✅' : '❌');
          setMlCycleDesc(cycle.detected ? `±${cycle.variation}°C variation detected` : 'No clear pattern yet');
          // Anomaly
          setMlAnomaly(`${maxAnomaly}%`);
          setMlAnomalyDesc(maxAnomaly > 50 ? 'Unusual readings!' : 'All normal');
          // Confidence
          setMlConfidence(`${confidence.toFixed(0)}%`);
          setMlConfidenceFill(confidence);
          // Insights
          setMlInsights(generateMLInsights(data, soilTrend, cycle, { isAnomaly: maxAnomaly > 50, score: maxAnomaly }, weatherLocal));
          setAnalysisDetails([
            {
              title: 'Trend Calculation',
              formula: 'slope = (nΣxy - ΣxΣy) / (nΣx² - (Σx)²)',
              values: [
                { label: 'Readings used', value: `${soilTrend.n}` },
                { label: 'Soil slope', value: formatAnalysisNumber(soilTrend.slope, 3) },
                { label: 'Temp slope', value: formatAnalysisNumber(tempTrend.slope, 3) },
                { label: 'Soil direction', value: soilTrend.direction },
                { label: 'Temp direction', value: tempTrend.direction },
              ],
            },
            {
              title: 'Daily Cycle Check',
              formula: 'variation = max(hourly_avg_temp) - min(hourly_avg_temp)',
              values: [
                { label: 'Readings scanned', value: `${cycle.readingCount}` },
                { label: 'Hourly buckets', value: `${cycle.hourCount}` },
                { label: 'Variation', value: `${cycle.variation}°C` },
                { label: 'Peak hour', value: `${cycle.peakHour}:00` },
                { label: 'Low hour', value: `${cycle.lowHour}:00` },
                { label: 'Detected if', value: '> 3.0°C variation and 4+ hourly buckets' },
              ],
            },
            {
              title: 'Temperature Anomaly',
              formula: 'z = |(latest - mean) / std_dev|, score = min(100, 33 × z)',
              values: [
                { label: 'Sample size', value: `${tempAnomaly.sampleSize}` },
                { label: 'Latest temp', value: `${formatAnalysisNumber(tempAnomaly.latestValue, 1)}°C` },
                { label: 'Mean temp', value: `${formatAnalysisNumber(tempAnomaly.mean, 2)}°C` },
                { label: 'Std dev', value: formatAnalysisNumber(tempAnomaly.stdDev, 2) },
                { label: 'Z-score', value: `${tempAnomaly.zScore}` },
                { label: 'Score', value: `${tempAnomaly.score}%` },
              ],
            },
            {
              title: 'Soil Anomaly',
              formula: 'z = |(latest - mean) / std_dev|, score = min(100, 33 × z)',
              values: [
                { label: 'Sample size', value: `${soilAnomaly.sampleSize}` },
                { label: 'Latest soil', value: `${formatAnalysisNumber(soilAnomaly.latestValue, 0)}%` },
                { label: 'Mean soil', value: `${formatAnalysisNumber(soilAnomaly.mean, 2)}%` },
                { label: 'Std dev', value: formatAnalysisNumber(soilAnomaly.stdDev, 2) },
                { label: 'Z-score', value: `${soilAnomaly.zScore}` },
                { label: 'Score', value: `${soilAnomaly.score}%` },
              ],
            },
            {
              title: 'Confidence Score',
              formula: 'confidence = min(95, 50 + 0.5 × reading_count)',
              values: [
                { label: 'Reading count', value: `${data.length}` },
                { label: 'Computed confidence', value: `${confidence.toFixed(0)}%` },
                { label: 'Upper cap', value: '95%' },
              ],
            },
          ]);

          // --- Weather-Aware Predictions ---
          // Predict next temperature and soil moisture based on trend and weather
          let predictedTemp = "--";
          let predictedTempSource = "--";
          let predictedSoil = "--";
          let predictedSoilSource = "--";
          let predictedWatering = "--";
          let predictedWateringReason = "--";
          let predChartData = null;

          if (latest) {
            // Simple prediction: next hour (works even without weather)
            const tempDelta = tempTrend.slope;
            const soilDelta = soilTrend.slope;
            const weatherTemp = weatherLocal?.main?.temp ?? latest.temp;
            const weatherHumidity = weatherLocal?.main?.humidity ?? latest.humidity;
            const rain = (weatherLocal?.weather?.[0]?.main?.toLowerCase().includes("rain") || weatherLocal?.rain) ?? false;

            predictedTemp = `${Math.round(latest.temp + tempDelta)}°C`;
            predictedTempSource = weatherLocal ? `Trend + Weather (${weatherTemp}°C)` : `Trend-only prediction`;

            // Predict soil % — Snake Plant: rain barely matters since it's indoors
            predictedSoil = `${Math.min(100, Math.max(0, Math.round(latest.soil + soilDelta + (rain ? 1 : 0))))}%`;
            predictedSoilSource = rain ? "Rain expected (minimal indoor impact)" : "Trend-based prediction";

            // Snake Plant: only water when soil < 10%, and only every 1-2 weeks
            if (rain) {
              predictedWatering = "No";
              predictedWateringReason = "Snake Plants barely need water — skip";
            } else if (parseInt(predictedSoil) < 10) {
              predictedWatering = "Yes";
              predictedWateringReason = "Soil very dry — water lightly";
            } else if (parseInt(predictedSoil) > 40) {
              predictedWatering = "No!";
              predictedWateringReason = "Soil still moist — overwatering causes root rot";
            } else {
              predictedWatering = "No";
              predictedWateringReason = "Soil drying naturally — Snake Plants prefer this";
            }

            // Prediction chart for next 6 hours
            const hours = [1, 2, 3, 4, 5, 6];
            const tempPreds = hours.map(h => Math.round(latest.temp + tempDelta * h));
            const soilPreds = hours.map(h => Math.min(100, Math.max(0, Math.round(latest.soil + soilDelta * h + (rain ? 2 : 0)))));
            predChartData = {
              labels: hours.map(h => `+${h}h`),
              datasets: [
                {
                  label: "Predicted Temp (°C)",
                  data: tempPreds,
                  borderColor: "#f87171",
                  backgroundColor: "rgba(248,113,113,0.1)",
                  tension: 0.4,
                  pointRadius: 2,
                  yAxisID: 'y'
                },
                {
                  label: "Predicted Soil (%)",
                  data: soilPreds,
                  borderColor: "#22d3ee",
                  backgroundColor: "rgba(34,211,238,0.1)",
                  tension: 0.4,
                  pointRadius: 2,
                  yAxisID: 'y1'
                }
              ]
            };
          }

          setPredTemp(predictedTemp);
          setPredTempSource(predictedTempSource);
          setPredSoil(predictedSoil);
          setPredSoilSource(predictedSoilSource);
          setPredWatering(predictedWatering);
          setPredWateringReason(predictedWateringReason);
          setPredictionChartData(predChartData);
        } else {
          setMlTrend("--");
          setMlTrendDesc("Analyzing patterns...");
          setMlCycle("--");
          setMlCycleDesc("Learning cycles...");
          setMlAnomaly("--");
          setMlAnomalyDesc("Checking anomalies...");
          setMlConfidence("--");
          setMlConfidenceFill(0);
          setMlInsights([{icon: "⏳", text: "Need more data points for ML analysis. Keep sensors running...", confidence: 0}]);
          setAnalysisDetails([]);

          setPredTemp("--");
          setPredSoilSource("--");
          setPredWatering("--");
          setPredWateringReason("--");
          setPredictionChartData(null);
        }
      }

      fetchData();
      // Realtime subscription to update UI when new readings/alerts are inserted
      let readingsChannel: any = null;
      let alertsChannel: any = null;
      try {
        if ((supabase as any).channel) {
          // Supabase v2 realtime
          readingsChannel = (supabase as any).channel('realtime-readings')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'readings' }, (payload: any) => {
              console.log('[Realtime] new reading received', payload);
              const newRow = payload.record || payload.new || payload;
              if (newRow) {
                setSensorReadings(prev => {
                  const next = (prev || []).concat(clampReading(newRow));
                  return next.slice(-48);
                });
                // Trigger an immediate full fetch to keep all derived state consistent
                try { fetchData(); } catch (e) { /* ignore */ }
              }
            })
            .subscribe();

          alertsChannel = (supabase as any).channel('realtime-alerts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (payload: any) => {
              console.log('[Realtime] new alert received', payload);
              const newRow = payload.record || payload.new || payload;
              if (newRow) {
                setAlerts(prev => [newRow].concat(prev || []).slice(0, 50));
                try { fetchData(); } catch (e) { /* ignore */ }
              }
            })
            .subscribe();
        } else if ((supabase as any).from) {
          // Fallback older API
          readingsChannel = (supabase as any)
            .from('readings')
            .on('INSERT', (payload: any) => {
              console.log('[Realtime-fallback] new reading', payload);
              const newRow = payload.new || payload.record || payload;
              if (newRow) {
                setSensorReadings(prev => (prev || []).concat(clampReading(newRow)).slice(-48));
                try { fetchData(); } catch (e) { /* ignore */ }
              }
            })
            .subscribe();

          alertsChannel = (supabase as any)
            .from('alerts')
            .on('INSERT', (payload: any) => {
              console.log('[Realtime-fallback] new alert', payload);
              const newRow = payload.new || payload.record || payload;
              if (newRow) {
                setAlerts(prev => [newRow].concat(prev || []).slice(0, 50));
                try { fetchData(); } catch (e) { /* ignore */ }
              }
            })
            .subscribe();
        }
      } catch (e) {
        console.warn('[Dashboard] realtime subscription setup failed', e);
      }
      const interval = setInterval(fetchData, POLL_INTERVAL_MS);
      return () => {
        clearInterval(interval);
        try {
          if (readingsChannel && typeof readingsChannel.unsubscribe === 'function') readingsChannel.unsubscribe();
          if (alertsChannel && typeof alertsChannel.unsubscribe === 'function') alertsChannel.unsubscribe();
        } catch (e) { /* ignore */ }
      };
    }, [supabase]);

  return (
    <>
      {/* Header */}
      <header className="header">
        <h1>🌱 Smart Plant Monitoring</h1>
        <p className="subtitle">Real-time environmental analytics & predictions</p>
        <div className="connection-status">
          <div className="status-dot"></div>
            <span>Live • Updating every 30s</span>
            <button onClick={manualRefresh} style={{ marginLeft: 12, padding: '6px 10px', borderRadius: 6, background: '#334155', color: '#fff', border: 'none', cursor: 'pointer' }}>Refresh</button>
        </div>
      </header>

      {error && (
        <div className="error-banner" style={{ padding: "1rem", backgroundColor: "#fee2e2", color: "#dc2626", margin: "1rem", borderRadius: "8px" }}>
          Error fetching data: {error}
        </div>
      )}

      {/* Stats Overview */}
      <section className="stats-container">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="icon">🌡️</div>
            <div className="value" id="currentTemp">{currentTemp}</div>
            <div className="label">Temperature (°C)</div>
            <div className={trendBadges.temp.className} id="tempTrendBadge">{trendBadges.temp.text}</div>
          </div>
          <div className="stat-card">
            <div className="icon">💧</div>
            <div className="value" id="currentSoil">{currentSoil}</div>
            <div className="label">Soil Moisture (%)</div>
            <div className={trendBadges.soil.className} id="soilTrendBadge">{trendBadges.soil.text}</div>
          </div>
          <div className="stat-card">
            <div className="icon">💡</div>
            <div className="value" id="currentLight">{currentLight}</div>
            <div className="label">Light Intensity (%)</div>
            <div className={trendBadges.light.className} id="lightTrendBadge">{trendBadges.light.text}</div>
          </div>
          <div className="stat-card">
            <div className="icon">💨</div>
            <div className="value" id="currentHumidity">{currentHumidity}</div>
            <div className="label">Humidity (%)</div>
            <div className={trendBadges.humidity.className} id="humidityTrendBadge">{trendBadges.humidity.text}</div>
          </div>
        </div>
      </section>


      {/* Weather Widget */} 
      <section className="stats-container">
        <div className="weather-widget" id="weatherWidget">
          <div className="weather-main">
            <div className="weather-icon" id="weatherIcon">{weather?.weather?.[0]?.icon ? (
              <img src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`} alt="" style={{width: 48, height: 48}} />
            ) : "🌤️"}</div>
            <div className="weather-info">
              <h4 id="weatherTemp">{weather?.main?.temp !== undefined ? `${Math.round(weather.main.temp)}°C` : "--°C"}</h4>
              <div className="weather-desc" id="weatherDesc">{weather?.weather?.[0]?.description ? weather.weather[0].description : "Loading weather..."}</div>
              <div style={{ color: "#60a5fa", fontSize: "0.85rem" }} id="weatherLocation">📍 {weather?.name || WEATHER_CITY}, India</div>
            </div>
          </div>
          <div className="weather-details">
            <div className="weather-detail">💧 Humidity: <span id="weatherHumidity">{weather?.main?.humidity ?? "--"}</span>%</div>
            <div className="weather-detail">🌬️ Wind: <span id="weatherWind">{weather?.wind?.speed ?? "--"}</span> m/s</div>
            <div className="weather-detail">👁️ Visibility: <span id="weatherVisibility">{weather?.visibility !== undefined ? (weather.visibility/1000).toFixed(1) : "--"}</span> km</div>
            <div className="weather-detail">🌡️ Feels like: <span id="weatherFeels">{weather?.main?.feels_like !== undefined ? Math.round(weather.main.feels_like) : "--"}</span>°C</div>
          </div>
          <div className="weather-alerts" id="weatherAlerts"></div>
        </div>
      </section>

      {/* Health Indicator */}
      <section className="health-section">
        <div className="health-bar-container">
          <div className="health-label">
            <h3>🏥 Overall Plant Health</h3>
            <span className="health-score" id="healthScore" style={{ color: healthScore === '--' ? undefined : (parseInt(healthScore) > 70 ? "#4ade80" : parseInt(healthScore) > 40 ? "#fbbf24" : "#f87171") }}>{healthScore}</span>
          </div>
          <div className="health-bar">
            <div className="health-bar-fill" id="healthBarFill" style={{ width: healthBarFill, background: healthBarColor }}></div>
          </div>
          <div className="health-tips" id="healthTips">
            {healthTips.map((tip, idx) => (
              <span className={`health-tip tip-${tip.type}`} key={idx}>{tip.text}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Main Dashboard Grid */}
      <main className="dashboard-grid">
        {/* Temperature Chart */}
        <div className="card">
          <h3>🌡️ Temperature Trend (24h)</h3>
          {tempData && <ChartLine data={tempData} options={{
            responsive: true,
            plugins: {
              legend: { labels: { color: '#e2e8f0' } },
              title: { display: false }
            },
            scales: {
              x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
              y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' }, suggestedMin: 0, suggestedMax: 50 }
            }
          }} />}
        </div>
        <div className="card">
          <h3>💧 Soil Moisture Trend (24h)</h3>
          {soilData && <ChartLine data={soilData} options={{
            responsive: true,
            plugins: {
              legend: { labels: { color: '#e2e8f0' } },
              title: { display: false }
            },
            scales: {
              x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
              y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' }, suggestedMin: 0, suggestedMax: 100 }
            }
          }} />}
        </div>

        {/* Multi-Metric Chart */}
        <div className="card">
          <h3>📊 All Sensors Overview</h3>
          {multiChartData && (
            <ChartLine
              data={multiChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: { labels: { color: '#e2e8f0', font: { size: 12 } } },
                  title: { display: false }
                },
                scales: {
                  x: { ticks: { color: '#94a3b8', maxRotation: 45 }, grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: 'Time', color: '#e2e8f0', font: { size: 12, weight: 'bold' } } },
                  y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' }, suggestedMin: 0, suggestedMax: 100, title: { display: true, text: 'Sensor Values (Normalized)', color: '#a78bfa', font: { size: 12, weight: 'bold' } } }
                }
              }}
            />
          )}
        </div>

        {/* System Health Radar */}
        <div className="card">
          <h3>⚡ System Health Score</h3>
          {radarData && (
            <Radar
              data={radarData}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                  r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { color: '#94a3b8', backdropColor: 'transparent' },
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    pointLabels: { color: '#e2e8f0' }
                  }
                }
              }}
            />
          )}
        </div>

        {/* Recent Alerts */}
        <div className="card">
          <h3>🚨 Recent Alerts</h3>
          <div className="alert-list" id="alertList">
            {alerts && alerts.length > 0 ? (
              alerts.slice(0, 10).map((alert, idx) => {
                const alertIcons: any = {
                  soil_dry: "🌵",
                  soil_wet: "💦",
                  temp_high: "🔥",
                  temp_low: "❄️",
                  light_low: "🌑",
                  light_high: "☀️",
                  humidity_high: "🌫️",
                  humidity_low: "🏜️",
                  // ESP32 human-readable format mappings
                  "Soil too dry": "🌵",
                  "Soil too wet": "💦",
                  "Temp too high": "🔥",
                  "Temp too low": "❄️",
                  "Low light": "🌑",
                  "High humidity": "🌫️",
                  "Low humidity": "🏜️",
                  "Plant Alert": "🚨"
                };
                const severity = alert.severity || "info";
                const type = alert.type || "unknown";
                const icon = alertIcons[type] || "⚠️";
                const time = new Date(alert.triggered_at).toLocaleString();
                return (
                  <div className={`alert-item alert-${severity}`} key={idx}>
                    <div className="alert-icon">{icon}</div>
                    <div className="alert-content">
                      <div className="alert-type">{type.replace(/_/g, " ")}</div>
                      <div className="alert-time">{time}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="no-alerts">
                <div className="icon">✅</div>
                <p>No recent alerts — your plant is happy!</p>
              </div>
            )}
          </div>
        </div>

        {/* Predictions */}
        <div className="card">
          <h3>🔮 Weather-Aware Predictions</h3>
          <div className="predictions-grid">
            <div className="prediction-card">
              <div className="pred-value" id="predTemp">{predTemp}</div>
              <div className="pred-label">Expected Temp</div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 4 }} id="predTempSource">{predTempSource}</div>
            </div>
            <div className="prediction-card">
              <div className="pred-value" id="predSoil">{predSoil}</div>
              <div className="pred-label">Expected Soil</div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 4 }} id="predSoilSource">{predSoilSource}</div>
            </div>
            <div className="prediction-card">
              <div className="pred-value" id="predWatering">{predWatering}</div>
              <div className="pred-label">Watering Need</div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 4 }} id="predWateringReason">{predWateringReason}</div>
            </div>
          </div>
          {predictionChartData && (
            <ChartLine
              data={predictionChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: { labels: { color: '#e2e8f0', font: { size: 12 } } },
                  title: { display: false }
                },
                scales: {
                  x: { ticks: { color: '#94a3b8', maxRotation: 45 }, grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: 'Future Time (Hours)', color: '#e2e8f0', font: { size: 12, weight: 'bold' } } },
                  y: { // left axis for temperature
                    type: 'linear',
                    position: 'left',
                    ticks: { color: '#f87171' },
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    suggestedMin: 0,
                    suggestedMax: 50,
                    title: { display: true, text: 'Temperature (°C)', color: '#f87171', font: { size: 12, weight: 'bold' } }
                  },
                  y1: { // right axis for soil moisture
                    type: 'linear',
                    position: 'right',
                    ticks: { color: '#22d3ee' },
                    grid: { drawOnChartArea: false },
                    suggestedMin: 0,
                    suggestedMax: 100,
                    title: { display: true, text: 'Soil Moisture (%)', color: '#22d3ee', font: { size: 12, weight: 'bold' } }
                  }
                }
              }}
            />
          )}
        </div>

        {/* Daily Averages (Past 7 Days) */}
        <div className="card">
          <h3>📅 Daily Averages (Past 7 Days)</h3>
          {dailyAverages.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', color: '#94a3b8' }}>Day</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', color: '#f87171' }}>🌡️ Temp</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', color: '#22d3ee' }}>💧 Soil</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', color: '#fbbf24' }}>💡 Light</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', color: '#a78bfa' }}>💨 Hum</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', color: '#94a3b8' }}>Readings</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyAverages.map((d, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px 12px', color: '#e2e8f0' }}>{d.day}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#f87171' }}>{d.temp}°C</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#22d3ee' }}>{d.soil}%</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#fbbf24' }}>{d.light}%</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#a78bfa' }}>{d.humidity}%</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#94a3b8' }}>{d.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: 16 }}>No data yet — daily averages will appear as readings accumulate.</p>
          )}
        </div>

        {/* Weekly Health Averages (Past 7 Weeks) */}
        <div className="card">
          <h3>📊 Weekly Health Overview (Past 7 Weeks)</h3>
          {weeklyHealthAverages.length > 0 ? (
            <div>
              {weeklyHealthAverages.map((w, idx) => {
                const color = w.health > 70 ? '#4ade80' : w.health > 40 ? '#fbbf24' : '#f87171';
                return (
                  <div key={idx} style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{w.week}</span>
                      <span style={{ color, fontWeight: 700, fontSize: '1.1rem' }}>{w.health}%</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${w.health}%`, background: color, borderRadius: 4, transition: 'width 0.5s ease' }}></div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: '0.8rem', color: '#94a3b8' }}>
                      <span>🌡️ {w.avgTemp}°C avg</span>
                      <span>💧 {w.avgSoil}% soil avg</span>
                      <span>📈 {w.count} readings</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: 16 }}>No weekly data yet — health trends will appear after a few weeks of monitoring.</p>
          )}
        </div>

        {/* Statistical Pattern Analysis */}
        <div className="card ml-section">
          <div className="ml-header">
            <h3>🧠 Statistical Pattern Analysis</h3>
            <span className="ml-badge">Linear Regression + Z-Score</span>
          </div>
          <div className="patterns-grid" id="patternsGrid">
            <div className="pattern-card">
              <div className="pattern-icon">📈</div>
              <div className="pattern-title">Trend Detection</div>
              <div className="pattern-value" id="mlTrend">{mlTrend}</div>
              <div className="pattern-desc" id="mlTrendDesc">{mlTrendDesc}</div>
            </div>
            <div className="pattern-card">
              <div className="pattern-icon">🔄</div>
              <div className="pattern-title">Daily Cycle</div>
              <div className="pattern-value" id="mlCycle">{mlCycle}</div>
              <div className="pattern-desc" id="mlCycleDesc">{mlCycleDesc}</div>
            </div>
            <div className="pattern-card">
              <div className="pattern-icon">⚠️</div>
              <div className="pattern-title">Anomaly Score</div>
              <div className="pattern-value" id="mlAnomaly" style={{ color: parseInt(mlAnomaly) > 50 ? '#f87171' : '#4ade80' }}>{mlAnomaly}</div>
              <div className="pattern-desc" id="mlAnomalyDesc">{mlAnomalyDesc}</div>
            </div>
            <div className="pattern-card">
              <div className="pattern-icon">🎯</div>
              <div className="pattern-title">Confidence</div>
              <div className="pattern-value" id="mlConfidence">{mlConfidence}</div>
              <div className="confidence-bar"><div className="confidence-fill" id="confidenceFill" style={{ width: `${mlConfidenceFill}%`, background: 'linear-gradient(90deg, #ec4899, #8b5cf6)' }}></div></div>
            </div>
          </div>
          <div className="ml-insights">
            <h4>🔍 ML Insights & Recommendations</h4>
            <div id="mlInsights">
              {mlInsights.map((insight, idx) => (
                <div className="insight-item" key={idx}>
                  <span style={{ fontSize: '1.2rem' }}>{insight.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div>{insight.text}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
                      Confidence: {insight.confidence}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="analysis-details">
            <h4>🧮 Analysis Details & Formulas</h4>
            {analysisDetails.length > 0 ? (
              <div className="analysis-grid">
                {analysisDetails.map((section, idx) => (
                  <div className="analysis-card" key={idx}>
                    <div className="analysis-title">{section.title}</div>
                    <div className="analysis-formula">{section.formula}</div>
                    <div className="analysis-values">
                      {section.values.map((item, valueIdx) => (
                        <div className="analysis-row" key={valueIdx}>
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="analysis-empty">Collecting enough readings to show formulas and intermediate values.</p>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>🌱 Smart Plant Monitoring System v2.0</p>
        <p className="last-updated">Last updated: <span id="lastUpdate">{lastUpdate}</span></p>
      </footer>
    </>
  );
};

// If config is missing, export the small placeholder component instead of the full Dashboard
export default (MISSING_CONFIG ? DashboardMissingConfig : Dashboard);