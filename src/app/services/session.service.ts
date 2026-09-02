import { Injectable, signal, computed } from '@angular/core';
import { SessionState, TestCase, BugReport, SCHEMA_VERSION } from '../models/session-state.model';
import { ApiConfig, AiSettings } from '../models/api-config.model';

@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly state = signal<SessionState | null>(null);

  readonly hasSession = computed(() => this.state() !== null);
  readonly status = computed(() => this.state()?.status ?? null);
  readonly testCases = computed(() => this.state()?.testCases ?? []);
  readonly bugs = computed(() => this.state()?.bugs ?? []);
  readonly progressPointer = computed(() => this.state()?.progressPointer ?? 0);

  readonly stats = computed(() => {
    const cases = this.testCases();
    const total = cases.length;
    const done = cases.filter((c) => c.status === 'done').length;
    const error = cases.filter((c) => c.status === 'error').length;
    const pending = cases.filter((c) => c.status === 'pending').length;
    const running = cases.filter((c) => c.status === 'running').length;
    const passed = cases.filter((c) => c.status === 'done' && c.responsesDiffer === false).length;
    const failed = cases.filter((c) => c.status === 'done' && c.responsesDiffer === true).length;
    const bugCount = this.bugs().length;
    return { total, done, error, pending, running, passed, failed, bugCount };
  });

  createSession(
    legacyApi: ApiConfig,
    migratedApi: ApiConfig,
    rules: string,
    aiSettings: AiSettings
  ): SessionState {
    const now = new Date().toISOString();
    const session: SessionState = {
      schemaVersion: SCHEMA_VERSION,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      status: 'configured',
      progressPointer: 0,
      config: { legacyApi, migratedApi, rules, aiSettings },
      testCases: [],
      bugs: [],
    };
    this.state.set(session);
    return session;
  }

  loadSession(session: SessionState): void {
    this.state.set(session);
  }

  clearSession(): void {
    this.state.set(null);
  }

  updateState(partial: Partial<SessionState>): void {
    const current = this.state();
    if (!current) return;
    this.state.set({
      ...current,
      ...partial,
      updatedAt: new Date().toISOString(),
    });
  }

  setTestCases(cases: TestCase[]): void {
    this.updateState({ testCases: cases, status: 'executing', progressPointer: 0 });
  }

  updateTestCase(id: string, updates: Partial<TestCase>): void {
    const current = this.state();
    if (!current) return;
    const testCases = current.testCases.map((tc) =>
      tc.id === id ? { ...tc, ...updates } : tc
    );
    this.updateState({ testCases });
  }

  advanceProgress(): void {
    const current = this.state();
    if (!current) return;
    this.updateState({ progressPointer: current.progressPointer + 1 });
  }

  setBugs(bugs: BugReport[]): void {
    const current = this.state();
    if (!current) return;

    const testCases = current.testCases.map((tc) => {
      const bug = bugs.find((b) => b.testCaseId === tc.id);
      return bug ? { ...tc, bugReport: bug } : tc;
    });

    this.updateState({ bugs, testCases, status: 'complete' });
  }

  setStatus(status: SessionState['status']): void {
    this.updateState({ status });
  }

  updateApiConfigs(legacyApi?: ApiConfig, migratedApi?: ApiConfig): void {
    const current = this.state();
    if (!current) return;
    const config = { ...current.config };
    if (legacyApi) config.legacyApi = legacyApi;
    if (migratedApi) config.migratedApi = migratedApi;
    this.updateState({ config });
  }

  rerunAll(): void {
    const current = this.state();
    if (!current) return;
    const resetCases = current.testCases.map((tc) => ({
      ...tc,
      status: 'pending' as const,
      legacyResponse: null,
      migratedResponse: null,
      responsesDiffer: null,
      bugReport: null,
    }));
    this.updateState({
      testCases: resetCases,
      bugs: [],
      status: 'executing',
      progressPointer: 0,
    });
  }

  exportState(): string {
    return JSON.stringify(this.state(), null, 2);
  }
}
