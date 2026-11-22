import {
  CompatibilityMatrixItem,
  EffectDirection,
  IDeviceProvider,
  LightingEffectType,
  RGBColor,
  RGBDevice,
  SyncConfig,
} from '../shared/types';
import { DatabaseManager } from '../database/DatabaseManager';
import { EffectEngine } from '../effects/EffectEngine';
import { SoftwareEffectRunner } from '../effects/SoftwareEffectRunner';
import { LoggerService } from '../services/LoggerService';

export class DeviceManager {
  private providers = new Map<string, IDeviceProvider>();
  private deviceToProvider = new Map<string, IDeviceProvider>();
  private db: DatabaseManager;
  private effectEngine: EffectEngine;
  private softwareRunner: SoftwareEffectRunner;
  private logger: LoggerService;

  constructor(db: DatabaseManager, effectEngine: EffectEngine, logger: LoggerService) {
    this.db = db;
    this.effectEngine = effectEngine;
    this.logger = logger;
    this.softwareRunner = new SoftwareEffectRunner(logger);
  }

  public registerProvider(provider: IDeviceProvider): void {
    this.providers.set(provider.providerId, provider);
    this.logger.info('DeviceManager', 'registerProvider', `Provider registrado: ${provider.providerName}`);
  }

  public async discoverAllDevices(): Promise<RGBDevice[]> {
    this.deviceToProvider.clear();
    const allDevices: RGBDevice[] = [];

    for (const provider of this.providers.values()) {
      try {
        const infos = await provider.discoverDevices();
        for (const info of infos) {
          this.deviceToProvider.set(info.id, provider);
          const caps = await provider.getCapabilities(info.id);
          const savedState = this.db.getDeviceState(info.id);
          const providerState = await provider.getLightingState(info.id);
          const activeState = savedState || providerState;

          if (caps && activeState) {
            allDevices.push({
              info,
              capabilities: caps,
              state: activeState,
            });
          }
        }
      } catch (err: any) {
        this.logger.error(
          provider.providerId,
          'discoverDevices',
          `Erro ao descobrir dispositivos em ${provider.providerName}: ${err?.message}`
        );
      }
    }

    return allDevices;
  }

  public async getAllDevices(): Promise<RGBDevice[]> {
    if (this.deviceToProvider.size === 0) {
      return this.discoverAllDevices();
    }
    const list: RGBDevice[] = [];
    for (const [deviceId, provider] of this.deviceToProvider.entries()) {
      const info = await provider.getDeviceInfo(deviceId);
      const caps = await provider.getCapabilities(deviceId);
      const state = this.db.getDeviceState(deviceId) || (await provider.getLightingState(deviceId));
      if (info && caps && state) {
        list.push({ info, capabilities: caps, state });
      }
    }
    return list;
  }

  public async setDeviceColor(
    deviceId: string,
    color: RGBColor,
    secondaryColor?: RGBColor
  ): Promise<boolean> {
    const provider = this.deviceToProvider.get(deviceId);
    if (!provider) return false;

    const info = await provider.getDeviceInfo(deviceId);
    const caps = await provider.getCapabilities(deviceId);
    const current = this.db.getDeviceState(deviceId) || (await provider.getLightingState(deviceId));
    if (!info || !caps || !current) return false;

    if (info.compatibility === 'unsupported' || info.compatibility === 'sdk_offline') {
      this.logger.warn(
        provider.providerId,
        'setDeviceColor',
        `Operação recusada: dispositivo ${info.name} está com status '${info.compatibility}'.`,
        deviceId
      );
      return false;
    }

    const validated = this.effectEngine.buildValidatedState(current, caps, {
      enabled: true,
      primaryColor: color,
      secondaryColor,
    });

    this.db.saveDeviceState(deviceId, validated);

    if (validated.enabled && this.softwareRunner.isSoftwareEffect(validated.effect)) {
      this.softwareRunner.start({
        deviceId,
        provider,
        effect: validated.effect,
        primaryColor: validated.primaryColor,
        secondaryColor: validated.secondaryColor || validated.primaryColor,
        speed: validated.speed,
        isMotherboard: info.category === 'motherboard',
      });
      return true;
    }

    this.softwareRunner.stop(deviceId);
    return provider.setColor(deviceId, validated.primaryColor, validated.secondaryColor);
  }

