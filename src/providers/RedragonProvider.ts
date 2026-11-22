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
import {
  computeRedragonComplement55,
  finalizeRedragonFeatureReport,
} from '../utils/checksum';
import { clampPercent, sanitizeColor } from '../utils/color';

const REDRAGON_DEVICE_ID = 'redragon-m719rgb-25a7-fa7e';

export class RedragonProvider extends BaseProvider {
  public readonly providerId = 'redragon-native-hid';
  public readonly providerName = 'Redragon Native HID Provider (M719RGB-PRO Feature Report)';

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
    const conflictProc = await this.conflictDetector.hasVendorConflict('Redragon');

    const isConnected =
      snapshot.activeHidEnums.some((e) => e.toUpperCase().includes('VID_25A7&PID_FA7E')) ||
      snapshot.activeHidEnums.some((e) => e.toUpperCase().includes('VID_25A7&PID_FAB0')) ||
      snapshot.allHidInterfaces.some((p) => p.toLowerCase().includes('vid_25a7&pid_fa7e'));

    const interfacePath =
      snapshot.allHidInterfaces.find((p) =>
        p.toLowerCase().includes('vid_25a7&pid_fa7e&mi_01&col07')
      ) || '\\\\?\\hid#vid_25a7&pid_fa7e&mi_01&col07#{4d1e55b2-f16f-11cf-88cb-001111000030}';

    const info: DeviceInfo = {
      id: REDRAGON_DEVICE_ID,
      name: 'Mouse Gamer Redragon Invader M719RGB-PRO',
      manufacturer: 'Redragon (Compx / Eastern Times Tech OEM)',
      model: 'M719RGB-PRO (Sensor PixArt PMW3325)',
      category: 'mouse',
      protocol: 'USB HID Feature Report (UP: 0xFF02, Usage: 0x0002, ReportID: 0x08, 17B)',
      providerId: this.providerId,
      vendorId: '0x25A7',
      productId: '0xFA7E',
      interfacePath,
      firmwareOrBios: 'PMW3325 / OemDrv v1.0',
      connected: isConnected,
      compatibility: conflictProc
        ? 'conflict_detected'
        : isConnected
        ? 'compatible'
        : 'unsupported',
      compatibilityMessage: conflictProc
        ? `Conflito detectado com ${conflictProc}. Encerre o OemDrv.exe para liberar escrita na EEPROM 0x00A0.`
        : isConnected
        ? 'Compatível via protocolo HID Feature Report de 17 bytes (0xFF02:0x0002, EEPROM MainRGB 0x00A0 + SendCMD 0x09).'
        : 'Dispositivo desconectado.',
      requiresAdmin: false,
      conflictingProcess: conflictProc,
    };

    const caps: DeviceCapabilities = {
      supportedEffects: [
        'static',
        'breathing',
        'color_cycle',
        'wave',
        'rainbow',
        'gradient',
        'custom',
        'strobing',
        'off',
      ],
      supportsBrightness: true,
      supportsSpeed: true,
      supportsDirection: false,
      supportsPerKeyOrZone: false,
      supportsHardwareProfileSave: true,
      maxZones: 2, // MainRGB (0x00A0) + DpiRGB (0x004C)
      brightnessRange: { min: 0, max: 100, step: 33 },
      speedRange: { min: 0, max: 100, step: 20 },
      notes:
        'Suporta modos nativos em hardware: Steady (0x02), Respiration (0x01), Neon/Color Cycle (0x00), Streaming/Wave (0x04) e Off na EEPROM 0x00A0 com checksum complemento 0x55.',
    };

    this.devices.set(REDRAGON_DEVICE_ID, info);
    this.capabilities.set(REDRAGON_DEVICE_ID, caps);

    if (!this.states.has(REDRAGON_DEVICE_ID)) {
      this.states.set(REDRAGON_DEVICE_ID, {
        enabled: true,
        effect: 'static',
        primaryColor: { r: 255, g: 0, b: 64 },
        secondaryColor: { r: 0, g: 240, b: 255 },
        brightness: 100,
        speed: 60,
        direction: 'right',
        updatedAt: new Date().toISOString(),
      });
    }

