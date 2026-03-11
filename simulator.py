"""Sensor simulator aligned with the ESP32 sketch flow."""

import sys
import os
import random
import time
from datetime import datetime
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, Optional, Tuple

import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# ═══════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL") or os.environ.get(
    "SUPABASE_URL", "https://yhgyeaygmampbvfanumx.supabase.co"
)
SUPABASE_KEY = os.environ.get("VITE_SUPABASE_KEY") or os.environ.get("SUPABASE_KEY", "")
READINGS_ENDPOINT = f"{SUPABASE_URL}/rest/v1/readings"
SOIL_ALERT_ENDPOINT = f"{SUPABASE_URL}/functions/v1/soil_alert"

# Simulation settings
INTERVAL_SECONDS = 30
MAX_RETRIES = 3
RETRY_DELAY = 5


class SimulationMode(Enum):
    """Different simulation scenarios for testing"""
    NORMAL = "normal"           # Typical healthy plant conditions
    DRY_SOIL = "dry_soil"       # Simulates drought conditions
    HOT_WEATHER = "hot_weather" # Simulates heat wave
    NIGHT_TIME = "night_time"   # Low light conditions
    RANDOM = "random"           # Fully random values


@dataclass
class SensorThresholds:
    """Defines healthy ranges for each sensor (all values as percentages to match ESP32)"""
    soil_min: int = 20
    soil_max: int = 60
    light_min: int = 10
    light_max: int = 80
    temp_min: float = 24.0
    temp_max: float = 35.0
    humidity_min: float = 40.0
    humidity_max: float = 80.0


@dataclass
class AlertCheckResult:
    """Captures the soil_alert function result for logging."""

    success: bool
    status_code: int
    response_text: str
    response_json: Optional[Dict[str, Any]] = None


# ═══════════════════════════════════════════════════════════════════
# SENSOR DATA GENERATOR
# ═══════════════════════════════════════════════════════════════════

class SensorSimulator:
    """Generates realistic sensor data based on simulation mode"""
    
    def __init__(self, mode: SimulationMode = SimulationMode.NORMAL):
        self.mode = mode
        self.thresholds = SensorThresholds()
        self._reading_count = 0
        
    def generate_reading(self) -> Dict[str, Any]:
        """Generate a sensor reading based on current mode"""
        self._reading_count += 1
        
        if self.mode == SimulationMode.DRY_SOIL:
            return self._generate_dry_soil_reading()
        elif self.mode == SimulationMode.HOT_WEATHER:
            return self._generate_hot_weather_reading()
        elif self.mode == SimulationMode.NIGHT_TIME:
            return self._generate_night_reading()
        elif self.mode == SimulationMode.RANDOM:
            return self._generate_random_reading()
        else:
            return self._generate_normal_reading()
    
    def _generate_normal_reading(self) -> Dict[str, Any]:
        """Normal healthy plant conditions (percentage values matching ESP32)"""
        return {
            "soil": random.randint(25, 45),
            "light": random.randint(30, 70),
            "temp": random.randint(26, 30),
            "humidity": random.randint(50, 70),
        }
    
    def _generate_dry_soil_reading(self) -> Dict[str, Any]:
        """Simulates drought - soil moisture decreasing over time"""
        base_soil = max(2, 40 - (self._reading_count * 2))
        return {
            "soil": random.randint(max(0, base_soil - 3), min(100, base_soil + 3)),
            "light": random.randint(40, 75),
            "temp": random.randint(30, 34),
            "humidity": random.randint(35, 50),
        }
    
    def _generate_hot_weather_reading(self) -> Dict[str, Any]:
        """Simulates heat wave conditions"""
        return {
            "soil": random.randint(10, 30),
            "light": random.randint(75, 95),
            "temp": random.randint(34, 40),
            "humidity": random.randint(30, 45),
        }
    
    def _generate_night_reading(self) -> Dict[str, Any]:
        """Simulates nighttime conditions"""
        return {
            "soil": random.randint(25, 45),
            "light": random.randint(0, 5),
            "temp": random.randint(20, 25),
            "humidity": random.randint(60, 80),
        }
    
    def _generate_random_reading(self) -> Dict[str, Any]:
        """Fully random values within hardware limits"""
        return {
            "soil": random.randint(self.thresholds.soil_min, self.thresholds.soil_max),
            "light": random.randint(self.thresholds.light_min, self.thresholds.light_max),
            "temp": random.randint(int(self.thresholds.temp_min), int(self.thresholds.temp_max)),
            "humidity": random.randint(int(self.thresholds.humidity_min), int(self.thresholds.humidity_max)),
        }
    
    def generate_alert_reading(self) -> Dict[str, Any]:
        """Generate a slightly abnormal reading that still crosses one alert threshold."""
        alert_types = [
            "soil_dry",
            "soil_wet", 
            "temp_high",
            "temp_low",
            "light_low",
            "humidity_high",
            "humidity_low"
        ]
        
        chosen_alert = random.choice(alert_types)
        
        # Start with normal values (percentage-based to match ESP32)
        reading = {
            "soil": random.randint(25, 45),
            "light": random.randint(30, 70),
            "temp": random.randint(26, 30),
            "humidity": random.randint(50, 70),
        }
        
        # Use values just beyond the threshold so the alert is realistic, not extreme.
        if chosen_alert == "soil_dry":
            reading["soil"] = random.randint(8, 9)
        elif chosen_alert == "soil_wet":
            reading["soil"] = random.randint(81, 83)
        elif chosen_alert == "temp_high":
            reading["temp"] = random.randint(36, 37)
        elif chosen_alert == "temp_low":
            reading["temp"] = random.randint(13, 14)
        elif chosen_alert == "light_low":
            reading["light"] = random.randint(3, 4)
        elif chosen_alert == "humidity_high":
            reading["humidity"] = random.randint(81, 83)
        elif chosen_alert == "humidity_low":
            reading["humidity"] = random.randint(28, 29)
        
        print(f"  ⚡ ALERT TEST: Mild '{chosen_alert}' threshold breach")
        reading["_alert_type"] = chosen_alert  # Store alert type for later use
        return reading


