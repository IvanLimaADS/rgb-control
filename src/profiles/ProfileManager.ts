import { DatabaseManager } from '../database/DatabaseManager';
import { DeviceManager } from '../core/DeviceManager';
import { LightingProfile, LightingState } from '../shared/types';
import { LoggerService } from '../services/LoggerService';

export class ProfileManager {
  private db: DatabaseManager;
  private deviceManager: DeviceManager;
  private logger: LoggerService;

  constructor(db: DatabaseManager, deviceManager: DeviceManager, logger: LoggerService) {
    this.db = db;
    this.deviceManager = deviceManager;
    this.logger = logger;
    this.seedBuiltInProfiles();
  }

  private seedBuiltInProfiles(): void {
    const now = new Date().toISOString();
    const builtIns: LightingProfile[] = [
      {
        id: 'profile-gaming',
        name: 'Gaming',
        description: 'Iluminação dinâmica de alto contraste com onda Cyberpunk Ciano/Roxo e velocidade elevada.',
        icon: 'Gamepad2',
        isBuiltIn: true,
        globalSync: {
          enabled: true,
          effect: 'wave',
          primaryColor: { r: 0, g: 240, b: 255 },
          secondaryColor: { r: 124, g: 58, b: 237 },
          brightness: 100,
          speed: 85,
          direction: 'right',
          includedDeviceIds: [
            'husky-tg200-320f-5016',
            'redragon-m719rgb-25a7-fa7e',
            'gigabyte-b450m-gaming',
          ],
          excludedDeviceIds: [],
        },
        deviceStates: {
          'husky-tg200-320f-5016': {
            enabled: true,
            effect: 'wave',
            primaryColor: { r: 0, g: 240, b: 255 },
            secondaryColor: { r: 124, g: 58, b: 237 },
            brightness: 100,
            speed: 85,
            direction: 'right',
            updatedAt: now,
          },
          'redragon-m719rgb-25a7-fa7e': {
            enabled: true,
            effect: 'wave',
            primaryColor: { r: 0, g: 240, b: 255 },
            secondaryColor: { r: 124, g: 58, b: 237 },
            brightness: 100,
            speed: 80,
            direction: 'right',
            updatedAt: now,
          },
          'gigabyte-b450m-gaming': {
            enabled: true,
            effect: 'color_cycle',
            primaryColor: { r: 0, g: 240, b: 255 },
            brightness: 100,
            speed: 80,
            direction: 'right',
            updatedAt: now,
          },
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'profile-work',
        name: 'Work',
        description: 'Iluminação estática discreta e confortável em branco neutro/azul suave para foco e produtividade.',
        icon: 'Briefcase',
        isBuiltIn: true,
        globalSync: {
          enabled: true,
          effect: 'static',
          primaryColor: { r: 180, g: 215, b: 255 },
          secondaryColor: { r: 100, g: 150, b: 255 },
          brightness: 50,
          speed: 25,
          direction: 'right',
          includedDeviceIds: [
            'husky-tg200-320f-5016',
            'redragon-m719rgb-25a7-fa7e',
            'gigabyte-b450m-gaming',
          ],
          excludedDeviceIds: [],
        },
        deviceStates: {
          'husky-tg200-320f-5016': {
            enabled: true,
            effect: 'static',
            primaryColor: { r: 180, g: 215, b: 255 },
            brightness: 50,
            speed: 25,
            direction: 'right',
            updatedAt: now,
          },
          'redragon-m719rgb-25a7-fa7e': {
            enabled: true,
            effect: 'static',
            primaryColor: { r: 180, g: 215, b: 255 },
            brightness: 66,
            speed: 25,
            direction: 'right',
            updatedAt: now,
          },
          'gigabyte-b450m-gaming': {
            enabled: true,
            effect: 'static',
            primaryColor: { r: 180, g: 215, b: 255 },
            brightness: 55,
            speed: 20,
            direction: 'right',
            updatedAt: now,
          },
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'profile-night',
        name: 'Night',
        description: 'Iluminação reduzida em âmbar quente de baixa intensidade para uso noturno sem fadiga visual.',
        icon: 'Moon',
        isBuiltIn: true,
        globalSync: {
          enabled: true,
          effect: 'breathing',
          primaryColor: { r: 255, g: 110, b: 20 },
          secondaryColor: { r: 120, g: 40, b: 0 },
          brightness: 25,
          speed: 25,
          direction: 'right',
          includedDeviceIds: [
            'husky-tg200-320f-5016',
            'redragon-m719rgb-25a7-fa7e',
            'gigabyte-b450m-gaming',
          ],
          excludedDeviceIds: [],
        },
        deviceStates: {
          'husky-tg200-320f-5016': {
            enabled: true,
            effect: 'static',
            primaryColor: { r: 255, g: 110, b: 20 },
            brightness: 25,
            speed: 25,
            direction: 'right',
            updatedAt: now,
          },
          'redragon-m719rgb-25a7-fa7e': {
            enabled: true,
            effect: 'breathing',
            primaryColor: { r: 255, g: 110, b: 20 },
            brightness: 33,
            speed: 20,
            direction: 'right',
            updatedAt: now,
          },
          'gigabyte-b450m-gaming': {
            enabled: false,
            effect: 'off',
            primaryColor: { r: 0, g: 0, b: 0 },
            brightness: 0,
            speed: 0,
            direction: 'right',
            updatedAt: now,
          },
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'profile-static',
        name: 'Static',
        description: 'Cor fixa sincronizada em todos os periféricos e componentes compatíveis.',
        icon: 'Sparkles',
        isBuiltIn: true,
        globalSync: {
          enabled: true,
          effect: 'static',
          primaryColor: { r: 16, g: 185, b: 129 },
          secondaryColor: { r: 0, g: 240, b: 255 },
          brightness: 100,
          speed: 50,
          direction: 'right',
          includedDeviceIds: [
            'husky-tg200-320f-5016',
            'redragon-m719rgb-25a7-fa7e',
            'gigabyte-b450m-gaming',
          ],
          excludedDeviceIds: [],
        },
        deviceStates: {
          'husky-tg200-320f-5016': {
            enabled: true,
            effect: 'static',
            primaryColor: { r: 16, g: 185, b: 129 },
            brightness: 100,
            speed: 50,
            direction: 'right',
            updatedAt: now,
          },
          'redragon-m719rgb-25a7-fa7e': {
            enabled: true,
            effect: 'static',
            primaryColor: { r: 16, g: 185, b: 129 },
            brightness: 100,
            speed: 50,
            direction: 'right',
            updatedAt: now,
          },
          'gigabyte-b450m-gaming': {
            enabled: true,
            effect: 'static',
            primaryColor: { r: 16, g: 185, b: 129 },
            brightness: 100,
            speed: 50,
            direction: 'right',
            updatedAt: now,
          },
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'profile-custom',
        name: 'Custom',
        description: 'Configuração totalmente personalizada por periférico (Teclado Reactive, Mouse Neon, Placa Pulse).',
        icon: 'Sliders',
        isBuiltIn: true,
        deviceStates: {
          'husky-tg200-320f-5016': {
            enabled: true,
            effect: 'reactive',
            primaryColor: { r: 124, g: 58, b: 237 },
            secondaryColor: { r: 0, g: 240, b: 255 },
            brightness: 100,
            speed: 75,
            direction: 'right',
            updatedAt: now,
          },
          'redragon-m719rgb-25a7-fa7e': {
            enabled: true,
            effect: 'color_cycle',
            primaryColor: { r: 244, g: 63, b: 94 },
            brightness: 100,
            speed: 60,
            direction: 'right',
            updatedAt: now,
          },
          'gigabyte-b450m-gaming': {
            enabled: true,
            effect: 'breathing',
            primaryColor: { r: 124, g: 58, b: 237 },
            brightness: 90,
            speed: 60,
            direction: 'right',
            updatedAt: now,
          },
        },
        createdAt: now,
        updatedAt: now,
      },
    ];

    for (const p of builtIns) {
      if (!this.db.getProfile(p.id)) {
        this.db.saveProfile(p);
      }
    }
  }

  public listProfiles(): LightingProfile[] {
    return this.db.getAllProfiles();
  }

  public async applyProfile(profileId: string): Promise<boolean> {
    const profile = this.db.getProfile(profileId);
    if (!profile) return false;

    const devices = await this.deviceManager.getAllDevices();
    for (const dev of devices) {
      const targetState = profile.deviceStates[dev.info.id];
      if (!targetState) continue;
      if (dev.info.compatibility === 'unsupported' || dev.info.compatibility === 'sdk_offline') {
        continue;
      }
      await this.deviceManager.setDeviceEffect(dev.info.id, targetState.effect, {
        primaryColor: targetState.primaryColor,
        secondaryColor: targetState.secondaryColor,
        gradientColors: targetState.gradientColors,
        brightness: targetState.brightness,
        speed: targetState.speed,
        direction: targetState.direction,
      });
    }

    this.db.saveSettings({ lastActiveProfileId: profile.id });
    this.logger.info('ProfileManager', 'applyProfile', `Perfil '${profile.name}' aplicado aos dispositivos.`);
    return true;
  }

  public async createProfileFromCurrentState(name: string, description: string): Promise<LightingProfile> {
    const devices = await this.deviceManager.getAllDevices();
    const deviceStates: Record<string, LightingState> = {};
    for (const d of devices) {
      deviceStates[d.info.id] = { ...d.state };
    }
    const now = new Date().toISOString();
    const profile: LightingProfile = {
      id: `profile-user-${Date.now()}`,
      name: name.trim() || 'Novo Perfil',
      description: description.trim() || 'Perfil personalizado salvo pelo usuário.',
      icon: 'Layers',
      isBuiltIn: false,
      globalSync: this.db.getSyncConfig(),
      deviceStates,
      createdAt: now,
      updatedAt: now,
    };
    this.db.saveProfile(profile);
    this.logger.info('ProfileManager', 'createProfile', `Perfil personalizado '${profile.name}' criado.`);
    return profile;
  }

  public async updateProfileWithCurrentState(
    profileId: string,
    updates?: { name?: string; description?: string }
  ): Promise<LightingProfile | null> {
    const existing = this.db.getProfile(profileId);
    if (!existing) return null;

    const devices = await this.deviceManager.getAllDevices();
    const deviceStates: Record<string, LightingState> = { ...existing.deviceStates };
    for (const d of devices) {
      deviceStates[d.info.id] = { ...d.state };
    }

    const updated: LightingProfile = {
      ...existing,
      name: updates?.name?.trim() || existing.name,
      description: updates?.description?.trim() || existing.description,
      deviceStates,
      updatedAt: new Date().toISOString(),
    };
    this.db.saveProfile(updated);
    this.logger.info('ProfileManager', 'updateProfile', `Perfil '${updated.name}' atualizado.`);
    return updated;
  }

  public duplicateProfile(profileId: string): LightingProfile | null {
    const existing = this.db.getProfile(profileId);
    if (!existing) return null;
    const now = new Date().toISOString();
    const copy: LightingProfile = {
      ...existing,
      id: `profile-copy-${Date.now()}`,
      name: `${existing.name} (Cópia)`,
      isBuiltIn: false,
      deviceStates: JSON.parse(JSON.stringify(existing.deviceStates)),
      createdAt: now,
      updatedAt: now,
    };
    this.db.saveProfile(copy);
    this.logger.info('ProfileManager', 'duplicateProfile', `Perfil '${existing.name}' duplicado como '${copy.name}'.`);
    return copy;
  }

  public deleteProfile(profileId: string): boolean {
    const ok = this.db.deleteProfile(profileId);
    if (ok) {
      this.logger.info('ProfileManager', 'deleteProfile', `Perfil '${profileId}' removido.`);
    }
    return ok;
  }
}
