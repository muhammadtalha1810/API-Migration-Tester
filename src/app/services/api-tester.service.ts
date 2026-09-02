import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiConfig, ApiResponse, HttpMethod, KeyValue } from '../models/api-config.model';

@Injectable({ providedIn: 'root' })
export class ApiTesterService {
  constructor(private http: HttpClient) {}

  async executePair(
    legacyApi: ApiConfig,
    migratedApi: ApiConfig,
    payload: unknown,
    overrides?: { pathParams?: KeyValue[]; queryParams?: KeyValue[] }
  ): Promise<{ legacy: ApiResponse | null; migrated: ApiResponse | null }> {
    const legacyConfig = overrides?.pathParams || overrides?.queryParams
      ? { ...legacyApi, pathParams: overrides.pathParams ?? legacyApi.pathParams, queryParams: overrides.queryParams ?? legacyApi.queryParams }
      : legacyApi;
    const migratedConfig = overrides?.pathParams || overrides?.queryParams
      ? { ...migratedApi, pathParams: overrides.pathParams ?? migratedApi.pathParams, queryParams: overrides.queryParams ?? migratedApi.queryParams }
      : migratedApi;

    const [legacy, migrated] = await Promise.all([
      this.callApi(legacyConfig, payload).catch((err) => this.errorResponse(err)),
      this.callApi(migratedConfig, payload).catch((err) => this.errorResponse(err)),
    ]);

    return { legacy, migrated };
  }

  async executeBatch(
    legacyApi: ApiConfig,
    migratedApi: ApiConfig,
    payloads: Array<{ id: string; payload: unknown; pathParams?: KeyValue[]; queryParams?: KeyValue[] }>,
    concurrency: number,
    onProgress: (id: string, result: { legacy: ApiResponse | null; migrated: ApiResponse | null }) => void
  ): Promise<void> {
    const queue = [...payloads];
    const running: Promise<void>[] = [];

    const runNext = async (): Promise<void> => {
      while (queue.length > 0) {
        const item = queue.shift()!;
        const result = await this.executePair(legacyApi, migratedApi, item.payload, {
          pathParams: item.pathParams,
          queryParams: item.queryParams,
        });
        onProgress(item.id, result);
      }
    };

    for (let i = 0; i < Math.min(concurrency, payloads.length); i++) {
      running.push(runNext());
    }

    await Promise.all(running);
  }

  private buildUrl(config: ApiConfig, payload: unknown): string {
    let url = config.url;

    // Replace path parameters {key} with values from pathParams or payload
    if (config.pathParams?.length) {
      for (const param of config.pathParams) {
        if (param.key && param.value) {
          url = url.replace(new RegExp(`\\{${param.key}\\}`, 'g'), encodeURIComponent(param.value));
        }
      }
    }

    // Also replace any {key} placeholders from payload if it's an object
    if (payload && typeof payload === 'object') {
      const obj = payload as Record<string, unknown>;
      const matches = url.match(/\{(\w+)\}/g);
      if (matches) {
        for (const match of matches) {
          const key = match.slice(1, -1);
          if (key in obj && obj[key] !== null && obj[key] !== undefined) {
            url = url.replace(match, encodeURIComponent(String(obj[key])));
          }
        }
      }
    }

    // Append query parameters
    if (config.queryParams?.length) {
      const validParams = config.queryParams.filter((p) => p.key && p.value);
      if (validParams.length > 0) {
        const queryString = validParams
          .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
          .join('&');
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }

    return url;
  }

  private hasBody(method: HttpMethod): boolean {
    return method !== 'GET' && method !== 'DELETE';
  }

  private async callApi(config: ApiConfig, payload: unknown): Promise<ApiResponse> {
    const headers = this.buildHeaders(config);
    const url = this.buildUrl(config, payload);
    const body = this.hasBody(config.method)
      ? (typeof payload === 'string' ? payload : JSON.stringify(payload))
      : undefined;

    const startTime = performance.now();

    const response = await firstValueFrom(
      this.http.request(config.method, url, {
        headers,
        body: body ?? '',
        observe: 'response',
        responseType: 'text',
      })
    );

    const responseTime = Math.round(performance.now() - startTime);
    const responseHeaders: Record<string, string> = {};
    response.headers.keys().forEach((key: string) => {
      responseHeaders[key] = response.headers.get(key) ?? '';
    });

    return {
      statusCode: response.status,
      body: response.body ?? '',
      headers: responseHeaders,
      responseTime,
    };
  }

  private buildHeaders(config: ApiConfig): HttpHeaders {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    if (config.bearerToken) {
      headers = headers.set('Authorization', `Bearer ${config.bearerToken}`);
    }

    for (const header of config.headers) {
      if (header.key && header.value) {
        headers = headers.set(header.key, header.value);
      }
    }

    return headers;
  }

  private errorResponse(err: unknown): ApiResponse {
    const status = (err as { status?: number })?.status ?? 0;
    const message =
      (err as { message?: string })?.message ??
      (err as { error?: string })?.error ??
      'Network error';
    return {
      statusCode: status,
      body: JSON.stringify({ error: message }),
      headers: {},
      responseTime: 0,
    };
  }
}
