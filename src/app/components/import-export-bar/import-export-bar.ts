import { Component, input, output, inject, signal } from '@angular/core';
import { SessionService } from '../../services/session.service';
import { ImportExportService } from '../../services/import-export.service';
import { SettingsService } from '../../services/settings.service';
import { SavedSessionsService } from '../../services/saved-sessions.service';
import { SessionState } from '../../models/session-state.model';

@Component({
  selector: 'app-import-export-bar',
  template: `
    <div class="bar">
      <div class="bar-left">
        <span class="logo">API Migration Tester</span>
        @if (sessionService.hasSession()) {
          <span class="status-badge" [class]="statusClass()">
            {{ statusLabel() }}
          </span>
        }
      </div>

      <div class="bar-right">
        <div class="saved-dropdown">
          <button class="btn btn-sm btn-secondary" (click)="showSavedList.set(!showSavedList())">
            Saved Sessions ({{ savedSessionsService.savedSessions().length }})
          </button>
          @if (showSavedList()) {
            <div class="saved-list-panel">
              @if (savedSessionsService.savedSessions().length === 0) {
                <div class="saved-empty">No saved sessions</div>
              }
              @for (s of savedSessionsService.savedSessions(); track s.id) {
                <div class="saved-item">
                  <div class="saved-item-info" (click)="onLoadSaved(s.id)">
                    <span class="saved-name">{{ s.name }}</span>
                    <span class="saved-meta">{{ s.totalCases }} cases · {{ s.status }}</span>
                  </div>
                  <button class="btn-icon-sm btn-danger" (click)="onDeleteSaved(s.id)">&times;</button>
                </div>
              }
            </div>
          }
        </div>

        @if (sessionService.hasSession()) {
          <button class="btn btn-sm btn-primary" (click)="onSaveSession()">
            Save
          </button>
          <button class="btn btn-sm btn-secondary" (click)="exportSession()">
            Export
          </button>
        }
        <label class="btn btn-sm btn-secondary">
          Import
          <input type="file" accept=".json" hidden (change)="onImport($event)" />
        </label>
        <button class="btn btn-sm btn-secondary" (click)="settingsClick.emit()">
          Settings
          @if (!hasAiKey()) {
            <span class="dot-warning"></span>
          }
        </button>
        @if (sessionService.hasSession()) {
          <button class="btn btn-sm btn-danger" (click)="newSession.emit()">
            New Session
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .bar {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 24px; background: var(--surface); border-bottom: 1px solid var(--border);
      flex-shrink: 0; position: relative;
    }
    .bar-left { display: flex; align-items: center; gap: 16px; }
    .bar-right { display: flex; align-items: center; gap: 8px; }
    .logo { font-weight: 700; font-size: 1.1rem; color: var(--primary); }
    .status-badge {
      padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600;
    }
    .status-badge.configured { background: var(--info-bg); color: var(--info-text); }
    .status-badge.generating { background: #fef3c7; color: #92400e; }
    .status-badge.executing { background: #dbeafe; color: #1e40af; }
    .status-badge.analyzing { background: #f3e8ff; color: #6b21a8; }
    .status-badge.complete { background: #d1fae5; color: #065f46; }
    .dot-warning {
      display: inline-block; width: 8px; height: 8px; border-radius: 50%;
      background: #f59e0b; margin-left: 6px;
    }
    label.btn { cursor: pointer; display: inline-flex; align-items: center; }
    .saved-dropdown { position: relative; }
    .saved-list-panel {
      position: absolute; top: calc(100% + 4px); right: 0; width: 280px;
      background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15); z-index: 100; max-height: 360px;
      overflow-y: auto;
    }
    .saved-empty { padding: 16px; text-align: center; color: var(--text-secondary); font-size: 0.8rem; }
    .saved-item {
      display: flex; align-items: center; gap: 8px; padding: 8px 12px;
      border-bottom: 1px solid var(--border);
    }
    .saved-item:last-child { border-bottom: none; }
    .saved-item-info { flex: 1; cursor: pointer; display: flex; flex-direction: column; gap: 2px; }
    .saved-item-info:hover .saved-name { color: var(--primary); }
    .saved-name { font-weight: 600; font-size: 0.8rem; }
    .saved-meta { font-size: 0.7rem; color: var(--text-secondary); }
  `]
})
export class ImportExportBar {
  sessionService = inject(SessionService);
  private importExportService = inject(ImportExportService);
  private settingsService = inject(SettingsService);
  savedSessionsService = inject(SavedSessionsService);

  settingsClick = output<void>();
  newSession = output<void>();
  imported = output<SessionState>();

  showSavedList = signal(false);

  hasAiKey(): boolean {
    const s = this.settingsService.settings();
    return !!s?.apiKey;
  }

  statusLabel(): string {
    const status = this.sessionService.status();
    if (!status) return '';
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  statusClass(): string {
    return this.sessionService.status() ?? '';
  }

  exportSession(): void {
    const state = this.sessionService.state();
    if (state) {
      this.importExportService.export(state);
    }
  }

  onSaveSession(): void {
    const state = this.sessionService.state();
    if (!state) return;
    const name = prompt('Enter a name for this session:', state.name ?? '');
    if (!name) return;
    this.savedSessionsService.save(state, name.trim());
    this.showSavedList.set(false);
  }

  onLoadSaved(id: string): void {
    const session = this.savedSessionsService.loadById(id);
    if (session) {
      this.imported.emit(session);
    }
    this.showSavedList.set(false);
  }

  onDeleteSaved(id: string): void {
    this.savedSessionsService.deleteById(id);
  }

  async onImport(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const session = await this.importExportService.import(file);
      this.imported.emit(session);
    } catch (err) {
      alert(`Import failed: ${(err as Error).message}`);
    }
    input.value = '';
  }
}