    return [info];
  }

  /**
   * Constrói os Feature Reports de 17 bytes extraídos de OemDrv.exe:
   * - 0x09fa0..0x0a015 & 0x0b150..0x0b3a0: WriteEEPROM(0x00A0, len=7) com layout exato [Mode, R, G, B, Speed, Brightness, Checksum]
   *   onde Mode: 0x02 = Steady (Static), 0x01 = Respiration (Breathing), 0x00 = Neon (Color Cycle/Wave/Rainbow), 0x04 = LED OFF
   * - 0x0b440..0x0b545: WriteEEPROM(0x004C, len=6 ou len=2) para DpiRGB (ShowDpiEffect=1 em Cfg.ini)
   * - 0x0b5dc: SendCMD(0x09, 0) para aplicar a nova configuração de LED imediatamente
   */
  public buildRedragonLightingReports(state: LightingState): Uint8Array[] {
    const color = sanitizeColor(state.primaryColor);
    const isOff = !state.enabled || state.effect === 'off' || state.brightness === 0;

    // Tabela de brilho em OemDrv.exe (0x5CE244, 10 níveis -> 0x19..0xFF) e DPI/Logo (0x5CD40C / 0x5CE220 -> 0x01..0xFF)
    const brightnessTable = [0x19, 0x32, 0x4b, 0x64, 0x7d, 0x96, 0xaf, 0xc8, 0xe1, 0xff];
    const dpiBrightnessTable = [0x01, 0x1e, 0x3c, 0x5a, 0x80, 0x96, 0xb4, 0xd2, 0xe6, 0xff];
    const brIndex = isOff ? 0 : Math.max(0, Math.min(9, Math.round((state.brightness / 100) * 9)));
    const hwBrightness = brightnessTable[brIndex];
    const hwDpiBrightness = dpiBrightnessTable[brIndex];

    // Tabelas de velocidade em OemDrv.exe (0x5CE238 para Steady/Respiration, 0x5CE22C para Neon)
    const speedTableMain = [0xff, 0xe6, 0xd2, 0xbe, 0xaa, 0x96, 0x82, 0x6e, 0x46, 0x28];
    const speedTableWave = [0x2d, 0x28, 0x23, 0x1e, 0x19, 0x13, 0x0f, 0x0a, 0x05, 0x03];
    const spdIndex = Math.max(0, Math.min(9, Math.round((state.speed / 100) * 9)));

    // Modo em MainRGB (byte 0 da struct de 7 bytes em 0x00A0 conforme 0x09fa0 e 0x0b15d..0x0b380):
    // Steady = 0x02, Respiration = 0x01, Neon/Streaming (Wave/Rainbow/ColorCycle) = 0x00, LED OFF = 0x04
    // Nota: gradient e custom usam Steady (0x02) para que o motor de software alterne entre Primária e Secundária.
    let hwMode = 0x02;
    let uiMode = 0x01; // 1 = Steady, 2 = Respiration, 3 = Neon/Streaming, 0 = Off
    if (isOff) {
      hwMode = 0x04;
      uiMode = 0x00;
    } else if (state.effect === 'static' || state.effect === 'gradient' || state.effect === 'custom') {
      hwMode = 0x02;
      uiMode = 0x01;
    } else if (state.effect === 'breathing' || state.effect === 'strobing') {
      hwMode = 0x01;
      uiMode = 0x02;
    } else if (
      state.effect === 'color_cycle' ||
      state.effect === 'wave' ||
      state.effect === 'rainbow'
    ) {
      hwMode = 0x00;
      uiMode = 0x03;
    }

    const hwSpeed = hwMode === 0x00 ? speedTableWave[spdIndex] : speedTableMain[spdIndex];

    // Report 0: TellDrvStatus(1) -> SendCMD(0x02, 0x01) (0x2dbae em OemDrv.exe)
    const drvOnReport = new Uint8Array(17);
    drvOnReport[0] = 0x08;
    drvOnReport[1] = 0x02; // Command 0x02 = TellDrvStatus
    drvOnReport[2] = 0x00;
    drvOnReport[3] = 0x00;
    drvOnReport[4] = 0x00;
    drvOnReport[5] = 0x01; // Length = 1
    drvOnReport[6] = 0x01; // bData = 1 (Driver Active)
    finalizeRedragonFeatureReport(drvOnReport);

    // Struct MainRGB em 0x00A0 (7 bytes): [Mode, R, G, B, Speed, Brightness, Checksum]
    const eepromData = [hwMode, color.r, color.g, color.b, hwSpeed, hwBrightness];
    const eepromChecksum = computeRedragonComplement55(eepromData);

    // Report 1: WriteEEPROM(addr = 0x00A0, len = 7) -> MainRGB (ShowMainEffect=1 em Cfg.ini)
    // Layout exato de OemDrv.exe (WriteEEPROM 0x429d0 + SendReport 0x432a0):
    // [0]=0x08 (ReportID), [1]=0x07 (Cmd), [2]=0x00 (Reserved), [3]=AddrMSB, [4]=AddrLSB, [5]=Len, [6..12]=Payload(7B), [16]=CRC
    const writeReport = new Uint8Array(17);
    writeReport[0] = 0x08; // Report ID
    writeReport[1] = 0x07; // Command 0x07 = WriteEEPROM
    writeReport[2] = 0x00; // Reserved (pkt[1] = 0x00 em 0x42aa6)
    writeReport[3] = 0x00; // Addr MSB
    writeReport[4] = 0xa0; // Addr LSB (0x00A0 = MainRGB)
    writeReport[5] = 0x07; // Length = 7 bytes
    writeReport[6] = hwMode;
    writeReport[7] = color.r;
    writeReport[8] = color.g;
    writeReport[9] = color.b;
    writeReport[10] = hwSpeed;
    writeReport[11] = hwBrightness;
    writeReport[12] = eepromChecksum;
    finalizeRedragonFeatureReport(writeReport);

    // Report 2: WriteEEPROM(addr = 0x004C) -> DpiRGB (ShowDpiEffect=1 em Cfg.ini; ShowLogoEffect=0 portanto não escrevemos em 0x0054)
    const dpiReport = new Uint8Array(17);
    dpiReport[0] = 0x08; // Report ID
    dpiReport[1] = 0x07; // Command 0x07 = WriteEEPROM
    dpiReport[2] = 0x00; // Reserved (pkt[1] = 0x00 em 0x42aa6)
    dpiReport[3] = 0x00; // Addr MSB
    dpiReport[4] = 0x4c; // Addr LSB (0x004C = DpiRGB)
    if (isOff) {
      dpiReport[5] = 0x02;
      dpiReport[6] = 0x00;
      dpiReport[7] = 0x55;
    } else {
      const dpiMode = uiMode === 0x02 ? 0x02 : 0x01; // 1=Steady, 2=Respiration
      const dpiSpd = Math.max(1, Math.min(3, Math.ceil((state.speed / 100) * 3)));
      dpiReport[5] = 0x06;
      dpiReport[6] = dpiMode;
      dpiReport[7] = (0x55 - dpiMode) & 0xff;
      dpiReport[8] = hwDpiBrightness;
      dpiReport[9] = (0x55 - hwDpiBrightness) & 0xff;
      dpiReport[10] = dpiSpd;
      dpiReport[11] = (0x55 - dpiSpd) & 0xff;
    }
    finalizeRedragonFeatureReport(dpiReport);

    // Report 3: SendCMD(0x09, 0) para aplicar a nova configuração de LED imediatamente
    const applyReport = new Uint8Array(17);
    applyReport[0] = 0x08;
    applyReport[1] = 0x09; // Command 0x09 = Apply EEPROM settings
    finalizeRedragonFeatureReport(applyReport);

    // Report 4: TellDrvStatus(0) -> SendCMD(0x02, 0x00) (0x2dc42 em OemDrv.exe)
    const drvOffReport = new Uint8Array(17);
    drvOffReport[0] = 0x08;
    drvOffReport[1] = 0x02;
    drvOffReport[2] = 0x00;
    drvOffReport[3] = 0x00;
    drvOffReport[4] = 0x00;
    drvOffReport[5] = 0x01;
    drvOffReport[6] = 0x00;
    finalizeRedragonFeatureReport(drvOffReport);

    return [
      writeReport,
      dpiReport,
      applyReport,
      drvOnReport,
      drvOffReport,
    ];
  }

  private async transmitState(state: LightingState): Promise<boolean> {
    return this.validator.withDeviceLock(REDRAGON_DEVICE_ID, async () => {
      const conflict = await this.conflictDetector.hasVendorConflict('Redragon');
      if (conflict) {
        this.logger.security(
          this.providerId,
          'transmitState',
          `Escrita bloqueada por segurança: ${conflict} está em execução simultânea.`,
          REDRAGON_DEVICE_ID
        );
        return false;
      }

      const reports = this.buildRedragonLightingReports(state);
      for (const rep of reports) {
        const validation = this.validator.validateRedragonPacket(rep);
        if (!validation.valid) {
          this.logger.error(
            this.providerId,
            'validateRedragonPacket',
            `Feature Report rejeitado pelo validador de segurança: ${validation.reason}`,
            REDRAGON_DEVICE_ID
          );
          return false;
        }
      }

      // Ordem de transmissão para o hardware: TellDrvStatus(1) -> MainRGB(0x00A0) -> TellDrvStatus(0)
      // Nota: Não enviamos SendCMD(0x09) nem escrevemos em 0x004C/0x0060 para não recarregar/alterar o nível de DPI do mouse.
      const [writeReport, _dpiReport, _applyReport, drvOnReport, drvOffReport] = reports;
      const orderedReports = [drvOnReport, writeReport, drvOffReport];

      const res = await this.bridge.sendRedragonFeatureReports(orderedReports);
      const hexPreview = Buffer.from(reports[0]).toString('hex');
      if (res.success) {
        this.states.set(REDRAGON_DEVICE_ID, state);
        this.logger.info(
          this.providerId,
          'sendRedragonFeatureReports',
          `Feature Report 0x08 aplicado no Redragon M719RGB-PRO (${state.effect}, RGB ${state.primaryColor.r},${state.primaryColor.g},${state.primaryColor.b}).`,
          REDRAGON_DEVICE_ID,
          `Método: ${res.method} | Report[0..16]: ${hexPreview}`
        );
        return true;
      } else {
        this.states.set(REDRAGON_DEVICE_ID, state);
        this.logger.warn(
          this.providerId,
          'sendRedragonFeatureReports',
          `Feature Report construído e validado (CRC 0x55 OK), porém o handle Win32 retornou restrição (${res.error}).`,
          REDRAGON_DEVICE_ID,
          `Report[0..16]: ${hexPreview}`
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
    if (deviceId !== REDRAGON_DEVICE_ID) return false;
    const current = (await this.getLightingState(deviceId))!;
    const effectiveMode: LightingEffectType =
      current.effect === 'off' ||
      current.effect === 'rainbow' ||
      current.effect === 'color_cycle' ||
      current.effect === 'wave'
        ? 'static'
        : current.effect;
    const nextState: LightingState = {
      ...current,
      enabled: true,
      effect: effectiveMode,
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
    if (deviceId !== REDRAGON_DEVICE_ID) return false;
    const current = (await this.getLightingState(deviceId))!;
    const nextState: LightingState = {
      ...current,
      enabled: effect !== 'off',
      effect,
      primaryColor: options?.primaryColor ? sanitizeColor(options.primaryColor) : current.primaryColor,
      secondaryColor: options?.secondaryColor
        ? sanitizeColor(options.secondaryColor)
        : current.secondaryColor,
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
    if (deviceId !== REDRAGON_DEVICE_ID) return false;
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
    if (deviceId !== REDRAGON_DEVICE_ID) return false;
    const current = (await this.getLightingState(deviceId))!;
    const nextState: LightingState = {
      ...current,
      speed: clampPercent(speed),
      updatedAt: new Date().toISOString(),
    };
    return this.transmitState(nextState);
  }

  public async saveProfile(deviceId: string): Promise<boolean> {
    if (deviceId !== REDRAGON_DEVICE_ID) return false;
    const current = await this.getLightingState(deviceId);
    if (!current) return false;
    return this.transmitState(current);
  }
}
