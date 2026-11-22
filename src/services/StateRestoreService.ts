import { DatabaseManager } from '../database/DatabaseManager';
import { DeviceManager } from '../core/DeviceManager';
import { ProfileManager } from '../profiles/ProfileManager';
import { LoggerService } from './LoggerService';

export class StateRestoreService {
  private db: DatabaseManager;
  private deviceManager: DeviceManager;
  private profileManager: ProfileManager;
  private logger: LoggerService;

  constructor(
    db: DatabaseManager,
    deviceManager: DeviceManager,
    profileManager: ProfileManager,
    logger: LoggerService
  ) {
    this.db = db;
    this.deviceManager = deviceManager;
    this.profileManager = profileManager;
    this.logger = logger;
  }

  public async restoreOnStartup(): Promise<void> {
    const settings = this.db.getSettings();
    if (!settings.applyLastProfileOnStartup && !settings.restoreAfterReboot) {
      this.logger.info('StateRestoreService', 'restoreOnStartup', 'Restauração automática na inicialização desativada pelo usuário.');
      return;
    }

    if (settings.applyLastProfileOnStartup && settings.lastActiveProfileId) {
      const applied = await this.profileManager.applyProfile(settings.lastActiveProfileId);
      if (applied) {
        this.logger.info(
          'StateRestoreService',
          'restoreOnStartup',
          `Último perfil ativo (${settings.lastActiveProfileId}) aplicado na inicialização.`
        );
        return;
      }
    }

    if (settings.restoreAfterReboot) {
      const devices = await this.deviceManager.getAllDevices();
      for (const dev of devices) {
        if (dev.info.compatibility !== 'compatible') continue;
        const saved = this.db.getDeviceState(dev.info.id);
        if (saved) {
          await this.deviceManager.setDeviceEffect(dev.info.id, saved.effect, {
            primaryColor: saved.primaryColor,
            secondaryColor: saved.secondaryColor,
            gradientColors: saved.gradientColors,
            brightness: saved.brightness,
            speed: saved.speed,
            direction: saved.direction,
          });
        }
      }
      this.logger.info('StateRestoreService', 'restoreOnStartup', 'Estados individuais persistidos restaurados.');
    }
  }
}
