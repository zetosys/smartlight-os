# Hardware Abstraction Layer & OEM Adapter Integration

## 1. Architectural Philosophy
SmartLight OS is designed to be completely **vendor-agnostic**. Municipalities frequently procure streetlight luminaires, drivers, and CCMS panels from multiple competitive OEMs across tender cycles. The platform decouples core business logic (RBAC, scheduling, fault tripping, GIS visualization) from device-level communication protocols.

```
+-----------------------------------------------------------------------------------+
|                        SmartLight OS Core Domain Services                         |
|                   (CommandsService, TelemetryService, AssetsService)              |
+-----------------------------------------+-----------------------------------------+
                                          |
                        DeviceAdapter Typed Interface Contract
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                            AdapterRegistry (Singleton)                            |
|             Maps device.adapterKey -> Concrete DeviceAdapter Instance             |
+------------+--------------------+---------------------+---------------------------+
             |                    |                     |
             v                    v                     v
   +-------------------+ +------------------+ +-------------------+
   |  SimulatorAdapter | |  VendorA_LoRaWAN | |  VendorB_Modbus   |
   | (Deterministic)   | |  (Actility/Chirp)| |  (RS-485 CCMS)    |
   +-------------------+ +------------------+ +-------------------+
```

---

## 2. The `DeviceAdapter` Interface Contract

Every hardware adapter implements the `DeviceAdapter` interface defined in `@smartlight/device-contracts`:

```typescript
export interface DeviceAdapter {
  readonly id: string;
  readonly name: string;
  readonly protocol: 'MQTT' | 'LORA' | 'COAP' | 'MODBUS' | 'SIMULATOR';

  /**
   * Returns supported capabilities of a target device model.
   * Enables the API to reject unsupported commands before dispatch.
   */
  capabilities(deviceId: string): Promise<DeviceCapabilities>;

  /**
   * Dispatches a single control command (ON, OFF, DIM, REBOOT) to the physical controller.
   */
  sendCommand(command: DeviceCommand): Promise<CommandDispatchResult>;

  /**
   * Dispatches an aggregated batch command to a feeder panel or group controller.
   */
  sendBatchCommand?(batch: BatchDeviceCommand): Promise<BatchDispatchResult>;

  /**
   * Actively polls status or ping the device if the transport supports polling.
   */
  getStatus(deviceId: string): Promise<TelemetryReading | null>;
}
```

### Supported Capabilities
The `DeviceCapabilities` structure informs the UI and API what actions are permissible:
- `canSwitch`: boolean (relay ON/OFF capability)
- `canDim`: boolean (supports 0-10V, DALI, or PWM dimming)
- `dimmingMin`: number (e.g. 20%)
- `dimmingMax`: number (e.g. 100%)
- `supportsAstronomical`: boolean (onboard astronomical clock)
- `supportedMetrics`: string[] (e.g. `['voltage', 'current', 'power', 'power_factor', 'frequency', 'lux']`)

---

## 3. Simulator Adapter (`SimulatorAdapter`)
The monorepo includes a deterministic simulator adapter (`apps/simulator`) that emulates:
- **4,608 Streetlight Controllers** (Luminaire NEMA/Zhaga receptacles and CCMS panels).
- **Physical Wattage Realism**:
  - 35W LED Luminaire: Draws 34.0–35.8W when active, 0.0W when switched OFF.
  - 70W LED Luminaire: Draws 68.5–71.5W when active, 0.0W when switched OFF.
  - 110W LED Luminaire: Draws 108.0–112.5W when active, 0.0W when switched OFF.
- **Power Factor**: Typical 0.96–0.99 for modern electronic LED drivers.
- **Controlled Fault Injection**: Allows automated test suites to inject lamp failures, severe grid surges (> 260V), daytime burning, and offline communication timeouts.

---

## 4. OEM Onboarding Guide (Step-by-Step)

To integrate a new hardware vendor (e.g. Havells CCMS panel or Bajaj LoRaWAN node):

1. **Create Adapter Package or Module**:
   Implement `DeviceAdapter` within a new directory or module (e.g. `apps/api/src/adapters/vendor-x.adapter.ts`).
2. **Translate Payloads**:
   Map incoming OEM hexadecimal or JSON telemetry into the standard `TelemetryReading` interface.
3. **Register Adapter**:
   In the application bootstrap, register the adapter with the singleton registry:
   ```typescript
   adapterRegistry.register(new VendorXAdapter(configService, mqttService));
   ```
4. **Provision Device Models**:
   Assign the new `adapter_key` in the `device_models` table:
   ```sql
   INSERT INTO device_models (id, name, manufacturer, adapter_key)
   VALUES ('dm-vendor-x-ccms', 'VendorX-SmartPanel-V2', 'VendorX Inc', 'VENDOR_X');
   ```
5. **No Core Changes Required**:
   The control room UI, astronomical schedules, PostGIS spatial layers, and maintenance ticketing work immediately with the newly added hardware without modifying a single line of business logic.