  public async setDeviceEffect(
    deviceId: string,
    effect: LightingEffectType,
    options?: {
      primaryColor?: RGBColor;
      secondaryColor?: RGBColor;
      gradientColors?: RGBColor[];
      speed?: number;
      brightness?: number;
      direction?: EffectDirection;
    }
  ): Promise<boolean> {
    const provider = this.deviceToProvider.get(deviceId);
    if (!provider) return false;

    const info = await provider.getDeviceInfo(deviceId);
    const caps = await provider.getCapabilities(deviceId);
    const current = this.db.getDeviceState(deviceId) || (await provider.getLightingState(deviceId));
    if (!info || !caps || !current) return false;

    if (info.compatibility === 'unsupported' || info.compatibility === 'sdk_offline') {
      return false;
    }

    const validated = this.effectEngine.buildValidatedState(current, caps, {
      enabled: effect !== 'off',
      effect,
      ...options,
    });

    this.softwareRunner.stop(deviceId);

    const ok = await provider.setEffect(deviceId, validated.effect, {
      primaryColor: validated.primaryColor,
      secondaryColor: validated.secondaryColor,
      gradientColors: validated.gradientColors,
      speed: validated.speed,
      brightness: validated.brightness,
      direction: validated.direction,
    });
    this.db.saveDeviceState(deviceId, validated);

    if (ok && validated.enabled && this.softwareRunner.isSoftwareEffect(validated.effect)) {
      this.softwareRunner.start({
        deviceId,
        provider,
        effect: validated.effect,
        primaryColor: validated.primaryColor,
        secondaryColor: validated.secondaryColor || validated.primaryColor,
        speed: validated.speed,
        isMotherboard: info.category === 'motherboard',
      });
    }

    return ok;
  }

  public async setDeviceBrightness(deviceId: string, brightness: number): Promise<boolean> {
    const provider = this.deviceToProvider.get(deviceId);
    if (!provider) return false;

    const info = await provider.getDeviceInfo(deviceId);
    const caps = await provider.getCapabilities(deviceId);
    const current = this.db.getDeviceState(deviceId) || (await provider.getLightingState(deviceId));
    if (!info || !caps || !current) return false;

    const validated = this.effectEngine.buildValidatedState(current, caps, {
      enabled: brightness > 0,
      brightness,
    });

    if (!validated.enabled) {
      this.softwareRunner.stop(deviceId);
    }

    const ok = await provider.setBrightness(deviceId, validated.brightness);
    this.db.saveDeviceState(deviceId, validated);
    return ok;
  }

  public async setDeviceSpeed(deviceId: string, speed: number): Promise<boolean> {
    const provider = this.deviceToProvider.get(deviceId);
    if (!provider) return false;

    const info = await provider.getDeviceInfo(deviceId);
    const caps = await provider.getCapabilities(deviceId);
    const current = this.db.getDeviceState(deviceId) || (await provider.getLightingState(deviceId));
    if (!info || !caps || !current) return false;

    const validated = this.effectEngine.buildValidatedState(current, caps, { speed });
    const ok = await provider.setSpeed(deviceId, validated.speed);
    this.db.saveDeviceState(deviceId, validated);

    if (validated.enabled && this.softwareRunner.isSoftwareEffect(validated.effect)) {
      this.softwareRunner.start({
        deviceId,
        provider,
        effect: validated.effect,
        primaryColor: validated.primaryColor,
        secondaryColor: validated.secondaryColor || validated.primaryColor,
        speed: validated.speed,
        isMotherboard: info.category === 'motherboard',
      });
    }

    return ok;
  }

