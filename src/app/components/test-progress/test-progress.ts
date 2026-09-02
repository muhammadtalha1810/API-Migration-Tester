import { Component, inject, signal, computed, input, output } from '@angular/core';
import { SessionService } from '../../services/session.service';
import { ApiTesterService } from '../../services/api-tester.service';
import { ComparisonService } from '../../services/comparison.service';
import { AiService } from '../../services/ai.service';
import { SettingsService } from '../../services/settings.service';
import { ApiConfig } from '../../models/api-config.model';
import { TestCase } from '../../models/session-state.model';

@Component({
  selector: 'app-test-progress',
  template: `
    <div class="progress-container">
      <div class="progress-header">
        <h2>{{ phaseLabel() }}</h2>
        <div class="progress-stats">
          <span class="stat"><strong>{{ done() }}</strong> / {{ total() }} complete</span>
          @if (running() > 0) {
            <span class="stat running">{{ running() }} running</span>
          }
          @if (errors() > 0) {
            <span class="stat error">{{ errors() }} errors</span>
          }
        </div>
      </div>

      <div class="progress-bar-container">
        <div class="progress-bar" [style.width.%]="progressPercent()"></div>
      </div>

      <div class="test-cases-list">
        @for (tc of sessionService.testCases(); track tc.id) {
          <div class="test-case-row" [class]="tc.status" (click)="selectTestCase(tc)">
            <div class="tc-status-icon">
              @switch (tc.status) {
                @case ('pending') { <span class="icon-pending">&#9675;</span> }
                @case ('running') { <span class="icon-running">&#9679;</span> }
                @case ('done') {
                  @if (tc.responsesDiffer) {
                    <span class="icon-fail">&#10007;</span>
                  } @else {
                    <span class="icon-pass">&#10003;</span>
                  }
                }
                @case ('error') { <span class="icon-error">!</span> }
              }
            </div>
            <div class="tc-info">
              <span class="tc-id">{{ tc.id }}</span>
              @if (tc.description) {
                <span class="tc-desc">{{ tc.description }}</span>
              }
            </div>
            <div class="tc-responses">
              @if (tc.legacyResponse && tc.migratedResponse) {
                <span class="response-codes">
                  Legacy: {{ tc.legacyResponse.statusCode }} |
                  Migrated: {{ tc.migratedResponse.statusCode }}
                </span>
              }
            </div>
          </div>
        }
      </div>

      @if (error()) {
        <div class="error-banner">{{ error() }}</div>
      }
    </div>
  `,
  styles: [`
    .progress-container { max-width: 900px; margin: 0 auto; padding: 24px; }
    .progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .progress-header h2 { margin: 0; font-size: 1.25rem; }
    .progress-stats { display: flex; gap: 16px; }
    .stat { font-size: 0.875rem; color: var(--text-secondary); }
    .stat.running { color: #2563eb; }
    .stat.error { color: #dc2626; }
    .progress-bar-container {
      height: 8px; background: var(--border); border-radius: 4px;
      margin-bottom: 24px; overflow: hidden;
    }
    .progress-bar {
      height: 100%; background: var(--primary); transition: width 0.3s ease;
      border-radius: 4px;
    }
    .test-cases-list { display: flex; flex-direction: column; gap: 4px; }
    .test-case-row {
      display: flex; align-items: center; gap: 12px; padding: 10px 16px;
      background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
      cursor: pointer; transition: border-color 0.15s;
    }
    .test-case-row:hover { border-color: var(--primary); }
    .test-case-row.running { border-color: #2563eb; }
    .test-case-row.error { border-color: #dc2626; }
    .tc-status-icon { width: 24px; text-align: center; font-size: 1.1rem; }
    .icon-pending { color: var(--text-secondary); }
    .icon-running { color: #2563eb; animation: pulse 1s infinite; }
    .icon-pass { color: #16a34a; }
    .icon-fail { color: #dc2626; }
    .icon-error { color: #dc2626; font-weight: bold; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .tc-info { flex: 1; display: flex; gap: 12px; align-items: center; }
    .tc-id { font-weight: 600; font-size: 0.875rem; }
    .tc-desc { color: var(--text-secondary); font-size: 0.8rem; }
    .tc-responses { font-size: 0.75rem; color: var(--text-secondary); }
    .response-codes { font-family: 'Courier New', monospace; }
    .error-banner {
      padding: 12px 16px; background: #fee2e2; color: #991b1b;
      border-radius: 8px; margin-top: 16px;
    }
  `]
})
export class TestProgress {
  sessionService = inject(SessionService);
  private apiTester = inject(ApiTesterService);
  private comparison = inject(ComparisonService);
  private aiService = inject(AiService);
  private settingsService = inject(SettingsService);

