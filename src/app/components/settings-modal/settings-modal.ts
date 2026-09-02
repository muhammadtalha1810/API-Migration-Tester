import { Component, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../services/settings.service';
import { AiSettings, AiProvider } from '../../models/api-config.model';

@Component({
  selector: 'app-settings-modal',
  imports: [FormsModule],
  template: `
    <div class="modal-overlay" (click)="onOverlayClick($event)">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Settings</h2>
          <button class="btn-icon" (click)="close.emit()">&times;</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>AI Provider</label>
            <select [(ngModel)]="provider" (ngModelChange)="onProviderChange()">
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic Claude</option>
              <option value="azure">Azure OpenAI</option>
              <option value="groq">Groq</option>
            </select>
          </div>

          <div class="form-group">
            <label>Model</label>
            <input
              type="text"
              [(ngModel)]="model"
              [placeholder]="defaultModel"
            />
            <small>Default: {{ defaultModel }}</small>
          </div>

          <div class="form-group">
            <label>API Key</label>
            <input
              type="password"
              [(ngModel)]="apiKey"
              placeholder="Enter your API key"
            />
          </div>

          @if (provider === 'azure') {
            <div class="form-group">
              <label>Azure Endpoint</label>
              <input
                type="text"
                [(ngModel)]="azureEndpoint"
                placeholder="https://your-resource.openai.azure.com"
              />
            </div>

            <div class="form-group">
              <label>Deployment Name</label>
              <input
                type="text"
                [(ngModel)]="azureDeploymentName"
                placeholder="your-deployment-name"
              />
            </div>
          }

          <div class="settings-divider"></div>

          <div class="form-group">
            <label>Default Bearer Token</label>
            <input
              type="password"
              [(ngModel)]="bearerToken"
              placeholder="Token used when 'Use token from settings' is checked"
            />
            <small>Stored locally. Used by APIs that have "Use token from settings" checked.</small>
          </div>

          @if (savedToken) {
            <div class="info-banner">
              <span>A bearer token is currently saved.</span>
              <button class="btn-sm btn-danger" (click)="clearBearerToken()">Clear Saved Token</button>
            </div>
          }

          @if (savedKey) {
            <div class="info-banner">
              <span>A key is currently saved in localStorage.</span>
              <button class="btn-sm btn-danger" (click)="clearKey()">Clear Saved Key</button>
            </div>
          }
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="close.emit()">Cancel</button>
          <button class="btn btn-primary" (click)="save()">Save Settings</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); display: flex; align-items: center;
      justify-content: center; z-index: 1000;
    }
    .modal {
      background: var(--surface); border-radius: 12px; width: 500px;
      max-width: 90vw; max-height: 90vh; overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    }
    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px 24px; border-bottom: 1px solid var(--border);
    }
    .modal-header h2 { margin: 0; font-size: 1.25rem; }
    .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
    .modal-footer {
      display: flex; justify-content: flex-end; gap: 12px;
      padding: 16px 24px; border-top: 1px solid var(--border);
    }
    .info-banner {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px; background: var(--info-bg); border-radius: 8px;
      font-size: 0.875rem;
    }
    small { color: var(--text-secondary); font-size: 0.75rem; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-weight: 600; font-size: 0.875rem; }
    input, select {
      padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px;
      font-size: 0.875rem; background: var(--bg); color: var(--text);
      font-family: inherit;
    }
    input:focus, select:focus { outline: none; border-color: var(--primary); }
    .settings-divider {
      height: 1px; background: var(--border); margin: 4px 0;
    }
  `]
})
export class SettingsModal {
  private settingsService = inject(SettingsService);

  close = output<void>();
  provider: AiProvider = 'openai';
  model = '';
  apiKey = '';
  azureEndpoint = '';
  azureDeploymentName = '';
  bearerToken = '';
  savedKey = false;
  savedToken = false;
  defaultModel = 'gpt-4o';

  constructor() {
    const settings = this.settingsService.settings();
    if (settings) {
      this.provider = settings.provider;
      this.model = settings.model;
      this.apiKey = settings.apiKey;
      this.azureEndpoint = settings.azureEndpoint ?? '';
      this.azureDeploymentName = settings.azureDeploymentName ?? '';
      this.savedKey = !!settings.apiKey;
    }
    this.bearerToken = this.settingsService.bearerToken();
    this.savedToken = !!this.bearerToken;
    this.defaultModel = this.settingsService.getDefaultModel(this.provider);
  }

  onProviderChange(): void {
    this.defaultModel = this.settingsService.getDefaultModel(this.provider);
    if (!this.model) {
      this.model = this.defaultModel;
    }
  }

  save(): void {
    const settings: AiSettings = {
      provider: this.provider,
      model: this.model || this.defaultModel,
      apiKey: this.apiKey,
      azureEndpoint: this.azureEndpoint || undefined,
      azureDeploymentName: this.azureDeploymentName || undefined,
    };
    this.settingsService.save(settings);
    this.settingsService.saveBearerToken(this.bearerToken);
    this.savedToken = !!this.bearerToken;
    this.close.emit();
  }

  clearKey(): void {
    this.settingsService.clear();
    this.apiKey = '';
    this.savedKey = false;
  }

  clearBearerToken(): void {
    this.settingsService.clearBearerToken();
    this.bearerToken = '';
    this.savedToken = false;
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }
}
