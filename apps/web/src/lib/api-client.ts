const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

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

  public static async fetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_BASE_URL}${cleanEndpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-ulb-id': this.activeUlbId,
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const res = await fetch(url, {
        ...options,
        headers,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `API error ${res.status}: ${res.statusText}`);
      }

      return await res.json();
    } catch (err: any) {
      // If server is not reachable, rethrow with friendly message
      if (err.message.includes('fetch failed') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch')) {
        throw new Error(`API Offline: Unable to connect to backend at ${API_BASE_URL}. Ensure apps/api is running.`);
      }
      throw err;
    }
  }
}
