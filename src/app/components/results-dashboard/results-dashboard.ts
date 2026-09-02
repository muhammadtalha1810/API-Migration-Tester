import { Component, inject, output, signal } from '@angular/core';
import { SessionService } from '../../services/session.service';
import { BugList } from '../bug-list/bug-list';
import { TestCase, BugReport } from '../../models/session-state.model';

@Component({
  selector: 'app-results-dashboard',
  imports: [BugList],
  template: `
    <div class="dashboard">
      <div class="dashboard-header">
        <h2>Test Results</h2>
        <div class="header-actions">
          <button class="btn btn-primary" (click)="rerun.emit()">Re-run All Tests</button>
          <button class="btn btn-secondary" (click)="newSession.emit()">Start New Session</button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card total">
          <span class="stat-value">{{ stats().total }}</span>
          <span class="stat-label">Total Cases</span>
        </div>
        <div class="stat-card passed">
          <span class="stat-value">{{ stats().passed }}</span>
          <span class="stat-label">Passed</span>
        </div>
        <div class="stat-card failed">
          <span class="stat-value">{{ stats().failed }}</span>
          <span class="stat-label">Failed</span>
        </div>
        <div class="stat-card bugs">
          <span class="stat-value">{{ stats().bugCount }}</span>
          <span class="stat-label">Bugs Found</span>
        </div>
        <div class="stat-card errors">
          <span class="stat-value">{{ stats().error }}</span>
          <span class="stat-label">Errors</span>
        </div>
      </div>

      <div class="dashboard-body">
        <div class="left-panel">
          <h3>Test Cases</h3>
          <div class="test-case-list">
            @for (tc of sessionService.testCases(); track tc.id) {
              <div
                class="tc-item"
                [class.selected]="selectedTcId() === tc.id"
                (click)="selectTc(tc)"
              >
                <span class="tc-icon" [class]="iconClass(tc)">
                  @if (tc.status === 'done' && tc.responsesDiffer === false) { &#10003; }
                  @else if (tc.status === 'done' && tc.responsesDiffer === true) { &#10007; }
                  @else if (tc.status === 'error') { ! }
                  @else { &#9675; }
                </span>
                <span class="tc-label">{{ tc.id }}</span>
                @if (tc.bugReport) {
                  <span class="bug-indicator">BUG</span>
                }
              </div>
            }
          </div>
        </div>

        <div class="right-panel">
          <app-bug-list
            [bugs]="sessionService.bugs()"
            (selectBug)="onBugSelect($event)"
          />
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard { max-width: 1200px; margin: 0 auto; padding: 24px; }
    .dashboard-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 24px;
    }
    .dashboard-header h2 { margin: 0; font-size: 1.5rem; }
    .header-actions { display: flex; gap: 8px; }
    .stats-grid {
      display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      display: flex; flex-direction: column; align-items: center; padding: 20px;
      background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
    }
    .stat-value { font-size: 2rem; font-weight: 700; }
    .stat-label { font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px; }
    .stat-card.total .stat-value { color: var(--text); }
    .stat-card.passed .stat-value { color: #16a34a; }
    .stat-card.failed .stat-value { color: #dc2626; }
    .stat-card.bugs .stat-value { color: #f59e0b; }
    .stat-card.errors .stat-value { color: #991b1b; }
    .dashboard-body { display: grid; grid-template-columns: 300px 1fr; gap: 24px; }
    .left-panel h3, .right-panel h3 { margin: 0 0 12px 0; font-size: 1rem; }
    .test-case-list {
      display: flex; flex-direction: column; gap: 4px; max-height: 600px;
      overflow-y: auto;
    }
    .tc-item {
      display: flex; align-items: center; gap: 8px; padding: 8px 12px;
      background: var(--surface); border: 1px solid var(--border); border-radius: 6px;
      cursor: pointer; font-size: 0.8rem;
    }
    .tc-item:hover { border-color: var(--primary); }
    .tc-item.selected { border-color: var(--primary); background: var(--info-bg); }
    .tc-icon { width: 16px; text-align: center; }
    .tc-icon.pass { color: #16a34a; }
    .tc-icon.fail { color: #dc2626; }
    .tc-icon.error { color: #991b1b; }
    .tc-icon.pending { color: var(--text-secondary); }
    .tc-label { font-family: monospace; flex: 1; }
    .bug-indicator {
      font-size: 0.6rem; font-weight: 700; padding: 2px 6px; border-radius: 4px;
      background: #fef3c7; color: #92400e;
    }
  `]
})
export class ResultsDashboard {
  sessionService = inject(SessionService);
  newSession = output<void>();
  rerun = output<void>();
  testCaseSelected = output<TestCase>();

  selectedTcId = signal<string | null>(null);

  stats() {
    return this.sessionService.stats();
  }

  selectTc(tc: TestCase): void {
    this.selectedTcId.set(tc.id);
    this.testCaseSelected.emit(tc);
  }

  onBugSelect(bug: BugReport): void {
    const tc = this.sessionService.testCases().find((t) => t.id === bug.testCaseId);
    if (tc) {
      this.selectTc(tc);
    }
  }

  iconClass(tc: TestCase): string {
    if (tc.status === 'done' && tc.responsesDiffer === false) return 'pass';
    if (tc.status === 'done' && tc.responsesDiffer === true) return 'fail';
    if (tc.status === 'error') return 'error';
    return 'pending';
  }
}
