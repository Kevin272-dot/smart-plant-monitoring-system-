"""
🌱 Smart Plant Monitoring System - Sensor Simulator
====================================================
Simulates realistic sensor data for testing the cloud infrastructure.
Supports multiple simulation modes and configurable parameters.
"""

import requests
import random
import time
import sys
from datetime import datetime
from typing import Dict, Any
from dataclasses import dataclass
from enum import Enum

# ═══════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════

SUPABASE_URL = "https://yhgyeaygmampbvfanumx.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloZ3llYXlnbWFtcGJ2ZmFudW14Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ1OTc1MCwiZXhwIjoyMDgzMDM1NzUwfQ.76utBDw7G3jkYbTN51cZ7z39DBFYAMcNzpq6ct_YLXM"
API_ENDPOINT = f"{SUPABASE_URL}/rest/v1/readings"

# Simulation settings
INTERVAL_SECONDS = 15
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
    """Defines healthy ranges for each sensor"""
    soil_min: int = 1800
    soil_max: int = 2600
    light_min: int = 800
    light_max: int = 1800
    temp_min: float = 24.0
    temp_max: float = 35.0
    humidity_min: float = 40.0
    humidity_max: float = 80.0


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
        """Normal healthy plant conditions"""
        return {
            "soil": random.randint(2000, 2400),
            "light": random.randint(1000, 1500),
            "temp": round(random.uniform(26, 30), 1),
            "humidity": round(random.uniform(50, 70), 1)
        }
    
    def _generate_dry_soil_reading(self) -> Dict[str, Any]:
        """Simulates drought - soil moisture decreasing over time"""
        base_soil = max(1200, 2400 - (self._reading_count * 50))
        return {
            "soil": random.randint(base_soil - 100, base_soil + 100),
            "light": random.randint(1200, 1600),
            "temp": round(random.uniform(30, 34), 1),
            "humidity": round(random.uniform(35, 50), 1)
        }
    
    def _generate_hot_weather_reading(self) -> Dict[str, Any]:
        """Simulates heat wave conditions"""
        return {
            "soil": random.randint(1600, 2000),
            "light": random.randint(1500, 1800),
            "temp": round(random.uniform(34, 40), 1),
            "humidity": round(random.uniform(30, 45), 1)
        }
    
    def _generate_night_reading(self) -> Dict[str, Any]:
        """Simulates nighttime conditions"""
        return {
            "soil": random.randint(2000, 2400),
            "light": random.randint(0, 200),
            "temp": round(random.uniform(20, 25), 1),
            "humidity": round(random.uniform(60, 80), 1)
        }
    
    def _generate_random_reading(self) -> Dict[str, Any]:
        """Fully random values within hardware limits"""
        return {
            "soil": random.randint(self.thresholds.soil_min, self.thresholds.soil_max),
            "light": random.randint(self.thresholds.light_min, self.thresholds.light_max),
            "temp": round(random.uniform(self.thresholds.temp_min, self.thresholds.temp_max), 1),
            "humidity": round(random.uniform(self.thresholds.humidity_min, self.thresholds.humidity_max), 1)
        }


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
                    API_ENDPOINT,
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


# ═══════════════════════════════════════════════════════════════════
# DISPLAY UTILITIES
# ═══════════════════════════════════════════════════════════════════

def print_banner():
    """Display startup banner"""
    print("\n" + "═" * 60)
    print("  🌱 SMART PLANT MONITORING SYSTEM - SIMULATOR")
    print("═" * 60)
    print(f"  📡 Endpoint: {SUPABASE_URL}")
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


def get_health_status(data: Dict[str, Any]) -> str:
    """Analyze reading and return health status"""
    issues = []
    
    if data['soil'] < 1800:
        issues.append("🚨 Soil too dry!")
    elif data['soil'] > 2600:
        issues.append("💦 Soil too wet!")
    
    if data['temp'] > 35:
        issues.append("🔥 Too hot!")
    elif data['temp'] < 20:
        issues.append("❄️ Too cold!")
    
    if data['light'] < 500:
        issues.append("🌑 Low light!")
    
    if data['humidity'] < 40:
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
    
    reading_count = 0
    success_count = 0
    
    try:
        while True:
            reading_count += 1
            data = simulator.generate_reading()
            success = client.send_reading(data)
            
            if success:
                success_count += 1
            
            print_reading(data, success, reading_count)
            print(f"  {get_health_status(data)}")
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
