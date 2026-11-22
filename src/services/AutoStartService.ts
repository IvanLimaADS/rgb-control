import { LoggerService } from './LoggerService';

export class AutoStartService {
  private logger: LoggerService;
  private electronApp: any;

  constructor(logger: LoggerService, electronApp?: any) {
    this.logger = logger;
    this.electronApp = electronApp;
  }

  public configureAutoStart(enabled: boolean, runMinimized = true): boolean {
    try {
      if (this.electronApp && typeof this.electronApp.setLoginItemSettings === 'function') {
        this.electronApp.setLoginItemSettings({
          openAtLogin: enabled,
          args: runMinimized ? ['--minimized'] : [],
        });
        this.logger.info(
          'AutoStartService',
          'setLoginItemSettings',
          `Inicialização automática com o Windows ${enabled ? 'ativada' : 'desativada'}.`
        );
        return true;
      }
      return false;
    } catch (err: any) {
      this.logger.error(
        'AutoStartService',
        'setLoginItemSettings',
        `Erro ao configurar inicialização automática: ${err?.message || String(err)}`
      );
      return false;
    }
  }
}