# ═══════════════════════════════════════════════════════════════════
# API CLIENT
# ═══════════════════════════════════════════════════════════════════

class SupabaseClient:
    """Handles communication with Supabase API"""
    
    def __init__(self, url: str, key: str):
        self.url = url
        self.key = key
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
    
    def send_reading(self, data: Dict[str, Any]) -> bool:
        """Send sensor reading to Supabase with retry logic"""
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                response = requests.post(
                    READINGS_ENDPOINT,
                    headers=self.headers,
                    json=data,
                    timeout=10
                )
                
                if response.status_code in (200, 201):
                    return True
                else:
                    print(f"  ⚠️  API returned {response.status_code}: {response.text}")
                    
            except requests.exceptions.Timeout:
                print(f"  ⏱️  Timeout on attempt {attempt}/{MAX_RETRIES}")
            except requests.exceptions.ConnectionError:
                print(f"  🔌 Connection error on attempt {attempt}/{MAX_RETRIES}")
            except Exception as e:
                print(f"  ❌ Error: {e}")
            
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY)
        
        return False
    
    def trigger_alert_check(self) -> AlertCheckResult:
        """Invoke the edge function that applies thresholds, cooldowns, and SMS sending."""
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.key}",
        }

        try:
            response = requests.post(
                SOIL_ALERT_ENDPOINT,
                headers=headers,
                json={},
                timeout=15,
            )

            parsed_json: Optional[Dict[str, Any]] = None
            try:
                parsed_json = response.json()
            except ValueError:
                parsed_json = None

            return AlertCheckResult(
                success=response.ok,
                status_code=response.status_code,
                response_text=response.text,
                response_json=parsed_json,
            )
        except Exception as error:
            return AlertCheckResult(
                success=False,
                status_code=0,
                response_text=str(error),
                response_json=None,
            )


# ═══════════════════════════════════════════════════════════════════
# DISPLAY UTILITIES
# ═══════════════════════════════════════════════════════════════════

def print_banner():
    """Display startup banner"""
    print("\n" + "═" * 60)
    print("  🌱 SMART PLANT MONITORING SYSTEM - SIMULATOR")
    print("═" * 60)
    print(f"  📡 Endpoint: {SUPABASE_URL}")
    print(f"  🗄️  Readings API: {READINGS_ENDPOINT}")
    print(f"  ⚙️  Edge Function: {SOIL_ALERT_ENDPOINT}")
    print(f"  ⏱️  Interval: {INTERVAL_SECONDS} seconds")
    print("═" * 60 + "\n")


