import { Component, output, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../services/session.service';
import { AiService } from '../../services/ai.service';
import { SettingsService } from '../../services/settings.service';
import { ApiConfig, HeaderPair, AiSettings, HttpMethod, KeyValue, ManualTestCaseGroup } from '../../models/api-config.model';

@Component({
  selector: 'app-config-form',
  imports: [FormsModule],
  template: `
    <div class="config-form">
      <div class="form-section">
        <h3>Truthy (Legacy) API</h3>
        <div class="form-row">
          <div class="form-group" style="flex: 0 0 140px;">
            <label>HTTP Method</label>
            <select [(ngModel)]="legacyMethod">
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          <div class="form-group" style="flex: 1;">
            <label>URL</label>
            <input type="text" [(ngModel)]="legacyUrl" placeholder="https://localhost:5001/api/endpoint" />
            <small>Use {{ '{' }}paramName{{ '}' }} for path variables, e.g. /api/users/{{ '{' }}id{{ '}' }}</small>
          </div>
        </div>
        <div class="form-group">
          <label>Bearer Token</label>
          <label class="checkbox-label">
            <input type="checkbox" [(ngModel)]="legacyUseSettingsToken" />
            <span>Use token from settings</span>
          </label>
          @if (!legacyUseSettingsToken) {
            <input type="password" [(ngModel)]="legacyToken" placeholder="Optional" />
          } @else {
            <input type="password" [value]="settingsBearerToken()" disabled placeholder="Using token from settings" />
          }
        </div>
        <div class="form-group">
          <label>Path Parameters</label>
          @for (param of legacyPathParams; track $index) {
            <div class="header-row">
              <input type="text" [(ngModel)]="param.key" placeholder="Param name (e.g. id)" />
              <input type="text" [(ngModel)]="param.value" placeholder="Param value" />
              <button class="btn-icon-sm" (click)="removeParam('legacy', 'path', $index)">&times;</button>
            </div>
          }
          <button class="btn btn-sm btn-secondary" (click)="addParam('legacy', 'path')">+ Add Path Param</button>
        </div>
        <div class="form-group">
          <label>Query Parameters</label>
          @for (param of legacyQueryParams; track $index) {
            <div class="header-row">
              <input type="text" [(ngModel)]="param.key" placeholder="Param name" />
              <input type="text" [(ngModel)]="param.value" placeholder="Param value" />
              <button class="btn-icon-sm" (click)="removeParam('legacy', 'query', $index)">&times;</button>
            </div>
          }
          <button class="btn btn-sm btn-secondary" (click)="addParam('legacy', 'query')">+ Add Query Param</button>
        </div>
        <div class="form-group">
          <label>Sample JSON Payload</label>
          <textarea [(ngModel)]="legacyPayload" rows="6" placeholder="JSON payload here"></textarea>
          @if (legacyMethod === 'GET' || legacyMethod === 'DELETE') {
            <small>Body is not sent for GET/DELETE requests. Use path/query params instead.</small>
          }
        </div>
        <div class="form-group">
          <label>Additional Headers</label>
          @for (header of legacyHeaders; track $index) {
            <div class="header-row">
              <input type="text" [(ngModel)]="header.key" placeholder="Header name" />
              <input type="text" [(ngModel)]="header.value" placeholder="Header value" />
              <button class="btn-icon-sm" (click)="removeHeader('legacy', $index)">&times;</button>
            </div>
          }
          <button class="btn btn-sm btn-secondary" (click)="addHeader('legacy')">+ Add Header</button>
        </div>
      </div>

      <div class="form-section">
        <h3>Migrated (.NET Core) API</h3>
        <div class="form-row">
          <div class="form-group" style="flex: 0 0 140px;">
            <label>HTTP Method</label>
            <select [(ngModel)]="migratedMethod">
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          <div class="form-group" style="flex: 1;">
            <label>URL</label>
            <input type="text" [(ngModel)]="migratedUrl" placeholder="https://localhost:7001/api/endpoint" />
            <small>Use {{ '{' }}paramName{{ '}' }} for path variables, e.g. /api/users/{{ '{' }}id{{ '}' }}</small>
          </div>
        </div>
        <div class="form-group">
          <label>Bearer Token</label>
          <label class="checkbox-label">
            <input type="checkbox" [(ngModel)]="migratedUseSettingsToken" />
            <span>Use token from settings</span>
          </label>
          @if (!migratedUseSettingsToken) {
            <input type="password" [(ngModel)]="migratedToken" placeholder="Optional" />
          } @else {
            <input type="password" [value]="settingsBearerToken()" disabled placeholder="Using token from settings" />
          }
        </div>
        <div class="form-group">
          <label>Path Parameters</label>
          @for (param of migratedPathParams; track $index) {
            <div class="header-row">
              <input type="text" [(ngModel)]="param.key" placeholder="Param name (e.g. id)" />
              <input type="text" [(ngModel)]="param.value" placeholder="Param value" />
              <button class="btn-icon-sm" (click)="removeParam('migrated', 'path', $index)">&times;</button>
            </div>
          }
          <button class="btn btn-sm btn-secondary" (click)="addParam('migrated', 'path')">+ Add Path Param</button>
        </div>
        <div class="form-group">
          <label>Query Parameters</label>
          @for (param of migratedQueryParams; track $index) {
            <div class="header-row">
              <input type="text" [(ngModel)]="param.key" placeholder="Param name" />
              <input type="text" [(ngModel)]="param.value" placeholder="Param value" />
              <button class="btn-icon-sm" (click)="removeParam('migrated', 'query', $index)">&times;</button>
            </div>
          }
          <button class="btn btn-sm btn-secondary" (click)="addParam('migrated', 'query')">+ Add Query Param</button>
        </div>
        <div class="form-group">
          <label>Sample JSON Payload</label>
          <textarea [(ngModel)]="migratedPayload" rows="6" placeholder="JSON payload here"></textarea>
          @if (migratedMethod === 'GET' || migratedMethod === 'DELETE') {
            <small>Body is not sent for GET/DELETE requests. Use path/query params instead.</small>
          } @else {
            <small>Leave empty to use the same payload as legacy API</small>
          }
        </div>
        <div class="form-group">
          <label>Additional Headers</label>
          @for (header of migratedHeaders; track $index) {
            <div class="header-row">
              <input type="text" [(ngModel)]="header.key" placeholder="Header name" />
              <input type="text" [(ngModel)]="header.value" placeholder="Header value" />
              <button class="btn-icon-sm" (click)="removeHeader('migrated', $index)">&times;</button>
            </div>
          }
          <button class="btn btn-sm btn-secondary" (click)="addHeader('migrated')">+ Add Header</button>
        </div>
      </div>

      <div class="form-section">
        <h3>Rules &amp; Boundary Values</h3>
        <div class="form-group">
          <label>Describe validations, edge cases, and possible data variations</label>
          <textarea [(ngModel)]="rules" rows="8"
            placeholder="e.g.&#10;- Field age must be between 18 and 65&#10;- Field email should be valid email format&#10;- Field name max length 50, cannot be null&#10;- Test with empty string, special characters, SQL injection attempts&#10;- Date field startDate cannot be in the past"></textarea>
        </div>
      </div>

      <div class="form-section">
        <div class="manual-toggle">
          <label class="checkbox-label">
            <input type="checkbox" [(ngModel)]="skipAi" (ngModelChange)="onSkipAiChange($event)" />
            <span>Skip AI generation — add test cases manually</span>
          </label>
        </div>

        @if (skipAi) {
          <div class="manual-groups">
            <p class="manual-hint">
              Add test case groups below. Each group is a combination of payload, path params, and query params.
              You can use any combination — only payload, only params, or all three.
            </p>

            <div class="manual-actions">
              <label class="btn btn-sm btn-secondary">
                Import Test Cases (JSON)
                <input type="file" accept=".json" hidden (change)="onImportTestCases($event)" />
              </label>
              <button class="btn btn-sm btn-secondary" (click)="showTemplate.set(!showTemplate())">
                {{ showTemplate() ? 'Hide' : 'Show' }} JSON Format
              </button>
            </div>

            @if (showTemplate()) {
              <div class="json-template">
                <p class="template-label">Expected JSON structure:</p>
                <pre class="template-code">{{ templateJson }}</pre>
                <p class="template-note">
                  Each object in the array becomes one test case group.
                  "testName" is required. Other fields are optional — use only the ones you need.
                </p>
              </div>
            }

            @if (importError()) {
              <div class="error-banner">{{ importError() }}</div>
            }

            <div class="accordion-scroll">
              @for (group of manualGroups; track group.id) {
                <div class="accordion-tile" [class.open]="expandedGroupId() === group.id">
                  <div class="tile-header" (click)="toggleGroup(group.id)">
                    <span class="tile-chevron">{{ expandedGroupId() === group.id ? '\u25BC' : '\u25B6' }}</span>
                    <span class="tile-name">{{ group.testName || 'Untitled test case' }}</span>
                    <span class="tile-badges">
                      @if (group.payload) { <span class="tile-badge">Payload</span> }
                      @if (group.pathParams.length) { <span class="tile-badge">{{ group.pathParams.length }} Path</span> }
                      @if (group.queryParams.length) { <span class="tile-badge">{{ group.queryParams.length }} Query</span> }
                    </span>
                    <button class="btn-icon-sm btn-danger tile-remove" (click)="$event.stopPropagation(); removeManualGroup(group.id)">&times;</button>
                  </div>

                  @if (expandedGroupId() === group.id) {
                    <div class="tile-body">
                      <div class="form-group">
                        <label>Test Name *</label>
                        <input type="text" [(ngModel)]="group.testName"
                          placeholder="Required — e.g. Valid user, Invalid ID, Empty payload" />
                      </div>

                      @if (legacyMethod !== 'GET' && legacyMethod !== 'DELETE') {
                        <div class="form-group">
                          <label>Payload (JSON)</label>
                          <textarea [(ngModel)]="group.payload" rows="4"
                            placeholder="{{ '{' }} &quot;key&quot;: &quot;value&quot; {{ '}' }}"></textarea>
                        </div>
                      }

                      <div class="form-group">
                        <label>Path Parameters</label>
                        @for (param of group.pathParams; track $index) {
                          <div class="header-row">
                            <input type="text" [(ngModel)]="param.key" placeholder="Param name (e.g. id)" />
                            <input type="text" [(ngModel)]="param.value" placeholder="Param value" />
                            <button class="btn-icon-sm" (click)="removeGroupParam(group, 'path', $index)">&times;</button>
                          </div>
                        }
                        <button class="btn btn-sm btn-secondary" (click)="addGroupParam(group, 'path')">+ Add Path Param</button>
                      </div>

                      <div class="form-group">
                        <label>Query Parameters</label>
                        @for (param of group.queryParams; track $index) {
                          <div class="header-row">
                            <input type="text" [(ngModel)]="param.key" placeholder="Param name" />
                            <input type="text" [(ngModel)]="param.value" placeholder="Param value" />
                            <button class="btn-icon-sm" (click)="removeGroupParam(group, 'query', $index)">&times;</button>
                          </div>
                        }
                        <button class="btn btn-sm btn-secondary" (click)="addGroupParam(group, 'query')">+ Add Query Param</button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <button class="btn btn-secondary" (click)="addManualGroup()">+ Add Test Case Group</button>
          </div>
        }
      </div>

      <div class="form-section">
        <h3>Execution Settings</h3>
        <div class="form-group">
          <label>Concurrent Requests (parallelism)</label>
          <input type="number" [(ngModel)]="concurrency" min="1" max="50" />
          <small>Number of test cases to run in parallel (default: 10)</small>
        </div>
      </div>

      @if (!hasAiKey() && !skipAi) {
        <div class="warning-banner">
          AI settings not configured. <button class="btn-link" (click)="openSettings.emit()">Configure now</button>
        </div>
      }

      <div class="form-actions">
        <button
          class="btn btn-primary btn-lg"
          (click)="onGenerate()"
          [disabled]="generating() || !canGenerate()"
        >
          @if (generating()) {
            Generating test cases...
          } @else if (skipAi) {
            Run Manual Tests
          } @else {
            Generate &amp; Run Tests
          }
        </button>
      </div>

      @if (error()) {
        <div class="error-banner">{{ error() }}</div>
      }
    </div>
  `,
  styles: [`
    .config-form { max-width: 800px; margin: 0 auto; padding: 24px; display: flex; flex-direction: column; gap: 24px; }
    .form-section {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 12px; padding: 24px;
    }
    .form-section h3 { margin: 0 0 16px 0; font-size: 1.1rem; color: var(--primary); }
    .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
    .form-group:last-child { margin-bottom: 0; }
    .form-group label { font-weight: 600; font-size: 0.875rem; }
    .form-group small { color: var(--text-secondary); font-size: 0.75rem; }
    input, textarea, select {
      padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px;
      font-size: 0.875rem; background: var(--bg); color: var(--text);
      font-family: inherit;
    }
    textarea { font-family: 'Courier New', monospace; resize: vertical; }
    input:focus, textarea:focus { outline: none; border-color: var(--primary); }
    .form-row { display: flex; gap: 16px; }
    .header-row { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
    .header-row input { flex: 1; }
    .header-row button { flex-shrink: 0; }
    .form-actions { display: flex; justify-content: center; }
    .warning-banner {
      padding: 12px 16px; background: #fef3c7; color: #92400e;
      border-radius: 8px; display: flex; align-items: center; gap: 8px;
    }
    .error-banner {
      padding: 12px 16px; background: #fee2e2; color: #991b1b;
      border-radius: 8px;
    }
    .btn-link {
      background: none; border: none; color: #92400e; font-weight: 600;
      cursor: pointer; text-decoration: underline;
    }
    .manual-toggle { margin-bottom: 16px; }
    .checkbox-label {
      display: flex; align-items: center; gap: 8px; cursor: pointer;
      font-size: 0.9rem; font-weight: 600;
    }
    .checkbox-label input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; }
    .manual-groups { margin-top: 16px; }
    .manual-actions { display: flex; gap: 8px; margin-bottom: 16px; }
    .json-template {
      background: var(--bg); border: 1px solid var(--border);
      border-radius: 8px; padding: 14px; margin-bottom: 16px;
    }
    .template-label { margin: 0 0 8px 0; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }
    .template-code {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 6px; padding: 12px; margin: 0;
      font-size: 0.75rem; font-family: 'Courier New', monospace;
      white-space: pre-wrap; word-break: break-word; overflow-x: auto;
    }
    .template-note { margin: 8px 0 0 0; font-size: 0.75rem; color: var(--text-secondary); }
    .manual-hint {
      font-size: 0.8rem; color: var(--text-secondary); margin: 0 0 16px 0;
      padding: 10px 12px; background: var(--bg); border-radius: 8px;
      border: 1px solid var(--border);
    }
    .accordion-scroll {
      max-height: 400px; overflow-y: auto; border: 1px solid var(--border);
      border-radius: 8px; margin-bottom: 12px;
    }
    .accordion-tile {
      border-bottom: 1px solid var(--border);
    }
    .accordion-tile:last-child { border-bottom: none; }
    .accordion-tile.open .tile-header { background: var(--surface); }
    .tile-header {
      display: flex; align-items: center; gap: 8px; padding: 10px 14px;
      cursor: pointer; user-select: none; transition: background 0.15s;
    }
    .tile-header:hover { background: var(--surface); }
    .tile-chevron { font-size: 0.7rem; color: var(--text-secondary); flex-shrink: 0; }
    .tile-name { font-weight: 600; font-size: 0.875rem; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tile-badges { display: flex; gap: 4px; flex-shrink: 0; }
    .tile-badge {
      font-size: 0.65rem; padding: 2px 6px; border-radius: 10px;
      background: var(--bg); color: var(--text-secondary); border: 1px solid var(--border);
    }
    .tile-remove { flex-shrink: 0; }
    .tile-body { padding: 14px; border-top: 1px solid var(--border); }
  `]
})
export class ConfigForm {
  private sessionService = inject(SessionService);
  private aiService = inject(AiService);
  private settingsService = inject(SettingsService);

  openSettings = output<void>();
  generated = output<void>();

  legacyUrl = '';
  legacyMethod: HttpMethod = 'POST';
  legacyToken = '';
  legacyUseSettingsToken = true;
  legacyPayload = '';
  legacyHeaders: HeaderPair[] = [];
  legacyPathParams: KeyValue[] = [];
  legacyQueryParams: KeyValue[] = [];

  migratedUrl = '';
  migratedMethod: HttpMethod = 'POST';
  migratedToken = '';
  migratedUseSettingsToken = true;
  migratedPayload = '';
  migratedHeaders: HeaderPair[] = [];
  migratedPathParams: KeyValue[] = [];
  migratedQueryParams: KeyValue[] = [];

  settingsBearerToken = computed(() => this.settingsService.bearerToken());

  rules = '';
  concurrency = 10;

  skipAi = false;
  manualGroups: ManualTestCaseGroup[] = [];
  private nextGroupId = 1;

  generating = signal(false);
  error = signal('');
  showTemplate = signal(false);
  importError = signal('');
  expandedGroupId = signal<number | null>(null);

  templateJson = `[
  {
    "testName": "Valid user request",
    "payload": { "name": "John", "age": 30 },
    "pathParams": [
      { "key": "id", "value": "123" }
    ],
    "queryParams": [
      { "key": "page", "value": "1" }
    ]
  },
  {
    "testName": "Only path params (no payload)",
    "pathParams": [
      { "key": "id", "value": "0" }
    ]
  },
  {
    "testName": "Only query params",
    "queryParams": [
      { "key": "search", "value": "test" },
      { "key": "limit", "value": "10" }
    ]
  },
  {
    "testName": "Only payload (no params)",
    "payload": { "name": "", "age": -1 }
  }
]`;

  hasAiKey(): boolean {
    const s = this.settingsService.settings();
    return !!s?.apiKey;
  }

  canGenerate(): boolean {
    if (!this.legacyUrl || !this.migratedUrl) return false;

    if (this.skipAi) {
      return this.manualGroups.length > 0 && this.manualGroups.every(g => !!g.testName.trim());
    }

    const needsPayload = this.legacyMethod !== 'GET' && this.legacyMethod !== 'DELETE';
    return !!this.rules && (!needsPayload || !!this.legacyPayload);
  }

  toggleGroup(id: number): void {
    this.expandedGroupId.set(this.expandedGroupId() === id ? null : id);
  }

  onSkipAiChange(checked: boolean): void {
    if (checked && this.manualGroups.length === 0) {
      this.addManualGroup();
    }
  }

  addManualGroup(): void {
    const newGroup: ManualTestCaseGroup = {
      id: this.nextGroupId++,
      testName: '',
      payload: '',
      pathParams: [],
      queryParams: [],
    };
    this.manualGroups.push(newGroup);
    this.expandedGroupId.set(newGroup.id);
  }

  removeManualGroup(id: number): void {
    const idx = this.manualGroups.findIndex(g => g.id === id);
    if (idx >= 0) this.manualGroups.splice(idx, 1);
    if (this.expandedGroupId() === id) this.expandedGroupId.set(null);
  }

  addGroupParam(group: ManualTestCaseGroup, type: 'path' | 'query'): void {
    const pair: KeyValue = { key: '', value: '' };
    if (type === 'path') group.pathParams.push(pair);
    else group.queryParams.push(pair);
  }

  removeGroupParam(group: ManualTestCaseGroup, type: 'path' | 'query', index: number): void {
    if (type === 'path') group.pathParams.splice(index, 1);
    else group.queryParams.splice(index, 1);
  }

  async onImportTestCases(event: Event): Promise<void> {
    this.importError.set('');
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        this.importError.set('JSON must be an array of test case objects');
        input.value = '';
        return;
      }

      const imported: ManualTestCaseGroup[] = parsed.map((item: any) => ({
        id: this.nextGroupId++,
        testName: item.testName ?? item.description ?? '',
        payload: item.payload ? (typeof item.payload === 'string' ? item.payload : JSON.stringify(item.payload, null, 2)) : '',
        pathParams: Array.isArray(item.pathParams)
          ? item.pathParams.map((p: any) => ({ key: p.key ?? '', value: p.value ?? '' }))
          : [],
        queryParams: Array.isArray(item.queryParams)
          ? item.queryParams.map((p: any) => ({ key: p.key ?? '', value: p.value ?? '' }))
          : [],
      }));

      if (imported.length === 0) {
        this.importError.set('No valid test case groups found in the file');
        input.value = '';
        return;
      }

      this.manualGroups.push(...imported);
    } catch {
      this.importError.set('Failed to parse JSON file. Please check the format.');
    }
    input.value = '';
  }

  addHeader(target: 'legacy' | 'migrated'): void {
    if (target === 'legacy') {
      this.legacyHeaders.push({ key: '', value: '' });
    } else {
      this.migratedHeaders.push({ key: '', value: '' });
    }
  }

  removeHeader(target: 'legacy' | 'migrated', index: number): void {
    if (target === 'legacy') {
      this.legacyHeaders.splice(index, 1);
    } else {
      this.migratedHeaders.splice(index, 1);
    }
  }

  addParam(target: 'legacy' | 'migrated', type: 'path' | 'query'): void {
    const pair: KeyValue = { key: '', value: '' };
    if (target === 'legacy') {
      if (type === 'path') this.legacyPathParams.push(pair);
      else this.legacyQueryParams.push(pair);
    } else {
      if (type === 'path') this.migratedPathParams.push(pair);
      else this.migratedQueryParams.push(pair);
    }
  }

  removeParam(target: 'legacy' | 'migrated', type: 'path' | 'query', index: number): void {
    if (target === 'legacy') {
      if (type === 'path') this.legacyPathParams.splice(index, 1);
      else this.legacyQueryParams.splice(index, 1);
    } else {
      if (type === 'path') this.migratedPathParams.splice(index, 1);
      else this.migratedQueryParams.splice(index, 1);
    }
  }

  async onGenerate(): Promise<void> {
    this.error.set('');
    this.generating.set(true);

    try {
      let aiSettings: AiSettings;
      try {
        aiSettings = this.settingsService.getOrThrow();
      } catch {
        if (!this.skipAi) throw new Error('AI settings not configured. Click "Configure now" to set up.');
        aiSettings = { provider: 'groq', model: '', apiKey: '' };
      }
      const payload = this.migratedPayload || this.legacyPayload;

      const legacyApi: ApiConfig = {
        url: this.legacyUrl,
        method: this.legacyMethod,
        bearerToken: this.legacyUseSettingsToken ? this.settingsBearerToken() : this.legacyToken,
        useSettingsToken: this.legacyUseSettingsToken,
        payload: this.legacyPayload,
        headers: [...this.legacyHeaders],
        pathParams: [...this.legacyPathParams],
        queryParams: [...this.legacyQueryParams],
      };

      const migratedApi: ApiConfig = {
        url: this.migratedUrl,
        method: this.migratedMethod,
        bearerToken: this.migratedUseSettingsToken ? this.settingsBearerToken() : this.migratedToken,
        useSettingsToken: this.migratedUseSettingsToken,
        payload: payload,
        headers: [...this.migratedHeaders],
        pathParams: [...this.migratedPathParams],
        queryParams: [...this.migratedQueryParams],
      };

      this.sessionService.createSession(legacyApi, migratedApi, this.rules, aiSettings);

      if (this.skipAi) {
        const cases = this.manualGroups.map((group, i) => {
          let parsedPayload: unknown = null;
          if (group.payload && group.payload.trim()) {
            try {
              parsedPayload = JSON.parse(group.payload);
            } catch {
              parsedPayload = group.payload;
            }
          }
          return {
            id: `tc-${i + 1}`,
            payload: parsedPayload,
            description: group.testName || `Manual test case ${i + 1}`,
            pathParams: group.pathParams.filter(p => p.key).length > 0
              ? group.pathParams.filter(p => p.key)
              : undefined,
            queryParams: group.queryParams.filter(p => p.key).length > 0
              ? group.queryParams.filter(p => p.key)
              : undefined,
            status: 'pending' as const,
            legacyResponse: null,
            migratedResponse: null,
            responsesDiffer: null,
            bugReport: null,
          };
        });

        this.sessionService.setTestCases(cases);
        this.sessionService.setStatus('executing');
        this.generated.emit();
      } else {
        this.sessionService.setStatus('generating');

        const testCases = await this.aiService.generateTestCases(this.legacyPayload, this.rules, legacyApi);

        const cases = testCases.map((tc, i) => ({
          id: `tc-${i + 1}`,
          payload: tc.payload,
          description: tc.description,
          pathParams: tc.pathParams,
          queryParams: tc.queryParams,
          status: 'pending' as const,
          legacyResponse: null,
          migratedResponse: null,
          responsesDiffer: null,
          bugReport: null,
        }));

        this.sessionService.setTestCases(cases);
        this.sessionService.setStatus('executing');
        this.generated.emit();
      }
    } catch (err) {
      this.error.set((err as Error).message || 'Failed to generate test cases');
    } finally {
      this.generating.set(false);
    }
  }
}
