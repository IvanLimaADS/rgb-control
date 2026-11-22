import {
  DeviceCapabilities,
  DeviceInfo,
  EffectDirection,
  IDeviceProvider,
  LightingEffectType,
  LightingState,
  RGBColor,
} from '../shared/types';
import { LoggerService } from '../services/LoggerService';
import { HardwareSafetyValidator } from '../core/HardwareSafetyValidator';

export abstract class BaseProvider implements IDeviceProvider {
  public abstract readonly providerId: string;
  public abstract readonly providerName: string;

  protected logger: LoggerService;
  protected validator: HardwareSafetyValidator;
  protected devices = new Map<string, DeviceInfo>();
  protected capabilities = new Map<string, DeviceCapabilities>();
  protected states = new Map<string, LightingState>();

  constructor(logger: LoggerService, validator: HardwareSafetyValidator) {
    this.logger = logger;
    this.validator = validator;
  }

  public abstract discoverDevices(): Promise<DeviceInfo[]>;

  public async getDeviceInfo(deviceId: string): Promise<DeviceInfo | null> {
    return this.devices.get(deviceId) || null;
  }

  public async getCapabilities(deviceId: string): Promise<DeviceCapabilities | null> {
    return this.capabilities.get(deviceId) || null;
  }

  public async getLightingState(deviceId: string): Promise<LightingState | null> {
    return this.states.get(deviceId) || null;
  }

  public abstract setColor(
    deviceId: string,
    color: RGBColor,
    secondaryColor?: RGBColor
  ): Promise<boolean>;

  public abstract setEffect(
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
  ): Promise<boolean>;

  public abstract setBrightness(deviceId: string, brightness: number): Promise<boolean>;

  public abstract setSpeed(deviceId: string, speed: number): Promise<boolean>;

  public abstract saveProfile(deviceId: string): Promise<boolean>;

  public async disconnect(): Promise<void> {
    this.logger.info(this.providerId, 'disconnect', `Provider ${this.providerName} desconectado.`);
  }
}
