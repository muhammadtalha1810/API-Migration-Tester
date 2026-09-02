import { Component, input, output } from '@angular/core';
import { TestCase, BugReport } from '../../models/session-state.model';

@Component({
  selector: 'app-bug-list',
  template: `
    <div class="bug-list">
      <h3>Bug Reports ({{ bugs().length }})</h3>

      @if (bugs().length === 0) {
        <div class="empty-state">
          <span class="empty-icon">&#10003;</span>
          <p>No bugs detected. All test cases passed.</p>
        </div>
      }

      @for (bug of bugs(); track bug.testCaseId) {
        <div class="bug-card" (click)="selectBug.emit(bug)">
          <div class="bug-header">
            <span class="bug-title">{{ bug.title }}</span>
            <span class="bug-tc-id">{{ bug.testCaseId }}</span>
          </div>
          <p class="bug-description">{{ bug.description }}</p>
          <div class="bug-meta">
            <div class="bug-field">
              <strong>Workflow:</strong> {{ bug.workflow }}
            </div>
            <div class="bug-field">
              <strong>Causes:</strong> {{ bug.causes }}
            </div>
            <div class="bug-field">
              <strong>Helpful Info:</strong> {{ bug.helpfulInfo }}
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .bug-list { display: flex; flex-direction: column; gap: 16px; }
    .bug-list h3 { margin: 0 0 8px 0; font-size: 1.1rem; color: var(--primary); }
    .empty-state {
      text-align: center; padding: 32px; color: var(--text-secondary);
      background: var(--surface); border-radius: 12px; border: 1px solid var(--border);
    }
    .empty-icon { font-size: 2rem; color: #16a34a; display: block; margin-bottom: 8px; }
    .bug-card {
      background: var(--surface); border: 1px solid #fca5a5; border-radius: 12px;
      padding: 20px; cursor: pointer; transition: box-shadow 0.15s;
    }
    .bug-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .bug-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .bug-title { font-weight: 700; font-size: 1rem; color: #991b1b; }
    .bug-tc-id { font-size: 0.75rem; color: var(--text-secondary); font-family: monospace; }
    .bug-description { margin: 0 0 12px 0; font-size: 0.875rem; color: var(--text); }
    .bug-meta { display: flex; flex-direction: column; gap: 6px; }
    .bug-field { font-size: 0.8rem; color: var(--text-secondary); }
    .bug-field strong { color: var(--text); }
  `]
})
export class BugList {
  bugs = input<BugReport[]>([]);
  selectBug = output<BugReport>();
}
