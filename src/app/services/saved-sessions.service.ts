import { Injectable, signal } from '@angular/core';
import { SessionState } from '../models/session-state.model';

const STORAGE_KEY = 'api-tester-saved-sessions';

export interface SavedSessionMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  totalCases: number;
}

@Injectable({ providedIn: 'root' })
export class SavedSessionsService {
  readonly savedSessions = signal<SavedSessionMeta[]>([]);

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as Record<string, SessionState>;
        const metas: SavedSessionMeta[] = Object.values(data).map((s) => ({
          id: s.id,
          name: s.name ?? 'Unnamed',
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          status: s.status,
          totalCases: s.testCases?.length ?? 0,
        }));
        this.savedSessions.set(metas.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      }
    } catch {
      // ignore
    }
  }

  private readAll(): Record<string, SessionState> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, SessionState>) : {};
    } catch {
      return {};
    }
  }

  private writeAll(data: Record<string, SessionState>): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    this.load();
  }

  save(session: SessionState, name: string): void {
    const all = this.readAll();
    const named = { ...session, name };
    all[session.id] = named;
    this.writeAll(all);
  }

  loadById(id: string): SessionState | null {
    const all = this.readAll();
    return all[id] ?? null;
  }

  deleteById(id: string): void {
    const all = this.readAll();
    delete all[id];
    this.writeAll(all);
  }

  updateIfSaved(session: SessionState): void {
    const all = this.readAll();
    if (all[session.id]) {
      all[session.id] = { ...session, name: all[session.id].name };
      this.writeAll(all);
    }
  }
}
