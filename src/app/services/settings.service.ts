import { Injectable, signal } from '@angular/core';
import { AiSettings, AiProvider } from '../models/api-config.model';

const STORAGE_KEY = 'api-tester-ai-settings';
const TOKEN_KEY = 'api-tester-bearer-token';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly settings = signal<AiSettings | null>(null);
  readonly bearerToken = signal<string>('');

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.settings.set(JSON.parse(raw));
      }
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        this.bearerToken.set(token);
      }
    } catch {
      // ignore parse errors
    }
  }

  save(settings: AiSettings): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    this.settings.set(settings);
  }

  saveBearerToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.bearerToken.set(token);
  }

  clearBearerToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.bearerToken.set('');
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.settings.set(null);
  }

  getOrThrow(): AiSettings {
    const s = this.settings();
    if (!s || !s.apiKey) {
      throw new Error('AI settings not configured. Please set API key in Settings.');
    }
    return s;
  }

  getDefaultModel(provider: AiProvider): string {
    switch (provider) {
      case 'openai':
        return 'gpt-4o';
      case 'anthropic':
        return 'claude-sonnet-4-20250514';
      case 'azure':
        return 'gpt-4o';
      case 'groq':
        return 'llama-3.3-70b-versatile';
    }
  }
}
