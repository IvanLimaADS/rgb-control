import {
  DeviceCapabilities,
  DeviceInfo,
  LightingEffectType,
  LightingState,
  RGBColor,
} from '../shared/types';
import { BaseProvider } from './BaseProvider';
import { NativeHardwareBridge } from './NativeHardwareBridge';
import { HardwareSafetyValidator } from '../core/HardwareSafetyValidator';
import { LoggerService } from '../services/LoggerService';

export class UnsupportedHidProvider extends BaseProvider {
  public readonly providerId = 'unsupported-hid-monitor';
  public readonly providerName = 'Monitor de Periféricos Sem Suporte RGB';

  private bridge: NativeHardwareBridge;

  constructor(
    logger: LoggerService,
    validator: HardwareSafetyValidator,
    bridge: NativeHardwareBridge
  ) {
    super(logger, validator);
    this.bridge = bridge;
  }

  public async discoverDevices(): Promise<DeviceInfo[]> {
    const snapshot = await this.bridge.getHostSnapshot();
    const discovered: DeviceInfo[] = [];

    const hasLogitechG325 =
      snapshot.activeHidEnums.some((e) => e.toUpperCase().includes('VID_046D&PID_0B21')) ||
      snapshot.allHidInterfaces.some((p) => p.toLowerCase().includes('vid_046d&pid_0b21'));

    if (hasLogitechG325) {
      const id = 'logitech-g325-046d-0b21';
      const info: DeviceInfo = {
        id,
        name: 'Headset Sem Fio Logitech G325 Lightspeed',
        manufacturer: 'Logitech',
        model: 'G325 Lightspeed',
        category: 'headset',
        protocol: 'USB Audio / HID Consumer Control (0x046D:0x0B21)',
        providerId: this.providerId,
        vendorId: '0x046D',
        productId: '0x0B21',
        connected: true,
        compatibility: 'unsupported',
        compatibilityMessage:
          'Dispositivo identificado na porta USB, porém não possui zonas de iluminação RGB/ARGB controláveis por hardware.',
        requiresAdmin: false,
      };
      this.registerUnsupported(info);
      discovered.push(info);
    }

    const hasLogitechUnifying =
      snapshot.activeHidEnums.some((e) => e.toUpperCase().includes('VID_046D&PID_C52B')) ||
      snapshot.allHidInterfaces.some((p) => p.toLowerCase().includes('vid_046d&pid_c52b'));

    if (hasLogitechUnifying) {
      const id = 'logitech-unifying-046d-c52b';
      const info: DeviceInfo = {
        id,
        name: 'Logitech USB Unifying Receiver',
        manufacturer: 'Logitech',
        model: 'Unifying Receiver (C52B)',
        category: 'receiver',
        protocol: 'USB HID DJ / HID++ Receiver (0x046D:0xC52B)',
        providerId: this.providerId,
        vendorId: '0x046D',
        productId: '0xC52B',
        connected: true,
        compatibility: 'unsupported',
        compatibilityMessage:
          'Receptor sem fio identificado. Não possui LEDs RGB/ARGB integrados.',
        requiresAdmin: false,
      };
      this.registerUnsupported(info);
      discovered.push(info);
    }

    return discovered;
  }

  private registerUnsupported(info: DeviceInfo): void {
    const caps: DeviceCapabilities = {
      supportedEffects: ['off'],
      supportsBrightness: false,
      supportsSpeed: false,
      supportsDirection: false,
      supportsPerKeyOrZone: false,
      supportsHardwareProfileSave: false,
      maxZones: 0,
      brightnessRange: { min: 0, max: 0, step: 0 },
      speedRange: { min: 0, max: 0, step: 0 },
      notes: 'Periférico monitorado apenas para inventário USB/HID. Comandos RGB são bloqueados.',
    };
    const state: LightingState = {
      enabled: false,
      effect: 'off',
      primaryColor: { r: 0, g: 0, b: 0 },
      brightness: 0,
      speed: 0,
      direction: 'right',
      updatedAt: new Date().toISOString(),
    };
    this.devices.set(info.id, info);
    this.capabilities.set(info.id, caps);
    this.states.set(info.id, state);
  }

  public async setColor(_deviceId: string, _color: RGBColor): Promise<boolean> {
    return false;
  }

  public async setEffect(_deviceId: string, _effect: LightingEffectType): Promise<boolean> {
    return false;
  }

  public async setBrightness(_deviceId: string, _brightness: number): Promise<boolean> {
    return false;
  }

  public async setSpeed(_deviceId: string, _speed: number): Promise<boolean> {
    return false;
  }

  public async saveProfile(_deviceId: string): Promise<boolean> {
    return false;
  }
}