  concurrency = input<number>(10);
  complete = output<void>();
  testCaseSelected = output<TestCase>();

  error = signal('');
  isRunning = signal(false);

  total = computed(() => this.sessionService.stats().total);
  done = computed(() => this.sessionService.stats().done);
  errors = computed(() => this.sessionService.stats().error);
  running = computed(() => this.sessionService.stats().running);

  progressPercent = computed(() => {
    const total = this.total();
    if (total === 0) return 0;
    const completed = this.done() + this.errors();
    return Math.round((completed / total) * 100);
  });

  phaseLabel = computed(() => {
    const status = this.sessionService.status();
    switch (status) {
      case 'generating': return 'Generating Test Cases...';
      case 'executing': return 'Executing API Tests...';
      case 'analyzing': return 'Analyzing Responses...';
      default: return 'Test Execution';
    }
  });

  selectTestCase(tc: TestCase): void {
    this.testCaseSelected.emit(tc);
  }

  async runExecution(): Promise<void> {
    if (this.isRunning()) return;
    this.isRunning.set(true);
    this.error.set('');

    const state = this.sessionService.state();
    if (!state) return;

    const sessionId = state.id;

    const latestToken = this.settingsService.bearerToken();
    let legacyApi = state.config.legacyApi;
    let migratedApi = state.config.migratedApi;

    if (legacyApi.useSettingsToken || migratedApi.useSettingsToken) {
      const updates: { legacyApi?: ApiConfig; migratedApi?: ApiConfig } = {};
      if (legacyApi.useSettingsToken) {
        legacyApi = { ...legacyApi, bearerToken: latestToken };
        updates.legacyApi = legacyApi;
      }
      if (migratedApi.useSettingsToken) {
        migratedApi = { ...migratedApi, bearerToken: latestToken };
        updates.migratedApi = migratedApi;
      }
      this.sessionService.updateApiConfigs(updates.legacyApi, updates.migratedApi);
    }

    const currentState = this.sessionService.state();
    if (!currentState || currentState.id !== sessionId) return;

    const pendingCases = currentState.testCases.filter((tc) => tc.status === 'pending');
    if (pendingCases.length === 0) {
      await this.runAnalysis();
      return;
    }

    this.sessionService.setStatus('executing');

    try {
      await this.apiTester.executeBatch(
        legacyApi,
        migratedApi,
        pendingCases.map((tc) => ({ id: tc.id, payload: tc.payload, pathParams: tc.pathParams, queryParams: tc.queryParams })),
        this.concurrency(),
        (id, result) => {
          if (this.sessionService.state()?.id !== sessionId) return;

          const bothFailed =
            result.legacy?.statusCode === 0 && result.migrated?.statusCode === 0;

          if (bothFailed) {
            this.sessionService.updateTestCase(id, {
              status: 'error',
              legacyResponse: result.legacy,
              migratedResponse: result.migrated,
              responsesDiffer: null,
            });
            return;
          }

          const responsesDiffer =
            result.legacy && result.migrated
              ? this.comparison.compare(result.legacy, result.migrated)
              : true;

          this.sessionService.updateTestCase(id, {
            status: 'done',
            legacyResponse: result.legacy,
            migratedResponse: result.migrated,
            responsesDiffer,
          });
        }
      );

      if (this.sessionService.state()?.id !== sessionId) return;
      await this.runAnalysis();
    } catch (err) {
      if (this.sessionService.state()?.id !== sessionId) return;
      this.error.set((err as Error).message || 'Execution failed');
    } finally {
      this.isRunning.set(false);
    }
  }

  async runAnalysis(): Promise<void> {
    const state = this.sessionService.state();
    if (!state) return;

    this.sessionService.setStatus('analyzing');

    const differingCases = state.testCases.filter(
      (tc) => tc.status === 'done' && tc.responsesDiffer === true && tc.legacyResponse && tc.migratedResponse
    );

    if (differingCases.length === 0) {
      this.sessionService.setBugs([]);
      this.complete.emit();
      return;
    }

    try {
      const bugs = await this.aiService.analyzeResponses(
        differingCases.map((tc) => ({
          id: tc.id,
          payload: tc.payload,
          legacyResponse: {
            statusCode: tc.legacyResponse!.statusCode,
            body: tc.legacyResponse!.body,
          },
          migratedResponse: {
            statusCode: tc.migratedResponse!.statusCode,
            body: tc.migratedResponse!.body,
          },
        }))
      );

      this.sessionService.setBugs(bugs);
      this.complete.emit();
    } catch (err) {
      this.error.set((err as Error).message || 'Analysis failed');
      this.sessionService.setStatus('complete');
      this.complete.emit();
    }
  }
}
