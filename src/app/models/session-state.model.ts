import { ApiResponse, ApiConfig, AiSettings, KeyValue } from './api-config.model';

export type SessionStatus =
  | 'configured'
  | 'generating'
  | 'executing'
  | 'analyzing'
  | 'complete';

export type TestCaseStatus = 'pending' | 'running' | 'done' | 'error';

export interface BugReport {
  testCaseId: string;
  title: string;
  description: string;
  workflow: string;
  causes: string;
  helpfulInfo: string;
}

export interface TestCase {
  id: string;
  payload: unknown;
  description?: string;
  pathParams?: KeyValue[];
  queryParams?: KeyValue[];
  status: TestCaseStatus;
  legacyResponse: ApiResponse | null;
  migratedResponse: ApiResponse | null;
  responsesDiffer: boolean | null;
  bugReport: BugReport | null;
  errorMessage?: string;
}

export interface SessionState {
  schemaVersion: number;
  id: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
  status: SessionStatus;
  progressPointer: number;
  config: {
    legacyApi: ApiConfig;
    migratedApi: ApiConfig;
    rules: string;
    aiSettings: AiSettings;
  };
  testCases: TestCase[];
  bugs: BugReport[];
}

export const SCHEMA_VERSION = 1;