  public async toggleDevicePower(deviceId: string, enabled: boolean): Promise<boolean> {
    const provider = this.deviceToProvider.get(deviceId);
    if (!provider) return false;

    const current = this.db.getDeviceState(deviceId) || (await provider.getLightingState(deviceId));
    if (!current) return false;

    if (!enabled) {
      return this.setDeviceEffect(deviceId, 'off', { brightness: 0 });
    } else {
      const targetEffect = current.effect === 'off' ? 'static' : current.effect;
      const targetBr = current.brightness === 0 ? 100 : current.brightness;
      return this.setDeviceEffect(deviceId, targetEffect, {
        primaryColor: current.primaryColor,
        secondaryColor: current.secondaryColor,
        brightness: targetBr,
        speed: current.speed,
        direction: current.direction,
      });
    }
  }

  public async saveDeviceHardwareProfile(deviceId: string): Promise<boolean> {
    const provider = this.deviceToProvider.get(deviceId);
    if (!provider) return false;
    return provider.saveProfile(deviceId);
  }

  public async restorePreviousDeviceState(deviceId: string): Promise<boolean> {
    const prev = this.db.getPreviousDeviceState(deviceId);
    if (!prev) return false;
    return this.setDeviceEffect(deviceId, prev.effect, {
      primaryColor: prev.primaryColor,
      secondaryColor: prev.secondaryColor,
      gradientColors: prev.gradientColors,
      brightness: prev.brightness,
      speed: prev.speed,
      direction: prev.direction,
    });
  }

  /**
   * Funcionalidade Sync RGB (Seção 4.4):
   * Aplica simultaneamente mesma cor, efeito, velocidade e padrão aos dispositivos selecionados,
   * respeitando a lista de exceções (excludedDeviceIds).
   */
  public async applyGlobalSync(config: SyncConfig): Promise<{
    appliedDevices: string[];
    skippedExceptions: string[];
    failedDevices: string[];
  }> {
    this.db.saveSyncConfig(config);
    const devices = await this.getAllDevices();
    const appliedDevices: string[] = [];
    const skippedExceptions: string[] = [];
    const failedDevices: string[] = [];

    for (const dev of devices) {
      const id = dev.info.id;
      if (config.excludedDeviceIds.includes(id)) {
        skippedExceptions.push(id);
        continue;
      }
      if (!config.includedDeviceIds.includes(id)) {
        continue;
      }
      if (dev.info.compatibility === 'unsupported' || dev.info.compatibility === 'sdk_offline') {
        continue;
      }

      const ok = await this.setDeviceEffect(id, config.effect, {
        primaryColor: config.primaryColor,
        secondaryColor: config.secondaryColor,
        brightness: config.brightness,
        speed: config.speed,
        direction: config.direction,
      });

      if (ok) {
        appliedDevices.push(id);
      } else {
        failedDevices.push(id);
      }
    }

    this.logger.info(
      'DeviceManager',
      'applyGlobalSync',
      `Sync RGB executado (${config.effect}): ${appliedDevices.length} sincronizados, ${skippedExceptions.length} exceções ignoradas.`
    );

    return { appliedDevices, skippedExceptions, failedDevices };
  }

