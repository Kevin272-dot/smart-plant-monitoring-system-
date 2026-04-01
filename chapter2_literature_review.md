# CHAPTER 2: LITERATURE REVIEW

## 2.1 Introduction
This chapter provides a comprehensive review of existing literature related to precision agriculture and indoor smart plant monitoring systems. It establishes the foundational context for the proposed project by examining previous studies, commercially available botanical monitoring solutions, and technological advancements within IoT and environmental telemetry.

## 2.2 Existing Botanical Monitoring Systems
Traditional plant care relies heavily on manual intervention and visual observation, which often leads to inconsistent hydration. Early technological interventions introduced basic analog soil moisture probes that trigger a localized LED or buzzer. While these provide fundamental localized feedback, they lack data logging capabilities, remote accessibility, and comprehensive multi-parameter environmental tracking.

## 2.3 Survey on IoT-Based Plant Care
Recent advancements have introduced smart botanical systems leveraging IoT technologies to track localized microclimates. Various studies indicate that integrating microcontrollers (like the ESP32) with capacitive soil sensors, DHT22 thermal/humidity sensors, and photoresistors significantly reduces plant mortality. Many modern solutions push telemetry to cloud architectures like Firebase or Supabase to render data visually via connected web dashboards.

## 2.4 Gap Analysis
Despite the progression in consumer-grade smart pots and monitoring arrays, a significant gap remains in developing low-cost, fully decoupled systems that provide proactive, out-of-band notifications. Most existing solutions are either locked inside expensive proprietary ecosystems, limited to Bluetooth-only local ranges, or lack the intelligence to trigger autonomous external alerts (e.g., automated SMS via Twilio) when a plant reaches critical physiological distress.
