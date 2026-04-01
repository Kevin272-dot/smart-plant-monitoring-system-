# CHAPTER 4: REFERENCES AND BIBLIOGRAPHY

The following resources, technical documentation, academic online journals, and official service API guidelines were extensively consulted during the research, architectural design, and programmatic implementation of the Smart Plant Monitoring System.

## 4.1 ACADEMIC JOURNALS AND LITERATURE
[1] Al-Fuqaha, A., Guizani, M., Mohammadi, M., Aledhari, M., & Ayyash, M. (2015). "Internet of Things: A Survey on Enabling Technologies, Protocols, and Applications." *IEEE Communications Surveys & Tutorials*, 17(4), 2347-2376. This paper provided foundational knowledge regarding lightweight publishing protocols and state-driven IoT design architectures.

[2] Ray, P. P. (2017). "Internet of Things for Smart Agriculture: Technologies, Practices and Future Direction." *Journal of Ambient Intelligence and Smart Environments*, 8(4), 395-420. Consulted for establishing the biological thresholds and the general paradigms of translating physical earthly states to digital datasets.

[3] Tzounis, A., Katsoulas, N., Bartzanas, T., & Kittas, C. (2017). "Internet of Things in agriculture, recent advances and future challenges." *Biosystems Engineering*, 164, 31-48. Reviewed for understanding the deployment considerations of wireless sensor networks (WSN) in agricultural environments and their physical limitations.

[4] Deterding, S., Dixon, D., Khaled, R., & Nacke, L. (2011). "From Game Design Elements to Gamefulness: Defining Gamification." *Proceedings of the 15th International Academic MindTrek Conference*. Used to inform the UX design of the "Plant Care Streaks" and Gamification logic implemented via the React Dashboard.

[5] Bojkeska, K., et al. (2020). "Smart Agriculture using IoT and Machine Learning: A Review." *International Journal of Computer Applications*. Consulted for the Chapter 3 Future Scope section regarding the integration of predictive Time-Series machine learning architectures (ARIMA) into PostgreSQL datasets.

[6] Kassim, M. R. M. (2020). "IoT Applications in Smart Agriculture: Issues and Challenges." *IEEE Conference on Open Systems (ICOS)*. Retrieved from IEEE Xplore. Consulted for assessing network resilience protocols for localized sensor nodes.

[7] Goumopoulos, C., O'Flynn, B., & Thanos, A. (2014). "Automated Zone-Specific Irrigation with Wireless Sensor/Actuator Network and Interactable Decision Support." *Computers and Electronics in Agriculture*. Used extensively to model the "Future Scope" proposals regarding physical actuator integration.

[8] Kamienski, C., et al. (2019). "Smart Water Management Platform: IoT-Based Precision Irrigation for Agriculture." *Sensors (Basel)*. Retrieved from PubMed Central. Evaluated for understanding threshold-based watering mechanisms triggered by deep-state moisture analytics.

## 4.2 TECHNICAL DATASHEETS AND MICROCONTROLLER SPECIFICATIONS
[9] Espressif Systems. (2023). *ESP32 Series Datasheet*. V3.9. Retrieved from https://www.espressif.com. The primary hardware engineering guide used for understanding GPIO pin mapping, ADC (Analog-to-Digital) conversion limits for the soil sensor, and 2.4GHz Wi-Fi baseband protocols.

[10] Aosong Electronics. (2020). *DHT22 (AM2302) Digital Temperature and Humidity Sensor Technical Manual*. Used to dictate the asynchronous polling rate configuration in the C++ firmware, strictly adhering to the 2000ms minimum interval requirement to prevent sensor thermal-lock.

[11] Texas Instruments. (2018). *LM393 Dual Differential Comparator Datasheet*. Referenced for calibrating the analog threshold sensitivity of the resistive soil moisture probe's onboard voltage comparator.

