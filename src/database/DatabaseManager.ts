import fs from 'fs';
import path from 'path';
import {
  AppSettings,
  HardwareLogEntry,
  LightingProfile,
  LightingState,
  SyncConfig,
} from '../shared/types';

const DEFAULT_SETTINGS: AppSettings = {
  startWithWindows: false,
  applyLastProfileOnStartup: true,
  runInBackground: true,
  minimizeToTray: true,
  restoreAfterReboot: true,
  lastActiveProfileId: 'profile-gaming',
  openRgbHost: '127.0.0.1',
  openRgbPort: 6742,
  conflictProtectionEnabled: true,
  profileSwitchShortcut: 'CommandOrControl+Alt+P',
};

const DEFAULT_SYNC_CONFIG: SyncConfig = {
  enabled: false,
  effect: 'static',
  primaryColor: { r: 0, g: 240, b: 255 },
  secondaryColor: { r: 124, g: 58, b: 237 },
  brightness: 100,
  speed: 60,
  direction: 'right',
  includedDeviceIds: ['husky-tg200-320f-5016', 'redragon-m719rgb-25a7-fa7e', 'gigabyte-b450m-gaming'],
  excludedDeviceIds: [],
};

export class DatabaseManager {
  private dbPath: string;
  private jsonFallbackPath: string;
  private sqliteDb: any = null;
  private memoryCache: {
    settings: AppSettings;
    syncConfig: SyncConfig;
    profiles: Record<string, LightingProfile>;
    deviceStates: Record<string, LightingState>;
    previousDeviceStates: Record<string, LightingState>;
    logs: HardwareLogEntry[];
  };

  constructor(storageDir: string) {
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    this.dbPath = path.join(storageDir, 'rgb_control_center.sqlite');
    this.jsonFallbackPath = path.join(storageDir, 'rgb_control_center_state.json');

    this.memoryCache = {
      settings: { ...DEFAULT_SETTINGS },
      syncConfig: { ...DEFAULT_SYNC_CONFIG },
      profiles: {},
      deviceStates: {},
      previousDeviceStates: {},
      logs: [],
    };

    this.initialize();
  }

  private initialize(): void {
    try {
      // Utiliza o motor SQLite nativo (node:sqlite DatabaseSync presente no Node 22.5+/24+ e Electron 34+)
      const sqliteModule = require('node:sqlite');
      if (sqliteModule && sqliteModule.DatabaseSync) {
        this.sqliteDb = new sqliteModule.DatabaseSync(this.dbPath);
        this.sqliteDb.exec(`
          CREATE TABLE IF NOT EXISTS key_value_store (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            is_built_in INTEGER NOT NULL DEFAULT 0,
            payload TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS device_states (
            device_id TEXT PRIMARY KEY,
            current_state TEXT NOT NULL,
            previous_state TEXT,
            updated_at TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS hardware_logs (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            level TEXT NOT NULL,
            provider TEXT NOT NULL,
            device_id TEXT,
            operation TEXT NOT NULL,
            message TEXT NOT NULL,
            details TEXT
          );
        `);
        this.loadFromSqlite();
        return;
      }
    } catch {
      this.sqliteDb = null;
    }

    this.loadFromJsonFallback();
  }

