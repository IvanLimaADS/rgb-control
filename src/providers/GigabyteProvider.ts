import {
  DeviceCapabilities,
  DeviceInfo,
  EffectDirection,
  LightingEffectType,
  LightingState,
  RGBColor,
} from '../shared/types';
import { BaseProvider } from './BaseProvider';
import { NativeHardwareBridge } from './NativeHardwareBridge';
import { ConflictDetector } from '../core/ConflictDetector';
import { HardwareSafetyValidator } from '../core/HardwareSafetyValidator';
import { LoggerService } from '../services/LoggerService';
import { clampPercent, sanitizeColor } from '../utils/color';

const GIGABYTE_DEVICE_ID = 'gigabyte-b450m-gaming';

export class GigabyteProvider extends BaseProvider {
  public readonly providerId = 'gigabyte-smbus-bridge';
  public readonly providerName = 'Gigabyte RGB Fusion Bridge (SMBus LED_V4 / LedLib2.dll)';

  private bridge: NativeHardwareBridge;
  private conflictDetector: ConflictDetector;

  constructor(
    logger: LoggerService,
    validator: HardwareSafetyValidator,
    bridge: NativeHardwareBridge,
    conflictDetector: ConflictDetector
  ) {
    super(logger, validator);
    this.bridge = bridge;
    this.conflictDetector = conflictDetector;
  }

  public async discoverDevices(): Promise<DeviceInfo[]> {
    const snapshot = await this.bridge.getHostSnapshot();
    const conflictProc = await this.conflictDetector.hasVendorConflict('Gigabyte');
    const isB450M =
      snapshot.biosProduct.toUpperCase().includes('B450M') ||
      snapshot.gigabyteRegistry.installed;

    let compatibility: DeviceInfo['compatibility'] = 'unsupported';
    let message = 'Placa-mãe Gigabyte não detectada.';

    if (conflictProc) {
      compatibility = 'conflict_detected';
      message = `Conflito ativo com ${conflictProc}. Feche o RGB Fusion para evitar disputa de barramento SMBus.`;
    } else if (isB450M && snapshot.isAdmin) {
      compatibility = 'compatible';
      message =
        'Compatível via ponte nativa 32-bit (LedLib2.dll / SMBCtrl.dll -> GVCIDrv64.sys) com privilégios de Administrador ativos.';
    } else if (isB450M && !snapshot.isAdmin) {
      compatibility = 'admin_required';
      message =
        'Requer privilégios de Administrador para acesso de escrita SMBus (driver kernel GVCIDrv64.sys retorna erro Win32 4317 sem elevação). Estado atual lido do registro do RGB Fusion.';
    }

    const info: DeviceInfo = {
      id: GIGABYTE_DEVICE_ID,
      name: `Placa-Mãe Gigabyte ${snapshot.biosProduct || 'B450M GAMING'}`,
      manufacturer: snapshot.biosManufacturer || 'Gigabyte Technology Co., Ltd.',
      model: snapshot.biosProduct || 'B450M GAMING',
      category: 'motherboard',
      protocol: 'SMBus Onboard MCU (ITE LED_V4 0x08210001 via SMBCtrl.dll / GVCIDrv64.sys)',
      providerId: this.providerId,
      vendorId: '0x048D',
      productId: '0x8297',
      interfacePath: snapshot.gigabyteRegistry.exePath,
      firmwareOrBios: `BIOS ${snapshot.biosVersion || 'F62'} | LED_ID 0x${snapshot.gigabyteRegistry.ledId.toString(16)}`,
      connected: isB450M,
      compatibility,
      compatibilityMessage: message,
      requiresAdmin: true,
      conflictingProcess: conflictProc,
    };

    const caps: DeviceCapabilities = {
      supportedEffects: ['static', 'breathing', 'color_cycle', 'strobing', 'gradient', 'custom', 'off'],
      supportsBrightness: true,
      supportsSpeed: true,
      supportsDirection: false,
      supportsPerKeyOrZone: false,
      supportsHardwareProfileSave: true,
      maxZones: 1, // Header 12V G R B analógico de zona única na B450M GAMING
      brightnessRange: { min: 0, max: 100, step: 10 },
      speedRange: { min: 0, max: 100, step: 20 },
      notes:
        'A placa Gigabyte B450M GAMING utiliza um header RGB 12V analógico controlado por MCU SMBus (LED_V4). Não suporta efeitos ARGB endereçáveis (Wave/Rainbow por LED). Não está incluída no OpenRGB 1.0rc2 e requer privilégios de Administrador para abrir o driver GVCIDrv64.sys.',
    };

    this.devices.set(GIGABYTE_DEVICE_ID, info);
    this.capabilities.set(GIGABYTE_DEVICE_ID, caps);

    if (!this.states.has(GIGABYTE_DEVICE_ID)) {
      const regColor = this.bridge.parseGigabyteRegistryColor(snapshot.gigabyteRegistry.color);
      const regBr = Math.min(100, Math.round((snapshot.gigabyteRegistry.brightness / 9) * 100));
      const regMode = snapshot.gigabyteRegistry.mode;
      let initialEffect: LightingEffectType = 'static';
      if (regMode === 0) initialEffect = 'off';
      else if (regMode === 1) initialEffect = 'static';
      else if (regMode === 2) initialEffect = 'breathing';
      else if (regMode === 3) initialEffect = 'strobing';
      else if (regMode === 4) initialEffect = 'color_cycle';

      this.states.set(GIGABYTE_DEVICE_ID, {
        enabled: initialEffect !== 'off',
        effect: initialEffect,
        primaryColor: regColor,
        brightness: regBr || 100,
        speed: Math.min(100, Math.round((snapshot.gigabyteRegistry.speed / 5) * 100)),
        direction: 'right',
        updatedAt: new Date().toISOString(),
      });
    }

    return [info];
  }

