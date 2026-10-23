# Astronomical Ephemeris & Automated Scheduling Engine

## 1. Astronomical Solar Algorithm (NOAA / Jean Meeus)

SmartLight OS eliminates the failure-prone physical photocell / LDR sensor by embedding an astronomical ephemeris engine directly into the backend (`SolarCalculator`). The calculator implements the standard National Oceanic and Atmospheric Administration (**NOAA**) solar position algorithm based on Jean Meeus' *Astronomical Algorithms*.

### Geographic Coordinate Profiles
The engine computes daily solar coordinates specific to each municipal territory:
- **Ganderbal Municipal Council**: Latitude `34.2165° N`, Longitude `74.7725° E`, Timezone `UTC+05:30` (IST).
- **Katra Municipal Committee**: Latitude `32.9925° N`, Longitude `74.9318° E`, Timezone `UTC+05:30` (IST).

### Mathematical Model
For any given Julian date $d$ and observer coordinates $(\phi, \lambda)$:
1. **Fractional Year ($\gamma$)**:
   $$\gamma = \frac{2\pi}{365} \cdot (\text{day\_of\_year} - 1)$$
2. **Equation of Time ($E_{qt}$ in minutes)**:
   $$E_{qt} = 229.18 \cdot (0.000075 + 0.001868\cos\gamma - 0.032077\sin\gamma - 0.014615\cos 2\gamma - 0.040849\sin 2\gamma)$$
3. **Solar Declination Angle ($\delta$ in radians)**:
   $$\delta = 0.006918 - 0.399912\cos\gamma + 0.070257\sin\gamma - 0.006758\cos 2\gamma + 0.000907\sin 2\gamma$$
4. **Hour Angle ($\omega_0$) for Standard Horizon ($90.833^\circ$) and Civil Twilight ($96.0^\circ$)**:
   $$\cos\omega_0 = \frac{\cos(90.833^\circ) - \sin\phi\sin\delta}{\cos\phi\cos\delta}$$
5. **Sunrise, Sunset, Dawn, and Dusk (UTC Minutes)**:
   $$\text{Solar Noon} = 720 - 4\lambda - E_{qt}$$
   $$\text{Sunrise} = \text{Solar Noon} - 4\omega_0$$
   $$\text{Sunset} = \text{Solar Noon} + 4\omega_0$$
   $$\text{Civil Dawn/Dusk} = \text{Solar Noon} \mp 4\omega_{\text{civil}}$$

---

## 2. Ephemeris Accuracy & Verification
The engine correctly reflects seasonal shifts:
- **Summer Solstice (June 21)**: Day length extends to ~14 hours 25 minutes. Lights turn ON late (~19:50 IST) and turn OFF early (~05:15 IST).
- **Winter Solstice (December 21)**: Day length contracts to ~9 hours 50 minutes. Lights turn ON early (~17:35 IST) and turn OFF late (~07:25 IST).
- **Civil Twilight Offsets**: The system allows municipal engineers to configure a $\pm 15$ minute offset relative to civil sunset (`duskCivil`) to account for mountainous terrain shadows in the Kashmir Valley and Trikuta foothills.

---

## 3. Automated Eco-Dimming Curves

SmartLight OS implements energy conservation through multi-tier progressive dimming schedules throughout the night:

```
Brightness %
 100% |===========+
      |           | (Full brightness during evening peak traffic)
  80% |           +===========+
      |                       | (Moderate traffic reduction)
  60% |                       +===========+
      |                                   | (Midnight curfew / low pedestrian activity)
  40% |                                   +===========+
      |                                               |
   0% +-----------------------------------------------+=========== (Dawn OFF)
     Sunset     22:00       00:00       04:00       Sunrise
```

### Scheduled Dimming Profile
1. **Civil Dusk (Nightfall)**: 100% Brightness (Turn ON). Maximum illumination during high traffic and pedestrian transit.
2. **22:00 IST (Late Evening)**: 80% Brightness. Modest 15-20% energy saving with negligible visual perception loss.
3. **00:00 IST (Midnight)**: 60% Brightness. Municipal streets quiet down; maintains public safety while slashing peak power demand.
4. **04:00 IST (Early Morning)**: 40% Brightness. Minimal vehicular transit.
5. **Civil Dawn (Daybreak)**: Turn OFF. Automated relay trip before sunrise occurs.

---

## 4. Automated Cron Scheduler & Batch Fan-Out
- The `SchedulingService` runs periodically (or via webhook trigger).
- It queries active schedules for each ULB, computes the exact solar ephemeris for the day, and checks if the current time matches an automated threshold.
- When triggered, it invokes `CommandsService.submitBatchCommand` using deterministic idempotency keys (`sched-${id}-${date}-${slot}`), ensuring exact single execution across distributed instances.