  private loadFromSqlite(): void {
    if (!this.sqliteDb) return;
    try {
      const kvRows = this.sqliteDb.prepare('SELECT key, value FROM key_value_store').all() as Array<{
        key: string;
        value: string;
      }>;
      for (const row of kvRows) {
        if (row.key === 'settings') {
          this.memoryCache.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(row.value) };
        } else if (row.key === 'syncConfig') {
          this.memoryCache.syncConfig = { ...DEFAULT_SYNC_CONFIG, ...JSON.parse(row.value) };
        }
      }

      const profileRows = this.sqliteDb.prepare('SELECT id, payload FROM profiles').all() as Array<{
        id: string;
        payload: string;
      }>;
      for (const row of profileRows) {
        this.memoryCache.profiles[row.id] = JSON.parse(row.payload);
      }

      const stateRows = this.sqliteDb
        .prepare('SELECT device_id, current_state, previous_state FROM device_states')
        .all() as Array<{
        device_id: string;
        current_state: string;
        previous_state: string | null;
      }>;
      for (const row of stateRows) {
        this.memoryCache.deviceStates[row.device_id] = JSON.parse(row.current_state);
        if (row.previous_state) {
          this.memoryCache.previousDeviceStates[row.device_id] = JSON.parse(row.previous_state);
        }
      }

      const logRows = this.sqliteDb
        .prepare(
          'SELECT id, timestamp, level, provider, device_id, operation, message, details FROM hardware_logs ORDER BY timestamp DESC LIMIT 300'
        )
        .all() as Array<any>;
      this.memoryCache.logs = logRows.map((r) => ({
        id: r.id,
        timestamp: r.timestamp,
        level: r.level,
        provider: r.provider,
        deviceId: r.device_id || undefined,
        operation: r.operation,
        message: r.message,
        details: r.details || undefined,
      }));
    } catch {
      // Ignora erro de parse inicial
    }
  }

  private loadFromJsonFallback(): void {
    try {
      if (fs.existsSync(this.jsonFallbackPath)) {
        const raw = fs.readFileSync(this.jsonFallbackPath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.memoryCache = {
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
          syncConfig: { ...DEFAULT_SYNC_CONFIG, ...(parsed.syncConfig || {}) },
          profiles: parsed.profiles || {},
          deviceStates: parsed.deviceStates || {},
          previousDeviceStates: parsed.previousDeviceStates || {},
          logs: Array.isArray(parsed.logs) ? parsed.logs.slice(0, 300) : [],
        };
      }
    } catch {
      // Estado limpo se corrompido
    }
  }

  private persistFallback(): void {
    try {
      fs.writeFileSync(this.jsonFallbackPath, JSON.stringify(this.memoryCache, null, 2), 'utf-8');
    } catch {
      // Silencioso
    }
  }

  public getSettings(): AppSettings {
    return { ...this.memoryCache.settings };
  }

  public saveSettings(partial: Partial<AppSettings>): AppSettings {
    this.memoryCache.settings = { ...this.memoryCache.settings, ...partial };
    const now = new Date().toISOString();
    if (this.sqliteDb) {
      const stmt = this.sqliteDb.prepare(
        'INSERT INTO key_value_store (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
      );
      stmt.run('settings', JSON.stringify(this.memoryCache.settings), now);
    }
    this.persistFallback();
    return this.getSettings();
  }

  public getSyncConfig(): SyncConfig {
    return {
      ...this.memoryCache.syncConfig,
      includedDeviceIds: [...this.memoryCache.syncConfig.includedDeviceIds],
      excludedDeviceIds: [...this.memoryCache.syncConfig.excludedDeviceIds],
    };
  }

  public saveSyncConfig(config: SyncConfig): SyncConfig {
    this.memoryCache.syncConfig = { ...config };
    const now = new Date().toISOString();
    if (this.sqliteDb) {
      const stmt = this.sqliteDb.prepare(
        'INSERT INTO key_value_store (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
      );
      stmt.run('syncConfig', JSON.stringify(this.memoryCache.syncConfig), now);
    }
    this.persistFallback();
    return this.getSyncConfig();
  }

  public getAllProfiles(): LightingProfile[] {
    return Object.values(this.memoryCache.profiles).sort((a, b) => {
      if (a.isBuiltIn !== b.isBuiltIn) return a.isBuiltIn ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  public getProfile(id: string): LightingProfile | null {
    return this.memoryCache.profiles[id] || null;
  }

  public saveProfile(profile: LightingProfile): void {
    this.memoryCache.profiles[profile.id] = profile;
    const now = new Date().toISOString();
    if (this.sqliteDb) {
      const stmt = this.sqliteDb.prepare(
        'INSERT INTO profiles (id, name, is_built_in, payload, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, payload = excluded.payload, updated_at = excluded.updated_at'
      );
      stmt.run(profile.id, profile.name, profile.isBuiltIn ? 1 : 0, JSON.stringify(profile), now);
    }
    this.persistFallback();
  }

  public deleteProfile(id: string): boolean {
    const existing = this.memoryCache.profiles[id];
    if (!existing || existing.isBuiltIn) return false;
    delete this.memoryCache.profiles[id];
    if (this.sqliteDb) {
      this.sqliteDb.prepare('DELETE FROM profiles WHERE id = ?').run(id);
    }
    this.persistFallback();
    return true;
  }

  public getDeviceState(deviceId: string): LightingState | null {
    return this.memoryCache.deviceStates[deviceId] || null;
  }

  public getPreviousDeviceState(deviceId: string): LightingState | null {
    return this.memoryCache.previousDeviceStates[deviceId] || null;
  }

  public saveDeviceState(deviceId: string, state: LightingState): void {
    const current = this.memoryCache.deviceStates[deviceId];
    if (current) {
      this.memoryCache.previousDeviceStates[deviceId] = current;
    }
    this.memoryCache.deviceStates[deviceId] = state;
    const now = new Date().toISOString();

    if (this.sqliteDb) {
      const stmt = this.sqliteDb.prepare(
        'INSERT INTO device_states (device_id, current_state, previous_state, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(device_id) DO UPDATE SET current_state = excluded.current_state, previous_state = excluded.previous_state, updated_at = excluded.updated_at'
      );
      stmt.run(
        deviceId,
        JSON.stringify(state),
        this.memoryCache.previousDeviceStates[deviceId]
          ? JSON.stringify(this.memoryCache.previousDeviceStates[deviceId])
          : null,
        now
      );
    }
    this.persistFallback();
  }

  public appendLog(entry: HardwareLogEntry): void {
    this.memoryCache.logs.unshift(entry);
    if (this.memoryCache.logs.length > 300) {
      this.memoryCache.logs.length = 300;
    }
    if (this.sqliteDb) {
      try {
        const stmt = this.sqliteDb.prepare(
          'INSERT INTO hardware_logs (id, timestamp, level, provider, device_id, operation, message, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        stmt.run(
          entry.id,
          entry.timestamp,
          entry.level,
          entry.provider,
          entry.deviceId || null,
          entry.operation,
          entry.message,
          entry.details || null
        );
      } catch {
        // Ignora erro de log
      }
    }
    this.persistFallback();
  }

  public getLogs(): HardwareLogEntry[] {
    return [...this.memoryCache.logs];
  }

  public clearLogs(): void {
    this.memoryCache.logs = [];
    if (this.sqliteDb) {
      this.sqliteDb.exec('DELETE FROM hardware_logs');
    }
    this.persistFallback();
  }
}
