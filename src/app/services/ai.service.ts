import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { SettingsService } from './settings.service';
import { AiSettings, ApiConfig, KeyValue } from '../models/api-config.model';
import { BugReport } from '../models/session-state.model';

export interface GeneratedTestCase {
  payload: unknown;
  description?: string;
  pathParams?: KeyValue[];
  queryParams?: KeyValue[];
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private http = inject(HttpClient);
  private settingsService = inject(SettingsService);

  async generateTestCases(
    samplePayload: string,
    rules: string,
    apiConfig?: ApiConfig
  ): Promise<GeneratedTestCase[]> {
    const settings = this.settingsService.getOrThrow();
    const hasPayload = !!samplePayload && samplePayload.trim().length > 0;
    const isGetLike = apiConfig && (apiConfig.method === 'GET' || apiConfig.method === 'DELETE');

    let systemPrompt: string;
    let userPrompt: string;

    if (isGetLike && !hasPayload) {
      systemPrompt = `You are an API test case generator for a ${apiConfig!.method} endpoint. Given the URL, path parameters, query parameters, and rules/boundary conditions, generate all possible meaningful test cases. Consider:
- Boundary values for path and query parameters
- Edge cases (null, empty, max length, special characters, invalid IDs)
- Data type variations (string vs number, negative numbers, zero, very large numbers)
- Missing or extra query parameters
- Validation rules described by user
Return ONLY a JSON array of objects. Each object must have:
- "pathParams": array of {key, value} objects for path parameter test values
- "queryParams": array of {key, value} objects for query parameter test values
- "description": string explaining the test case
Do not include any other text.`;

      const pathParamsStr = apiConfig!.pathParams?.length
        ? apiConfig!.pathParams.map(p => `${p.key}`).join(', ')
        : 'none';
      const queryParamsStr = apiConfig!.queryParams?.length
        ? apiConfig!.queryParams.map(p => `${p.key}`).join(', ')
        : 'none';

      userPrompt = `HTTP Method: ${apiConfig!.method}
URL: ${apiConfig!.url}
Path parameters: ${pathParamsStr}
Query parameters: ${queryParamsStr}

Rules and boundary conditions:
${rules}

Generate all meaningful test cases as a JSON array. For each test case, provide the pathParams and queryParams values to use.`;
    } else {
      systemPrompt = `You are an API test case generator. Given a sample JSON payload and rules/boundary conditions, generate all possible meaningful test case payloads. Consider:
- Boundary values mentioned in rules
- Edge cases (null, empty, max length, special characters)
- Data type variations
- Validation rules described by user
Return ONLY a JSON array of objects. Each object must have a "payload" field (the complete API request body) and an optional "description" field explaining the test case. Do not include any other text.`;

      userPrompt = `Sample payload:
${samplePayload}

Rules and boundary conditions:
${rules}

Generate all meaningful test case payloads as a JSON array.`;
    }

    try {
      const result = await this.callAi(settings, systemPrompt, userPrompt);
      const parsed = this.parseTestCases(result);
      if (parsed.length > 0) return parsed;
      throw new Error('AI returned no test cases');
    } catch (err) {
      if (this.isTruncationError(err)) {
        return await this.generateInBatches(settings, samplePayload, rules, apiConfig);
      }
      throw err;
    }
  }