  public getCompatibilityMatrix(): CompatibilityMatrixItem[] {
    return [
      {
        component: 'Placa-mãe',
        manufacturer: 'Gigabyte',
        model: 'B450M GAMING (BIOS F62)',
        vidPid: 'SMBus MCU 0x08210001 (ITE 048D:8297)',
        interfaceProtocol: 'SMBus Onboard LED_V4 via LedLib2.dll / SMBCtrl.dll (GVCIDrv64.sys)',
        openRgbSupport:
          'Incompatível no OpenRGB 1.0rc2 (ausente do OpenRGB.json para B450M GAMING + erro de driver PawnIO ausente)',
        officialSoftware: 'Gigabyte RGB Fusion (C:\\Program Files (x86)\\Gigabyte\\RGBFusion)',
        nativeProviderStatus: 'admin_required',
        supportedEffectsList: ['Static', 'Breathing (Pulse)', 'Color Cycle', 'Strobing (Flash)', 'Off'],
        technicalNotes:
          'Header 12V GRB analógico de zona única. Requer execução como Administrador para abrir o driver kernel GVCIDrv64.sys (retorna erro Win32 4317 sem elevação).',
      },
      {
        component: 'Teclado',
        manufacturer: 'Husky Gaming (EVision/Sonix OEM)',
        model: 'TG200 (Hailstorm 65% RGB / TK50S)',
        vidPid: 'VID_320F & PID_5016 (MI_01&Col04)',
        interfaceProtocol: 'USB HID Custom Report 64B (UsagePage 0xFF1C, Usage 0x0092, ReportID 0x04)',
        openRgbSupport:
          'Não suportado pelo OpenRGB 1.0rc2 (OpenRGB lista outros PIDs 0x320F, mas não 0x5016)',
        officialSoftware: 'Central de Controle Husky (DeviceBase.dll / Products\\TK50S.dll)',
        nativeProviderStatus: 'compatible',
        supportedEffectsList: [
          'Static',
          'Gradient (SineWave)',
          'Rainbow',
          'Breathing',
          'Wave',
          'Color Cycle (Neon)',
          'Reactive (Follow)',
          'Strobing (Ripple)',
          'Custom',
          'Off',
        ],
        technicalNotes:
          'Protocolo WsKeyboardV102 mapeado: pacote 64B com checksum 16-bit LE em pkt[1..2], escrita no endereço 0x0355 (cmd 0x1C, len 0x38) seguida de commit cmd 0x06.',
      },
      {
        component: 'Mouse',
        manufacturer: 'Redragon (Compx OEM)',
        model: 'M719RGB-PRO Invader (PMW3325)',
        vidPid: 'VID_25A7 & PID_FA7E (e PID_FAB0, MI_01&Col07)',
        interfaceProtocol: 'USB HID Feature Report 17B (UsagePage 0xFF02, Usage 0x0002, ReportID 0x08)',
        openRgbSupport: 'Não suportado pelo OpenRGB 1.0rc2 (PID 0xFA7E ausente da tabela Redragon)',
        officialSoftware: 'Redragon M719RGB-PRO (OemDrv.exe / Lowerdev.dll)',
        nativeProviderStatus: 'compatible',
        supportedEffectsList: [
          'Static (Steady)',
          'Breathing (Respiration)',
          'Color Cycle (Neon)',
          'Wave (Streaming)',
          'Rainbow',
          'Off',
        ],
        technicalNotes:
          'Protocolo EEPROM via Feature Report 0x08: grava 7 bytes em MainRGB (0x00A0: R, G, B, Brilho 1..3, Modo, Velocidade 1..5, Checksum 0x55-sum) e aplica via SendCMD(0x09, 0).',
      },
      {
        component: 'Ponte SDK Externa',
        manufacturer: 'OpenRGB Project',
        model: 'OpenRGB SDK Server v4',
        vidPid: 'TCP 127.0.0.1:6742',
        interfaceProtocol: 'OpenRGB Binary Socket Protocol (Magic ORGB, v4)',
        openRgbSupport: 'Nativo (Cliente SDK integrado)',
        officialSoftware: 'OpenRGB v0.9+ / 1.0rc2',
        nativeProviderStatus: 'sdk_offline',
        supportedEffectsList: ['Static', 'Breathing', 'Rainbow', 'Wave', 'Color Cycle', 'Off'],
        technicalNotes:
          'Permite expansão imediata para módulos de memória RAM, coolers ARGB e controladoras USB suportadas pelo OpenRGB quando o SDK Server estiver ativo.',
      },
      {
        component: 'Headset Sem Fio',
        manufacturer: 'Logitech',
        model: 'G325 Lightspeed',
        vidPid: 'VID_046D & PID_0B21',
        interfaceProtocol: 'USB Audio / HID Consumer Control',
        openRgbSupport: 'N/A (Sem LEDs RGB)',
        officialSoftware: 'Logitech G HUB',
        nativeProviderStatus: 'unsupported',
        supportedEffectsList: [],
        technicalNotes:
          'Detectado no barramento USB/HID da máquina. Marcado como sem suporte RGB para transparência no painel.',
      },
    ];
  }

  public async disconnectAll(): Promise<void> {
    this.softwareRunner.stopAll();
    for (const provider of this.providers.values()) {
      await provider.disconnect();
    }
  }
}
