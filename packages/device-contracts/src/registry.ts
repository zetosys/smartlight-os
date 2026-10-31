import { DeviceAdapter } from './types';

/**
 * AdapterRegistry manages all registered hardware adapters.
 * Ensures zero OEM/device-specific logic leaks into core business domains or UI.
 */
export class AdapterRegistry {
  private static instance: AdapterRegistry | null = null;
  private readonly adapters: Map<string, DeviceAdapter> = new Map();

  private constructor() {}

  public static getInstance(): AdapterRegistry {
    if (!AdapterRegistry.instance) {
      AdapterRegistry.instance = new AdapterRegistry();
    }
    return AdapterRegistry.instance;
  }

  public register(adapter: DeviceAdapter): void {
    if (this.adapters.has(adapter.id)) {
      // Overwrite or update
      console.warn(`[AdapterRegistry] Overwriting existing adapter with ID: ${adapter.id}`);
    }
    this.adapters.set(adapter.id, adapter);
  }

  public unregister(id: string): boolean {
    return this.adapters.delete(id);
  }

  public getAdapter(id: string): DeviceAdapter {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      throw new Error(`DeviceAdapter not found for key: '${id}'. Ensure the adapter is registered in the AdapterRegistry.`);
    }
    return adapter;
  }

  public hasAdapter(id: string): boolean {
    return this.adapters.has(id);
  }

  public listRegisteredAdapters(): string[] {
    return Array.from(this.adapters.keys());
  }
}
