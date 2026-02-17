export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface ApiClientConfig {
  baseUrl: string;
  isDemo: boolean;
}

export async function apiFetch<T>(
  config: ApiClientConfig,
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...options.headers as Record<string, string>,
    };
    if (config.isDemo) {
      headers["X-Demo-Mode"] = "true";
    }

    const res = await fetch(`${config.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const text = await res.text();
      return { data: null, error: text || `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: (err as Error).message };
  }
}
