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
import { applyHuskyPacketChecksum } from '../utils/checksum';
import { clampByte, clampPercent, sanitizeColor } from '../utils/color';

const HUSKY_DEVICE_ID = 'husky-tg200-320f-5016';

export class HuskyProvider extends BaseProvider {
  public readonly providerId = 'husky-native-hid';
  public readonly providerName = 'Husky Native HID Provider (EVision/Sonix V102)';

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
    const conflictProc = await this.conflictDetector.hasVendorConflict('Husky');

    const isConnected =
      snapshot.activeHidEnums.some((e) => e.toUpperCase().includes('VID_320F&PID_5016')) ||
      snapshot.allHidInterfaces.some((p) => p.toLowerCase().includes('vid_320f&pid_5016'));

    const interfacePath =
      snapshot.allHidInterfaces.find((p) =>
        p.toLowerCase().includes('vid_320f&pid_5016&mi_01&col04')
      ) || '\\\\?\\hid#vid_320f&pid_5016&mi_01&col04#{4d1e55b2-f16f-11cf-88cb-001111000030}';

    const info: DeviceInfo = {
      id: HUSKY_DEVICE_ID,
      name: 'Teclado Mecânico Husky Hailstorm 65% (TG200)',
      manufacturer: 'Husky Gaming (EVision/Sonix OEM)',
      model: 'TG200 (TK50S / WsKeyboardV102)',
      category: 'keyboard',
      protocol: 'USB HID Custom Report (UP: 0xFF1C, Usage: 0x0092, ReportID: 0x04, 64B)',
      providerId: this.providerId,
      vendorId: '0x320F',
      productId: '0x5016',
      interfacePath,
      firmwareOrBios: 'EVision V102 (TK50S)',
      connected: isConnected,
      compatibility: conflictProc
        ? 'conflict_detected'
        : isConnected
        ? 'compatible'
        : 'unsupported',
      compatibilityMessage: conflictProc
        ? `Conflito detectado com ${conflictProc}. Feche o software oficial para liberar o controle HID.`
        : isConnected
        ? 'Compatível via driver nativo HID 64-byte (EVision/Sonix 0xFF1C:0x0092). Não listado no OpenRGB.json padrão.'
        : 'Dispositivo desconectado.',
      requiresAdmin: false,
      conflictingProcess: conflictProc,
    };

    const caps: DeviceCapabilities = {
      supportedEffects: [
        'static',
        'breathing',
        'wave',
        'rainbow',
        'color_cycle',
        'reactive',
        'gradient',
        'strobing',
        'custom',
        'off',
      ],
      supportsBrightness: true,
      supportsSpeed: true,
      supportsDirection: true,
      supportsPerKeyOrZone: true,
      supportsHardwareProfileSave: true,
      maxZones: 5,
      brightnessRange: { min: 0, max: 100, step: 25 },
      speedRange: { min: 0, max: 100, step: 25 },
      notes:
        'Controlador EVision/Sonix 0x320F:0x5016. Suporta escrita em 0x0355 (cmd 0x1C, len 0x38) com checksum 16-bit LE nos bytes [1..2] e confirmação via cmd 0x06.',
    };

    this.devices.set(HUSKY_DEVICE_ID, info);
    this.capabilities.set(HUSKY_DEVICE_ID, caps);

    if (!this.states.has(HUSKY_DEVICE_ID)) {
      this.states.set(HUSKY_DEVICE_ID, {
        enabled: true,
        effect: 'wave',
        primaryColor: { r: 0, g: 240, b: 255 },
        secondaryColor: { r: 124, g: 58, b: 237 },
        brightness: 100,
        speed: 75,
        direction: 'right',
        updatedAt: new Date().toISOString(),
      });
    }

