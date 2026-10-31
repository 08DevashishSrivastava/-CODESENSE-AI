import { AnalysisPayload, AnalysisResult } from '../types/diagnostics';
import { UserSettings } from '../types/settings';

export class BackendApiClient {
  private static REQUEST_TIMEOUT_MS = 6000;

  static async checkHealth(backendUrl: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${backendUrl}/health`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(id);
      return res.ok;
    } catch {
      return false;
    }
  }

  static async analyze(
    payload: AnalysisPayload,
    settings: UserSettings,
    endpoint: 'analyze' | 'analyze/static' | 'analyze/ai' = 'analyze'
  ): Promise<AnalysisResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT_MS);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (settings.user_token) {
      headers['Authorization'] = `Bearer ${settings.user_token}`;
    }

    try {
      const url = `${settings.backend_url}/api/v1/${endpoint}`;
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`Backend responded with HTTP ${res.status}`);
      }

      const data = await res.json();
      return data as AnalysisResult;
    } catch (err: any) {
      clearTimeout(timer);
      console.warn('[CodeSense AI] Analysis API request failed:', err.message || err);
      throw err;
    }
  }
}
