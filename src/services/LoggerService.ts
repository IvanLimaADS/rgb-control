import { DatabaseManager } from '../database/DatabaseManager';
import { HardwareLogEntry } from '../shared/types';

export class LoggerService {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public log(
    level: HardwareLogEntry['level'],
    provider: string,
    operation: string,
    message: string,
    deviceId?: string,
    details?: string
  ): HardwareLogEntry {
    const entry: HardwareLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      level,
      provider,
      deviceId,
      operation,
      message,
      details,
    };
    this.db.appendLog(entry);
    return entry;
  }

  public info(provider: string, operation: string, message: string, deviceId?: string, details?: string) {
    return this.log('info', provider, operation, message, deviceId, details);
  }

  public warn(provider: string, operation: string, message: string, deviceId?: string, details?: string) {
    return this.log('warn', provider, operation, message, deviceId, details);
  }

  public error(provider: string, operation: string, message: string, deviceId?: string, details?: string) {
    return this.log('error', provider, operation, message, deviceId, details);
  }

  public security(provider: string, operation: string, message: string, deviceId?: string, details?: string) {
    return this.log('security', provider, operation, message, deviceId, details);
  }

  public getLogs(): HardwareLogEntry[] {
    return this.db.getLogs();
  }

  public clearLogs(): void {
    this.db.clearLogs();
  }
}
