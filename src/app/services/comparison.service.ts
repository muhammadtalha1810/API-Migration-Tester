import { Injectable } from '@angular/core';
import { ApiResponse } from '../models/api-config.model';

@Injectable({ providedIn: 'root' })
export class ComparisonService {
  private volatileHeaders = new Set([
    'date',
    'server',
    'x-powered-by',
    'x-aspnet-version',
    'x-aspnetmvc-version',
    'connection',
    'transfer-encoding',
    'content-length',
  ]);

  compare(legacy: ApiResponse, migrated: ApiResponse): boolean {
    if (legacy.statusCode !== migrated.statusCode) return true;

    if (!this.bodiesEqual(legacy.body, migrated.body)) return true;

    return false;
  }

  private bodiesEqual(bodyA: string, bodyB: string): boolean {
    const parsedA = this.tryParseJson(bodyA);
    const parsedB = this.tryParseJson(bodyB);

    if (parsedA !== null && parsedB !== null) {
      return this.deepEqual(parsedA, parsedB);
    }

    return bodyA.trim() === bodyB.trim();
  }

  private tryParseJson(body: string): unknown | null {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }

  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a === null || b === null) return a === b;
    if (typeof a !== 'object') return a === b;

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, idx) => this.deepEqual(item, b[idx]));
    }

    if (!Array.isArray(a) && !Array.isArray(b)) {
      const keysA = Object.keys(a as Record<string, unknown>);
      const keysB = Object.keys(b as Record<string, unknown>);
      if (keysA.length !== keysB.length) return false;
      return keysA.every((key) =>
        this.deepEqual(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key]
        )
      );
    }

    return false;
  }

  private headersEqual(
    headersA: Record<string, string>,
    headersB: Record<string, string>
  ): boolean {
    const filteredA = this.filterVolatile(headersA);
    const filteredB = this.filterVolatile(headersB);
    const keysA = Object.keys(filteredA);
    const keysB = Object.keys(filteredB);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(
      (key) => filteredA[key].toLowerCase() === (filteredB[key] ?? '').toLowerCase()
    );
  }

  private filterVolatile(headers: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (!this.volatileHeaders.has(key.toLowerCase())) {
        result[key] = value;
      }
      }
    return result;
  }
}