  private async generateInBatches(
    settings: AiSettings,
    samplePayload: string,
    rules: string,
    apiConfig?: ApiConfig
  ): Promise<GeneratedTestCase[]> {
    const allCases: GeneratedTestCase[] = [];
    const batchSize = 10;
    let batchNum = 0;
    const isGetLike = apiConfig && (apiConfig.method === 'GET' || apiConfig.method === 'DELETE');
    const hasPayload = !!samplePayload && samplePayload.trim().length > 0;

    while (true) {
      let systemPrompt: string;
      let userPrompt: string;

      if (isGetLike && !hasPayload) {
        const pathParamsStr = apiConfig!.pathParams?.length
          ? apiConfig!.pathParams.map(p => `${p.key}`).join(', ')
          : 'none';
        const queryParamsStr = apiConfig!.queryParams?.length
          ? apiConfig!.queryParams.map(p => `${p.key}`).join(', ')
          : 'none';

        systemPrompt = `You are an API test case generator for a ${apiConfig!.method} endpoint. Generate test cases in batches of ${batchSize}. Return ONLY a JSON array of objects with "pathParams" (array of {key, value}), "queryParams" (array of {key, value}), and "description" fields. If there are no more test cases, return an empty array [].`;

        userPrompt = `HTTP Method: ${apiConfig!.method}
URL: ${apiConfig!.url}
Path parameters: ${pathParamsStr}
Query parameters: ${queryParamsStr}

Rules and boundary conditions:
${rules}

${batchNum === 0 ? 'Start from the first batch.' : `Previous batches generated ${allCases.length} cases. Generate the next batch of up to ${batchSize} cases. Do not repeat previous cases.`}

Generate batch ${batchNum + 1} as a JSON array.`;
      } else {
        systemPrompt = `You are an API test case generator. Generate test case payloads in batches of ${batchSize}. Return ONLY a JSON array of objects with "payload" and optional "description" fields. If there are no more test cases to generate, return an empty array [].`;

        userPrompt = `Sample payload:
${samplePayload}

Rules and boundary conditions:
${rules}

${batchNum === 0 ? 'Start from the first batch.' : `Previous batches generated ${allCases.length} cases. Generate the next batch of up to ${batchSize} cases. Do not repeat previous cases.`}

Generate batch ${batchNum + 1} as a JSON array.`;
      }

      const result = await this.callAi(settings, systemPrompt, userPrompt);
      const parsed = this.parseTestCases(result);
      if (parsed.length === 0) break;
      allCases.push(...parsed);
      if (parsed.length < batchSize) break;
      batchNum++;
    }

    return allCases;
  }

  async analyzeResponses(
    testCases: Array<{
      id: string;
      payload: unknown;
      legacyResponse: { statusCode: number; body: string };
      migratedResponse: { statusCode: number; body: string };
    }>
  ): Promise<BugReport[]> {
    if (testCases.length === 0) return [];

    const settings = this.settingsService.getOrThrow();
    const systemPrompt = `You are an API migration QA analyst. The legacy API is the source of truth. For each test case, you receive the payload sent, the legacy API response, and the migrated API response.
Compare them and identify bugs in the migrated API. For each bug found, return a JSON object:
{
  "testCaseId": "<id>",
  "title": "<short bug title>",
  "description": "<detailed description of the discrepancy>",
  "workflow": "<steps to reproduce>",
  "causes": "<likely root cause>",
  "helpfulInfo": "<suggestions for fixing>"
}
If a difference is acceptable (e.g., timestamp format change with same semantic value, different casing in non-functional headers), do not report it as a bug.
Return ONLY a JSON array of bug reports. Empty array if no bugs found.`;

    try {
      const userPrompt = this.buildAnalysisPrompt(testCases);
      const result = await this.callAi(settings, systemPrompt, userPrompt);
      return this.parseBugReports(result);
    } catch (err) {
      if (this.isTruncationError(err) && testCases.length > 5) {
        return await this.analyzeInBatches(settings, testCases);
      }
      throw err;
    }
  }

  private async analyzeInBatches(
    settings: AiSettings,
    testCases: Array<{
      id: string;
      payload: unknown;
      legacyResponse: { statusCode: number; body: string };
      migratedResponse: { statusCode: number; body: string };
    }>
  ): Promise<BugReport[]> {
    const allBugs: BugReport[] = [];
    const batchSize = 5;

    for (let i = 0; i < testCases.length; i += batchSize) {
      const batch = testCases.slice(i, i + batchSize);
      const systemPrompt = `You are an API migration QA analyst. The legacy API is the source of truth. Compare each test case's responses and identify bugs in the migrated API.
Return ONLY a JSON array of bug reports with fields: testCaseId, title, description, workflow, causes, helpfulInfo. Empty array if no bugs.`;

      const userPrompt = this.buildAnalysisPrompt(batch);
      const result = await this.callAi(settings, systemPrompt, userPrompt);
      const parsed = this.parseBugReports(result);
      allBugs.push(...parsed);
    }

    return allBugs;
  }

  private buildAnalysisPrompt(
    testCases: Array<{
      id: string;
      payload: unknown;
      legacyResponse: { statusCode: number; body: string };
      migratedResponse: { statusCode: number; body: string };
    }>
  ): string {
    const casesText = testCases
      .map(
        (tc, i) => `--- Test Case ${i + 1} (ID: ${tc.id}) ---
Payload: ${JSON.stringify(tc.payload, null, 2)}
Legacy Response [${tc.legacyResponse.statusCode}]: ${tc.legacyResponse.body}
Migrated Response [${tc.migratedResponse.statusCode}]: ${tc.migratedResponse.body}`
      )
      .join('\n\n');

    return `Analyze the following test cases for bugs in the migrated API:\n\n${casesText}`;
  }

