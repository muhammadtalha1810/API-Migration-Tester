import { Injectable } from '@angular/core';
import { SessionState } from '../models/session-state.model';

@Injectable({ providedIn: 'root' })
export class ImportExportService {
  export(session: SessionState, filename?: string): void {
    const json = JSON.stringify(session, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `api-test-session-${session.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  import(file: File): Promise<SessionState> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string) as SessionState;
          if (!data.schemaVersion || !data.id || !data.config) {
            reject(new Error('Invalid session file format'));
            return;
          }
          resolve(data);
        } catch {
          reject(new Error('Failed to parse JSON file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}
