export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface KeyValue {
  key: string;
  value: string;
}

export interface ApiConfig {
  url: string;
  method: HttpMethod;
  bearerToken: string;
  useSettingsToken?: boolean;
  payload: string;
  headers: HeaderPair[];
  pathParams: KeyValue[];
  queryParams: KeyValue[];
}

export interface HeaderPair {
  key: string;
  value: string;
}

export interface ApiResponse {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
  responseTime: number;
}

export type AiProvider = 'openai' | 'anthropic' | 'azure' | 'groq';

export interface AiSettings {
  provider: AiProvider;
  model: string;
  apiKey: string;
  azureEndpoint?: string;
  azureDeploymentName?: string;
}

export interface ManualTestCaseGroup {
  id: number;
  testName: string;
  payload: string;
  pathParams: KeyValue[];
  queryParams: KeyValue[];
}