  private mapEffectToGigabyteMode(effect: LightingEffectType): number {
    switch (effect) {
      case 'off':
        return 0;
      case 'static':
      case 'gradient':
      case 'custom':
        return 1; // Still / Static (para gradient/custom o motor de software alterna entre Primária e Secundária)
      case 'breathing':
        return 2; // Pulse
      case 'strobing':
        return 3; // Flash
      case 'color_cycle':
      case 'rainbow':
      case 'wave':
      case 'gradient':
        return 4; // Color Cycle (único efeito dinâmico multicolor em header 12V GRB)
      default:
        return 1;
    }
  }

  private async transmitState(state: LightingState): Promise<boolean> {
    return this.validator.withDeviceLock(GIGABYTE_DEVICE_ID, async () => {
      const conflict = await this.conflictDetector.hasVendorConflict('Gigabyte');
      if (conflict) {
        this.logger.info(
          this.providerId,
          'transmitState',
          `Encerrando processo conflitante em segundo plano (${conflict}) antes de assumir o barramento SMBus.`,
          GIGABYTE_DEVICE_ID
        );
      }

      const hwMode = state.enabled ? this.mapEffectToGigabyteMode(state.effect) : 0;
      const hwBrightness = state.enabled ? Math.round((clampPercent(state.brightness) / 100) * 9) : 0;
      const hwSpeed = Math.round((clampPercent(state.speed) / 100) * 5);

      const res = await this.bridge.applyGigabyteMotherboardLighting({
        mode: hwMode,
        color: sanitizeColor(state.primaryColor),
        brightness: hwBrightness,
        speed: hwSpeed,
      });

      this.states.set(GIGABYTE_DEVICE_ID, state);

      if (!res.success) {
        this.logger.warn(
          this.providerId,
          'applyGigabyteMotherboardLighting',
          `Controle SMBus da Gigabyte B450M GAMING não executado: ${res.error}`,
          GIGABYTE_DEVICE_ID,
          `Modo solicitado: ${state.effect} (Mode=${hwMode}, Br=${hwBrightness}/9)`
        );
        return false;
      }

      this.logger.info(
        this.providerId,
        'applyGigabyteMotherboardLighting',
        `Iluminação SMBus aplicada na placa-mãe Gigabyte B450M GAMING (${state.effect}).`,
        GIGABYTE_DEVICE_ID
      );
      return true;
    });
  }

  public async setColor(deviceId: string, color: RGBColor): Promise<boolean> {
    if (deviceId !== GIGABYTE_DEVICE_ID) return false;
    const current = (await this.getLightingState(deviceId))!;
    const nextState: LightingState = {
      ...current,
      enabled: true,
      primaryColor: sanitizeColor(color),
      updatedAt: new Date().toISOString(),
    };
    return this.transmitState(nextState);
  }

  public async setEffect(
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
    if (deviceId !== GIGABYTE_DEVICE_ID) return false;
    const current = (await this.getLightingState(deviceId))!;
    const nextState: LightingState = {
      ...current,
      enabled: effect !== 'off',
      effect,
      primaryColor: options?.primaryColor ? sanitizeColor(options.primaryColor) : current.primaryColor,
      brightness:
        options?.brightness !== undefined
          ? clampPercent(options.brightness)
          : current.brightness,
      speed: options?.speed !== undefined ? clampPercent(options.speed) : current.speed,
      updatedAt: new Date().toISOString(),
    };
    return this.transmitState(nextState);
  }

  public async setBrightness(deviceId: string, brightness: number): Promise<boolean> {
    if (deviceId !== GIGABYTE_DEVICE_ID) return false;
    const current = (await this.getLightingState(deviceId))!;
    const nextState: LightingState = {
      ...current,
      enabled: clampPercent(brightness) > 0,
      brightness: clampPercent(brightness),
      updatedAt: new Date().toISOString(),
    };
    return this.transmitState(nextState);
  }

  public async setSpeed(deviceId: string, speed: number): Promise<boolean> {
    if (deviceId !== GIGABYTE_DEVICE_ID) return false;
    const current = (await this.getLightingState(deviceId))!;
    const nextState: LightingState = {
      ...current,
      speed: clampPercent(speed),
      updatedAt: new Date().toISOString(),
    };
    return this.transmitState(nextState);
  }

  public async saveProfile(deviceId: string): Promise<boolean> {
    if (deviceId !== GIGABYTE_DEVICE_ID) return false;
    const current = await this.getLightingState(deviceId);
    if (!current) return false;
    return this.transmitState(current);
  }
}
