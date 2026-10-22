# Device Adapter Abstraction & Hardware Layer

## 1. Adapter Contract

All device communication is governed by the `DeviceAdapter` interface defined in `@smartlight/device-contracts`:

```typescript
export interface DeviceAdapter {
  readonly id: string;
  capabilities(deviceId: string): Promise<DeviceCapabilities>;
  sendCommand(command: DeviceCommand): Promise<CommandDispatch>;
  getStatus(deviceId: string): Promise<Telemetry | null>;
}
```

## 2. AdapterRegistry
The `AdapterRegistry` provides a centralized lookup mechanism:
- When a command is routed to a device, the system inspects `device.adapterKey` (e.g. `'SIMULATOR'`, `'OEM_VENDOR_A'`).
- The `AdapterRegistry` resolves the registered adapter instance.
- If the device model does not support the requested operation (checked via `capabilities(deviceId)`), the command is rejected immediately with a domain validation error before dispatch.

## 3. Simulator Implementation
For Prompt 0, the monorepo provides `SimulatorAdapter`:
- Emulates individual and group switching commands.
- Returns deterministic electrical values:
  - 35W luminaires: ~34-36W when ON, 0W when OFF.
  - 70W luminaires: ~68-72W when ON, 0W when OFF.
  - 110W luminaires: ~107-113W when ON, 0W when OFF.
- Supports fault injection for testing alerts and ticket workflows.
- Exposes clear `source: 'SIMULATOR'` in all emitted telemetry payloads.