def print_reading(data: Dict[str, Any], success: bool, count: int):
    """Pretty-print a sensor reading"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    status = "✅" if success else "❌"
    
    print(f"[{timestamp}] Reading #{count} {status}")
    print(f"  💧 Soil: {data['soil']:>5}  |  💡 Light: {data['light']:>5}")
    print(f"  🌡️  Temp: {data['temp']:>5}°C |  💨 Humidity: {data['humidity']:>5}%")
    print("-" * 50)


def get_led_state(data: Dict[str, Any]) -> Tuple[str, str]:
    """Mirror the ESP32 LED logic for console visibility."""
    if data["soil"] < 30 or data["light"] < 10 or data["light"] > 90:
        return "RED", "Plant needs attention"
    if 30 <= data["soil"] <= 50:
        return "YELLOW", "Borderline moisture range"
    return "GREEN", "Healthy LED state"


def print_alert_result(result: AlertCheckResult):
    """Summarize the soil_alert edge function response."""
    status = "✅" if result.success else "❌"
    print(f"  {status} Alert check HTTP: {result.status_code}")

    if result.response_json:
        payload = result.response_json
        if payload.get("error"):
            print(f"  ⚠️  Function error: {payload['error']}")
        if payload.get("details"):
            print(f"  🧾 Details: {payload['details']}")
        print(
            "  🔔 Alerts: detected={0} triggered={1} sms_sent={2}".format(
                payload.get("alerts_detected", "?"),
                payload.get("alerts_triggered", "?"),
                payload.get("notification_sent", False),
            )
        )
        if payload.get("notification_error"):
            print(f"  ⚠️  SMS error: {payload['notification_error']}")
        if payload.get("missing_twilio_config"):
            missing = ", ".join(payload["missing_twilio_config"])
            print(f"  ⚠️  Missing Twilio config: {missing}")
    elif result.response_text:
        print(f"  🧾 Alert response: {result.response_text}")


def get_health_status(data: Dict[str, Any]) -> str:
    """Analyze reading and return health status"""
    issues = []
    
    if data['soil'] < 10:
        issues.append("🚨 Soil too dry!")
    elif data['soil'] > 80:
        issues.append("💦 Soil too wet!")
    
    if data['temp'] > 35:
        issues.append("🔥 Too hot!")
    elif data['temp'] < 15:
        issues.append("❄️ Too cold!")
    
    if data['light'] < 5:
        issues.append("🌑 Low light!")
    
    if data['humidity'] < 30:
        issues.append("🏜️ Low humidity!")
    elif data['humidity'] > 80:
        issues.append("🌫️ High humidity!")
    
    return " | ".join(issues) if issues else "✅ Plant healthy!"


# ═══════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════════

def main():
    """Main execution loop"""
    # Parse command line argument for simulation mode
    mode = SimulationMode.NORMAL
    if len(sys.argv) > 1:
        mode_arg = sys.argv[1].lower()
        try:
            mode = SimulationMode(mode_arg)
        except ValueError:
            print(f"Unknown mode '{mode_arg}'. Using 'normal'.")
            print(f"Available modes: {[m.value for m in SimulationMode]}")
    
    print_banner()
    print(f"  🎮 Simulation Mode: {mode.value.upper()}")
    print("  Press Ctrl+C to stop\n")
    
    simulator = SensorSimulator(mode)
    client = SupabaseClient(SUPABASE_URL, SUPABASE_KEY)

    if not SUPABASE_KEY:
        print("Missing SUPABASE_KEY or VITE_SUPABASE_KEY in the environment.")
        sys.exit(1)
    
    reading_count = 0
    success_count = 0
    
    try:
        while True:
            reading_count += 1
            
            # Every 10th reading, generate a mild threshold breach that should still alert.
            if reading_count % 10 == 0:
                print("\n" + "="*50)
                print("  🚨 ALERT TEST READING (every 10th reading)")
                print("="*50)
                data = simulator.generate_alert_reading()
                data.pop("_alert_type", None)
            else:
                data = simulator.generate_reading()
            
            success = client.send_reading(data)
            alert_result = None
            
            if success:
                success_count += 1
                alert_result = client.trigger_alert_check()
            
            print_reading(data, success, reading_count)
            print(f"  {get_health_status(data)}")
            led_color, led_message = get_led_state(data)
            print(f"  💡 LED: {led_color} | {led_message}")
            if alert_result is not None:
                print_alert_result(alert_result)
            print(f"  📊 Success rate: {success_count}/{reading_count} ({100*success_count/reading_count:.1f}%)\n")
            
            time.sleep(INTERVAL_SECONDS)
            
    except KeyboardInterrupt:
        print("\n\n" + "═" * 60)
        print("  🛑 Simulator stopped by user")
        print(f"  📊 Total readings: {reading_count}")
        print(f"  ✅ Successful: {success_count}")
        print(f"  ❌ Failed: {reading_count - success_count}")
        print("═" * 60 + "\n")


if __name__ == "__main__":
    main()