    return [info];
  }

  /**
   * Mapeia o efeito da aplicação para o byte de efeito do firmware WsKeyboardV102 (pkt[9] em SetLedEffectV102 / GetLedEffectV102):
   * - efxId 0 (Off) -> pkt[9] = 19 (0x13)
   * - efxId 1 (Static) -> pkt[9] = 5 (0x05)
   * - efxId 2 (Breathing) -> pkt[9] = 4 (0x04)
   * - efxId 3 (Neon / Color Cycle) -> pkt[9] = 3 (0x03)
   * - efxId 4 (Reactive) -> pkt[9] = 6 (0x06)
   * - efxId 5 (Wave) -> pkt[9] = 0 (0x00)
   * - efxId 6 (Raindrop / Strobing) -> pkt[9] = 7 (0x07)
   * - efxId 20 (RainbowW) -> pkt[9] = 12 (0x0C)
   * - efxId 26 (Waterfall / Gradient) -> pkt[9] = 11 (0x0B)
   * - efxId 141 (SwWindowShades / Custom) -> pkt[9] = 1 (0x01)
   */
  private mapEffectToFirmwareByte(effect: LightingEffectType): { fwCode: number; randomFlag: number } {
    switch (effect) {
      // randomFlag = pkt[13] = isRandomColor (GetLedEffectV102: isRandomColor = pkt[13] > 0).
      // 1 => firmware ignora RGB e usa cores aleatórias/arco-íris; 0 => usa pkt[14..16] (R,G,B).
      case 'off':
        return { fwCode: 0x13, randomFlag: 0 };
      case 'static':
        return { fwCode: 0x05, randomFlag: 0 };
      case 'breathing':
        return { fwCode: 0x04, randomFlag: 0 };
      case 'color_cycle':
        return { fwCode: 0x03, randomFlag: 1 };
      case 'wave':
        return { fwCode: 0x00, randomFlag: 0 };
      case 'rainbow':
        return { fwCode: 0x0c, randomFlag: 1 };
      case 'gradient':
        return { fwCode: 0x0b, randomFlag: 0 };
      case 'reactive':
        return { fwCode: 0x06, randomFlag: 0 };
      case 'strobing':
        return { fwCode: 0x07, randomFlag: 0 };
      case 'custom':
        return { fwCode: 0x01, randomFlag: 0 };
      default:
        return { fwCode: 0x05, randomFlag: 0 };
    }
  }

  /**
   * Constrói o pacote de 64 bytes documentado no método UsbHidDevice.WsUsbHidDevice.SetLedEffectV102 (DeviceBase.dll):
   * - pkt[0] = 0x04 (REPORT_ID)
   * - pkt[1..2] = Checksum 16-bit LE da soma de pkt[3..63]
   * - pkt[3] = 0x06 (CMD = 6)
   * - pkt[4] = 0x38 (LEN = 56)
   * - pkt[5..6] = SetAddress(profileId) -> 64 * profileId (0x0000 para profile 0)
   * - pkt[7] = 0x55 (Assinatura de comando LED V102)
   * - pkt[8] = profileId (0x00)
   * - pkt[9..16] = [fwCode, hwBrightness(0..4), hwSpeed(0..4), dirFlag(0..1), randomFlag(0..1), R, G, B]
   */
  public buildHuskyEffectPackets(state: LightingState, profileId = 0): Uint8Array[] {
    const pkt = new Uint8Array(64);
    const addr = (64 * profileId) & 0xffff;
    const { fwCode, randomFlag } = this.mapEffectToFirmwareByte(
      state.enabled ? state.effect : 'off'
    );

    // Escala de brilho no registrador pkt[10] do firmware V102: 0..4 (conforme GetLedEffectV102 / TK50SProfile)
    const normBr = state.enabled ? clampPercent(state.brightness) : 0;
    const hwBrightness =
      normBr <= 0 ? 0 : Math.min(4, Math.max(1, Math.round((normBr / 100) * 4)));

    // Escala de velocidade do firmware V102: 4 - speed (0..4, onde 0 é mais rápido no registrador)
    const normSpd = clampPercent(state.speed);
    const spdLevel = Math.min(4, Math.round((normSpd / 100) * 4));
    const hwSpeed = 4 - spdLevel;

    const dirFlag = state.direction === 'left' || state.direction === 'up' ? 1 : 0;
    const color = sanitizeColor(state.primaryColor);

    pkt[0] = 0x04; // REPORT_ID = 4
    pkt[3] = 0x06; // CMD = 6 (ldc.i4.6 em SetLedEffectV102)
    pkt[4] = 0x38; // LEN = 56 (0x38)
    pkt[5] = addr & 0xff;
    pkt[6] = (addr >> 8) & 0xff;
    pkt[7] = 0x55; // Assinatura 0x55 em pkt[7]
    pkt[8] = profileId & 0xff;
    pkt[9] = fwCode;
    pkt[10] = hwBrightness;
    pkt[11] = hwSpeed;
    pkt[12] = dirFlag;
    pkt[13] = randomFlag;
    pkt[14] = color.r;
    pkt[15] = color.g;
    pkt[16] = color.b;

    applyHuskyPacketChecksum(pkt);

    return [pkt];
  }

  private async transmitState(state: LightingState): Promise<boolean> {
    return this.validator.withDeviceLock(HUSKY_DEVICE_ID, async () => {
      const conflict = await this.conflictDetector.hasVendorConflict('Husky');
      if (conflict) {
        this.logger.security(
          this.providerId,
          'transmitState',
          `Escrita bloqueada por segurança: ${conflict} está em execução simultânea.`,
          HUSKY_DEVICE_ID
        );
        return false;
      }

      const packets = this.buildHuskyEffectPackets(state);
      for (const p of packets) {
        const validation = this.validator.validateHuskyPacket(p);
        if (!validation.valid) {
          this.logger.error(
            this.providerId,
            'validateHuskyPacket',
            `Pacote rejeitado pelo validador de segurança: ${validation.reason}`,
            HUSKY_DEVICE_ID
          );
          return false;
        }
      }

      const res = await this.bridge.sendHuskyHidPackets(packets);
      const hexPreview = Buffer.from(packets[0].subarray(0, 18)).toString('hex');
      if (res.success) {
        this.states.set(HUSKY_DEVICE_ID, state);
        this.logger.info(
          this.providerId,
          'sendHuskyHidPackets',
          `Comando HID 64B aplicado no Husky TG200 (${state.effect}, RGB ${state.primaryColor.r},${state.primaryColor.g},${state.primaryColor.b}).`,
          HUSKY_DEVICE_ID,
          `Método: ${res.method} | Header[0..17]: ${hexPreview}`
        );
        return true;
      } else {
        this.states.set(HUSKY_DEVICE_ID, state);
        this.logger.warn(
          this.providerId,
          'sendHuskyHidPackets',
          `Pacote HID construído e validado, porém o handle Win32 retornou restrição de acesso (${res.error}). Execute o aplicativo fora de ambiente restrito para escrita USB direta.`,
          HUSKY_DEVICE_ID,
          `Header[0..17]: ${hexPreview}`
        );
        return false;
      }
    });
  }

  public async setColor(
    deviceId: string,
    color: RGBColor,
    secondaryColor?: RGBColor
  ): Promise<boolean> {
    if (deviceId !== HUSKY_DEVICE_ID) return false;
    const current = (await this.getLightingState(deviceId))!;
    const nextState: LightingState = {
      ...current,
      enabled: true,
      primaryColor: sanitizeColor(color),
      secondaryColor: secondaryColor ? sanitizeColor(secondaryColor) : current.secondaryColor,
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
    if (deviceId !== HUSKY_DEVICE_ID) return false;
    const current = (await this.getLightingState(deviceId))!;
    const nextState: LightingState = {
      ...current,
      enabled: effect !== 'off',
      effect,
      primaryColor: options?.primaryColor ? sanitizeColor(options.primaryColor) : current.primaryColor,
      secondaryColor: options?.secondaryColor
        ? sanitizeColor(options.secondaryColor)
        : current.secondaryColor,
      gradientColors: options?.gradientColors ?? current.gradientColors,
      brightness:
        options?.brightness !== undefined
          ? clampPercent(options.brightness)
          : current.brightness,
      speed: options?.speed !== undefined ? clampPercent(options.speed) : current.speed,
      direction: options?.direction ?? current.direction,
      updatedAt: new Date().toISOString(),
    };
    return this.transmitState(nextState);
  }

  public async setBrightness(deviceId: string, brightness: number): Promise<boolean> {
    if (deviceId !== HUSKY_DEVICE_ID) return false;
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
    if (deviceId !== HUSKY_DEVICE_ID) return false;
    const current = (await this.getLightingState(deviceId))!;
    const nextState: LightingState = {
      ...current,
      speed: clampPercent(speed),
      updatedAt: new Date().toISOString(),
    };
    return this.transmitState(nextState);
  }

  public async saveProfile(deviceId: string): Promise<boolean> {
    if (deviceId !== HUSKY_DEVICE_ID) return false;
    const current = await this.getLightingState(deviceId);
    if (!current) return false;
    return this.transmitState(current);
  }
}
