# Simulator specification
Seed exact wattage distribution and ULB totals. Allocate Ganderbal 859/1542/339 and Katra 1364/381/123 for 35/70/110W respectively.
Models: ILCM, luminaire, feeder, gateway; configurable feeder-to-lamp associations. Scenario types: normal day/night, delayed ACK, dropped ACK, disconnected lamp, feeder outage, high voltage, energy anomaly, lamp failure, recovery, firmware mock lifecycle.
Telemetry: timestamp, deviceId, reportedOn, online, voltage, current, powerW, cumulativeEnergyKwh, burningHours, faultCodes, source=SIMULATOR. Energy delta = watts * elapsed hours / 1000 when on; account for outage and optional variation.
Deterministic random seed; time acceleration; bounded memory; scenario replay and export. For scale tests, generate events in batches, not a process per lamp.
