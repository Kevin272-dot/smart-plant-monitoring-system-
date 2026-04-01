# RESULTS AND DISCUSSIONS

## 1. OVERVIEW OF SYSTEM PERFORMANCE
The Smart Plant Monitoring System was rigorously tested under various environmental conditions to evaluate the accuracy of the hardware sensors, the responsiveness of the cloud architecture, and the reliability of the notification pipeline. The results demonstrate a highly cohesive integration between the localized physical environment and the digital monitoring dashboard.

## 2. HARDWARE SENSOR EVALUATION
The physical sensor array (ESP32, DHT22, Soil Moisture Probe, and LDR) effectively captured real-time fluctuations in the plant's microclimate.

*   **Soil Moisture:** The corrosion-resistant probe accurately mapped hydration levels. When watering the plant, an immediate spike in volumetric moisture was recorded, rapidly climbing into the optimal saturation range (10% - 80%).
*   **Ambient Temperature & Humidity:** The DHT22 sensor consistently tracked localized thermal variations in alignment with physical room changes.
*   **Light Exposure:** The LDR successfully differentiated between direct sunlight hours and shaded/artificial lighting environments.

> **[PLACEHOLDER: Insert Screenshot of Hardware Assembly / Local OLED display or Serial Monitor output here]**
> `![Hardware Sensor Output Placeholder](./screenshots/hardware_output.png)`

## 3. REAL-TIME DASHBOARD AND TELEMETRY
The React-based frontend dashboard successfully established robust connections with the Supabase backend. The telemetry data mapped seamlessly onto the Chart.js visual graphs with minimal latency.

*   **Metric Visualization:** The four primary status cards displayed accurate live values, mirroring the physical readings transmitted by the embedded hardware.
*   **Time-Series Tracking:** The historical line graphs plotted precise environmental data, allowing for easy identification of parameter anomalies over a 24-hour testing cycle.

> **[PLACEHOLDER: Insert Screenshot of the Web UI Dashboard / Real-Time Metric Cards here]**
> `![Web Dashboard Placeholder](./screenshots/web_dashboard.png)`

## 4. NOTIFICATION AND ALERTING SYSTEM
The alerting pipeline—powered by Deno Edge Functions and Twilio API—was tested by intentionally simulating critical physiological boundaries (e.g., removing the soil probe to simulate 0% moisture).

*   **Trigger Accuracy:** The `soil_alert` engine executed natively and instantly upon the database commit.
*   **SMS Delivery:** The Twilio service successfully dispatched the critical warning SMS to the registered mobile device without significant delay.
*   **Cooldown Mechanism:** The programmed 30-minute throttling cooldown functioned exactly as intended, gracefully suppressing redundant SMS spam while the hardware remained in a critical state.

> **[PLACEHOLDER: Insert Screenshot of Twilio SMS Alerts received on Mobile device here]**
> `![SMS Alert Placeholder](./screenshots/sms_alert.png)`

## 5. AI DIAGNOSTICS AND ACCESSIBILITY
The rule-based deterministic AI correctly interpreted the raw data arrays, translating them into human-readable diagnostic strings on the frontend. The dynamic avatar accurately transitioned to visual states (wilted vs. blooming) corresponding with current health scoring. Furthermore, the Text-to-Speech (TTS) auditory engine successfully vocalized the complete localized diagnostic report, confirming the systemic accessibility enhancements.

> **[PLACEHOLDER: Insert Screenshot of AI Diagnostic Text / Interactive Plant Avatar State here]**
> `![AI Diagnostic Placeholder](./screenshots/ai_diagnostics.png)`
