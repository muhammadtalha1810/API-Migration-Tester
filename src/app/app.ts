import { Component, signal, inject, viewChild, effect } from '@angular/core';
import { ImportExportBar } from './components/import-export-bar/import-export-bar';
import { SettingsModal } from './components/settings-modal/settings-modal';
import { ConfigForm } from './components/config-form/config-form';
import { TestProgress } from './components/test-progress/test-progress';
import { ResultsDashboard } from './components/results-dashboard/results-dashboard';
import { TestCaseDetail } from './components/test-case-detail/test-case-detail';
import { SessionService } from './services/session.service';
import { SavedSessionsService } from './services/saved-sessions.service';
import { SessionState, TestCase } from './models/session-state.model';

@Component({
  selector: 'app-root',
  imports: [
    ImportExportBar,
    SettingsModal,
    ConfigForm,
    TestProgress,
    ResultsDashboard,
    TestCaseDetail,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected sessionService = inject(SessionService);
  private savedSessionsService = inject(SavedSessionsService);

  showSettings = signal(false);
  selectedTestCase = signal<TestCase | null>(null);

  progressRef = viewChild<TestProgress>('progressView');

  private executionTriggered = false;

  constructor() {
    effect(() => {
      const status = this.sessionService.status();
      if (status === 'executing' && !this.executionTriggered) {
        this.executionTriggered = true;
        setTimeout(async () => {
          const ref = this.progressRef();
          if (ref) {
            await ref.runExecution();
          }
        }, 100);
      } else if (status !== 'executing') {
        this.executionTriggered = false;
      }
    });

    effect(() => {
      const state = this.sessionService.state();
      if (state) {
        this.savedSessionsService.updateIfSaved(state);
      }
    });
  }

  onOpenSettings(): void {
    this.showSettings.set(true);
  }

  onCloseSettings(): void {
    this.showSettings.set(false);
  }

  onNewSession(): void {
    this.sessionService.clearSession();
  }

  onRerun(): void {
    this.sessionService.rerunAll();
  }

  async onGenerated(): Promise<void> {
    setTimeout(async () => {
      const ref = this.progressRef();
      if (ref) {
        await ref.runExecution();
      }
    }, 100);
  }

  onComplete(): void {
    // Status is already set to 'complete' by sessionService.setBugs()
  }

  onTestCaseSelected(tc: TestCase): void {
    this.selectedTestCase.set(tc);
  }

  onCloseDetail(): void {
    this.selectedTestCase.set(null);
  }

  async onImported(session: SessionState): Promise<void> {
    this.sessionService.loadSession(session);
  }
}