  private async callAi(
    settings: AiSettings,
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    switch (settings.provider) {
      case 'openai':
        return this.callOpenAi(settings, systemPrompt, userPrompt);
      case 'anthropic':
        return this.callAnthropic(settings, systemPrompt, userPrompt);
      case 'azure':
        return this.callAzure(settings, systemPrompt, userPrompt);
      case 'groq':
        return this.callGroq(settings, systemPrompt, userPrompt);
    }
  }

  private async callOpenAi(
    settings: AiSettings,
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    const body = {
      model: settings.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    };

    const response = await firstValueFrom(
      this.http.post<OpenAiResponse>('https://api.openai.com/v1/chat/completions', body, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.apiKey}`,
        },
      })
    );

    const content = response.choices?.[0]?.message?.content ?? '';
    const finishReason = response.choices?.[0]?.finish_reason;
    if (finishReason === 'length') {
      throw { truncated: true, message: 'Response truncated due to token limit' };
    }
    return content;
  }

  private async callAnthropic(
    settings: AiSettings,
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    const body = {
      model: settings.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    };

    const response = await firstValueFrom(
      this.http.post<AnthropicResponse>(
        'https://api.anthropic.com/v1/messages',
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': settings.apiKey,
            'anthropic-version': '2023-06-01',
          },
        }
      )
    );

    const content = response.content?.[0]?.text ?? '';
    if (response.stop_reason === 'max_tokens') {
      throw { truncated: true, message: 'Response truncated due to token limit' };
    }
    return content;
  }

  private async callAzure(
    settings: AiSettings,
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    const endpoint = settings.azureEndpoint?.replace(/\/$/, '');
    const deployment = settings.azureDeploymentName || settings.model;
    const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-15-preview`;

    const body = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    };

    const response = await firstValueFrom(
      this.http.post<OpenAiResponse>(url, body, {
        headers: {
          'Content-Type': 'application/json',
          'api-key': settings.apiKey,
        },
      })
    );

    const content = response.choices?.[0]?.message?.content ?? '';
    const finishReason = response.choices?.[0]?.finish_reason;
    if (finishReason === 'length') {
      throw { truncated: true, message: 'Response truncated due to token limit' };
    }
    return content;
  }

  private async callGroq(
    settings: AiSettings,
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    const body = {
      model: settings.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    };

    const response = await firstValueFrom(
      this.http.post<OpenAiResponse>(
        'https://api.groq.com/openai/v1/chat/completions',
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${settings.apiKey}`,
          },
        }
      )
    );

    const content = response.choices?.[0]?.message?.content ?? '';
    const finishReason = response.choices?.[0]?.finish_reason;
    if (finishReason === 'length') {
      throw { truncated: true, message: 'Response truncated due to token limit' };
    }
    return content;
  }

  private isTruncationError(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      'truncated' in err &&
      (err as { truncated: boolean }).truncated === true
    );
  }

  private parseTestCases(content: string): GeneratedTestCase[] {
    const json = this.extractJson(content);
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === 'object' && ('payload' in item || 'pathParams' in item || 'queryParams' in item))
      .map((item) => ({
        payload: item.payload ?? null,
        description: item.description,
        pathParams: item.pathParams,
        queryParams: item.queryParams,
      }));
  }

  private parseBugReports(content: string): BugReport[] {
    const json = this.extractJson(content);
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        typeof item === 'object' &&
        'testCaseId' in item &&
        'title' in item
    ) as BugReport[];
  }

  private extractJson(content: string): string {
    let text = content.trim();

    // Strip markdown code fences
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    // Find the first JSON array or object
    const arrayStart = text.indexOf('[');
    const objectStart = text.indexOf('{');

    let start = -1;
    let end = -1;
    let openChar = '';
    let closeChar = '';

    if (arrayStart !== -1 && (objectStart === -1 || arrayStart < objectStart)) {
      start = arrayStart;
      openChar = '[';
      closeChar = ']';
    } else if (objectStart !== -1) {
      start = objectStart;
      openChar = '{';
      closeChar = '}';
    } else {
      return text;
    }

    let depth = 0;
    for (let i = start; i < text.length; i++) {
      if (text[i] === openChar) depth++;
      if (text[i] === closeChar) {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }

    if (end !== -1) {
      return text.substring(start, end + 1);
    }

    return text;
  }
}

interface OpenAiResponse {
  choices: Array<{
    message: { content: string };
    finish_reason: string;
  }>;
}

interface AnthropicResponse {
  content: Array<{ text: string }>;
  stop_reason: string;
}