## 4.3 CLOUD INFRASTRUCTURE AND DATABASE DOCUMENTATION
[12] Supabase Inc. (2024). *Supabase Official Documentation: PostgreSQL, Row Level Security, and Realtime*. Retrieved from https://supabase.com/docs. Exhaustively utilized to architect the standard database schema, enable the Server-Sent Events (SSE) stream to the React frontend, and heavily lock down the architecture using RLS (Row-Level Security) policies.

[13] Deno Land Inc. (2024). *Deno Runtime and Edge Functions Documentation*. Retrieved from https://deno.land/manual. Consulted for authoring the V8-engine JavaScript backend triggers. Guided the implementation of the `soil_alert` and `daily_report` serverless pipelines using Deno's strictly typed asynchronous execution model.

[14] PostgreSQL Global Development Group. (2024). *PostgreSQL 15.0 Documentation*. Retrieved from https://www.postgresql.org/docs/. Referenced for optimal table indexing practices, Timestamp configurations natively (timestamptz), and relational foreign-key structuring between the `readings` and `alerts` tables.

## 4.4 SOFTWARE FRAMEWORKS AND FRONTEND LIBRARIES
[15] Meta Platforms, Inc. (2024). *React Documentation: Hooks, State, and Lifecycle*. Retrieved from https://react.dev/. Formed the engineering basis for the asynchronous dashboard. Specifically, `useEffect` and `useState` documentation were heavily relied upon to manage the complex real-time data streams injected by the Supabase client without causing DOM memory leaks.

[16] Microsoft Corporation. (2024). *TypeScript: Typed JavaScript at Any Scale*. Retrieved from https://www.typescriptlang.org/docs/. The syntax definition source guiding all proprietary strict interface models defining Botanical Telemetry, Alert Payloads, and API response structures.

[17] Chart.js Contributors. (2023). *Chart.js Documentation: Responsive HTML5 Charts*. Retrieved from https://www.chartjs.org/docs/latest/. Consulted for rendering the localized time-series visual matrices using specific linear scales and deeply reactive rendering canvases.

[18] Mozilla Developer Network (MDN). (2024). *Web Speech API: SpeechSynthesis*. Retrieved from https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API. The primary architectural blueprint used to design and engineer the local accessibility enhancements (Text-to-Speech system) outputting localized botanical status arrays.

## 4.5 EXTERNAL APIS AND SERVICES
[19] Twilio Inc. (2024). *Twilio REST API Documentation - Programmable SMS*. Retrieved from https://www.twilio.com/docs/sms/api. Utilized for configuring the `fetch()` payload syntax inside the Deno Edge Functions, managing security headers, and properly formatting the outbound JSON string arrays required to invoke asynchronous user text-messages.

[20] OpenWeather Ltd. (2024). *OpenWeatherMap API: Current Weather Data*. Retrieved from https://openweathermap.org/api. Referenced for structuring the geographic coordinate strings and parsing the resultant JSON payload to embed external environmental relativity into the localized plant telemetry.

[21] Sarvam AI. (2024). *Sarvam API Documentation: Generative AI and Text-to-Speech*. Retrieved from https://sarvam.ai/docs. Consulted extensively for architectural research on bridging next-generation TTS capabilities and contextual AI insights, allowing the plant avatar system to eventually support deeply localized output models beyond standard english constraints via its proprietary API frameworks.

[22] Vercel Inc. (2024). *Vercel Deployment and CI/CD Pipelines*. Retrieved from https://vercel.com/docs. Used to configure the `vercel.json` routing, manage the encrypted environmental production keys, and orchestrate the Vite-based continuous integration builds.

[23] OpenAI. (2024). *OpenAI API Reference*. Retrieved from https://platform.openai.com/docs/api-reference. Reviewed for modeling the "Rule-Based AI" logic structuring before translating deterministic matrices into edge-hosted frameworks.

[24] GitHub Inc. (2024). *GitHub REST API Documentation*. Retrieved from https://docs.github.com/en/rest. Referenced for evaluating CI/CD webhook integrations to automate the frontend continuous deployment pipelines.