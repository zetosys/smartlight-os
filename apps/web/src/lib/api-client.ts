const RAW_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const API_BASE_URL = RAW_BASE.replace(/\/+$/, '') + '/';

export class ApiClient {
  private static token: string | null = null;
  private static activeUlbId: string = '11111111-1111-1111-1111-111111111111';

  public static setToken(token: string | null) {
    this.token = token;
  }

  public static getToken(): string | null {
    return this.token;
  }

  public static setActiveUlbId(ulbId: string) {
    this.activeUlbId = ulbId;
  }

  public static getActiveUlbId(): string {
    return this.activeUlbId;
  }

  public static async fetch<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (endpoint.includes('://') || endpoint.includes('..')) {
      throw new Error('Invalid relative API endpoint');
    }
    const relativeEndpoint = endpoint.replace(/^\/+/, '');
    const targetUrl = new URL(relativeEndpoint, API_BASE_URL);
    const baseParsed = new URL(API_BASE_URL);

    if (targetUrl.origin !== baseParsed.origin || !targetUrl.pathname.startsWith(baseParsed.pathname)) {
      throw new Error('SSRF blocked: cross-origin destination prohibited');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-ulb-id': this.activeUlbId,
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      // nosemgrep
      const res = await fetch(targetUrl.href, { // nosemgrep
        ...options,
        headers,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `API error ${res.status}: ${res.statusText}`);
      }

      return (await res.json()) as T;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // If server is not reachable, rethrow with friendly message
      if (msg.includes('fetch failed') || msg.includes('NetworkError') || msg.includes('Failed to fetch')) {
        throw new Error(`API Offline: Unable to connect to backend at ${API_BASE_URL}. Ensure apps/api is running.`);
      }
      throw err;
    }
  }
}
