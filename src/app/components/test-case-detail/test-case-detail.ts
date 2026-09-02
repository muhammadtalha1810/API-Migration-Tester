import { Component, input, output } from '@angular/core';
import { TestCase } from '../../models/session-state.model';

@Component({
  selector: 'app-test-case-detail',
  template: `
    <div class="detail-overlay" (click)="onOverlayClick($event)">
      <div class="detail-modal" (click)="$event.stopPropagation()">
        <div class="detail-header">
          <div>
            <h2>{{ testCase()?.id }}</h2>
            @if (testCase()?.description) {
              <p class="tc-description">{{ testCase()?.description }}</p>
            }
          </div>
          <button class="btn-icon" (click)="close.emit()">&times;</button>
        </div>

        <div class="detail-body">
          <div class="section">
            <div class="section-header">
              <h4>Payload Sent</h4>
              <button class="btn-copy" (click)="copyToClipboard(formatJson(testCase()?.payload), $event)">Copy</button>
            </div>
            <pre class="response-pre">{{ formatJson(testCase()?.payload) }}</pre>
          </div>

          <div class="comparison-grid">
            <div class="section">
              <div class="section-header">
                <h4>Legacy Response</h4>
                <div class="section-header-right">
                  <span class="status-code" [class.success]="isSuccess(testCase()?.legacyResponse?.statusCode)">
                    {{ testCase()?.legacyResponse?.statusCode ?? 'N/A' }}
                  </span>
                  <button class="btn-copy" (click)="copyToClipboard(formatBody(testCase()?.legacyResponse?.body), $event)">Copy</button>
                </div>
              </div>
              <pre class="response-pre">{{ formatBody(testCase()?.legacyResponse?.body) }}</pre>
              @if (testCase()?.legacyResponse?.responseTime) {
                <small>{{ testCase()?.legacyResponse?.responseTime }}ms</small>
              }
            </div>

            <div class="section">
              <div class="section-header">
                <h4>Migrated Response</h4>
                <div class="section-header-right">
                  <span class="status-code" [class.success]="isSuccess(testCase()?.migratedResponse?.statusCode)"
                        [class.fail]="testCase()?.responsesDiffer">
                    {{ testCase()?.migratedResponse?.statusCode ?? 'N/A' }}
                  </span>
                  <button class="btn-copy" (click)="copyToClipboard(formatBody(testCase()?.migratedResponse?.body), $event)">Copy</button>
                </div>
              </div>
              <pre class="response-pre">{{ formatBody(testCase()?.migratedResponse?.body) }}</pre>
              @if (testCase()?.migratedResponse?.responseTime) {
                <small>{{ testCase()?.migratedResponse?.responseTime }}ms</small>
              }
            </div>
          </div>

          <div class="section result-section">
            <h4>Comparison Result</h4>
            @if (testCase()?.responsesDiffer === false) {
              <div class="result-pass">Responses match - PASSED</div>
            } @else if (testCase()?.responsesDiffer === true) {
              <div class="result-fail">Responses differ - FAILED</div>
            }
          </div>

          @if (testCase()?.bugReport) {
            <div class="section bug-section">
              <h4>Bug Report</h4>
              <div class="bug-detail">
                <p><strong>Title:</strong> {{ testCase()?.bugReport?.title }}</p>
                <p><strong>Description:</strong> {{ testCase()?.bugReport?.description }}</p>
                <p><strong>Workflow:</strong> {{ testCase()?.bugReport?.workflow }}</p>
                <p><strong>Causes:</strong> {{ testCase()?.bugReport?.causes }}</p>
                <p><strong>Helpful Info:</strong> {{ testCase()?.bugReport?.helpfulInfo }}</p>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .detail-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); display: flex; align-items: center;
      justify-content: center; z-index: 1000;
    }
    .detail-modal {
      background: var(--surface); border-radius: 12px; width: 900px;
      max-width: 95vw; max-height: 90vh; overflow: hidden;
      display: flex; flex-direction: column;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    }
    .detail-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding: 20px 24px; border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .detail-header h2 { margin: 0; font-size: 1.25rem; font-family: monospace; }
    .tc-description { margin: 4px 0 0 0; color: var(--text-secondary); font-size: 0.875rem; }
    .detail-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; overflow-y: auto; }
    .section h4 { margin: 0; font-size: 0.9rem; color: var(--primary); }
    .response-pre {
      background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
      padding: 12px; font-size: 0.8rem; margin: 8px 0 0 0;
      white-space: pre-wrap; word-break: break-word;
      max-height: 300px; overflow-y: auto;
    }
    .comparison-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .section-header { display: flex; justify-content: space-between; align-items: center; }
    .section-header-right { display: flex; align-items: center; gap: 8px; }
    .btn-copy {
      padding: 3px 10px; border: 1px solid var(--border); border-radius: 6px;
      background: var(--bg); color: var(--text-secondary); font-size: 0.7rem;
      cursor: pointer; transition: all 0.15s;
    }
    .btn-copy:hover { background: var(--primary); color: white; border-color: var(--primary); }
    .btn-copy.copied { background: #065f46; color: white; border-color: #065f46; }
    .status-code {
      padding: 2px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700;
      background: var(--border); color: var(--text);
    }
    .status-code.success { background: #d1fae5; color: #065f46; }
    .status-code.fail { background: #fee2e2; color: #991b1b; }
    .result-pass {
      padding: 12px; background: #d1fae5; color: #065f46; border-radius: 8px;
      font-weight: 600;
    }
    .result-fail {
      padding: 12px; background: #fee2e2; color: #991b1b; border-radius: 8px;
      font-weight: 600;
    }
    .bug-section { border-top: 1px solid var(--border); padding-top: 20px; }
    .bug-detail { display: flex; flex-direction: column; gap: 8px; }
    .bug-detail p { margin: 0; font-size: 0.875rem; }
    small { color: var(--text-secondary); font-size: 0.75rem; }
  `]
})
export class TestCaseDetail {
  testCase = input<TestCase | null>(null);
  close = output<void>();

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  formatJson(data: unknown): string {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }

  formatBody(body: string | undefined): string {
    if (!body) return 'N/A';
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }

  isSuccess(code: number | undefined): boolean {
    return code !== undefined && code >= 200 && code < 300;
  }

  async copyToClipboard(text: string, event: Event): Promise<void> {
    const btn = event.target as HTMLButtonElement;
    try {
      await navigator.clipboard.writeText(text);
      const originalText = btn.textContent;
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = originalText;
        btn.classList.remove('copied');
      }, 1500);
    } catch {
      btn.textContent = 'Failed';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
    }
  }
}
