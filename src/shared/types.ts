export type DeviceCategory =
  | 'motherboard'
  | 'keyboard'
  | 'mouse'
  | 'memory'
  | 'cooler'
  | 'case'
  | 'headset'
  | 'receiver'
  | 'other';

export type CompatibilityStatus =
  | 'compatible'           // Controle direto total confirmado e ativo
  | 'admin_required'       // Compatível, mas exige execução como Administrador (ex: driver kernel SMBus GVCIDrv64.sys)
  | 'conflict_detected'    // Compatível, mas bloqueado preventivamente por software oficial aberto simultaneamente
  | 'sdk_offline'          // Suportado via OpenRGB SDK, porém servidor TCP (porta 6742) está offline
  | 'unsupported';         // Dispositivo sem suporte a controle RGB programático ou protocolo proprietário fechado

export type LightingEffectType =
  | 'static'
  | 'gradient'
  | 'rainbow'
  | 'breathing'
  | 'wave'
  | 'color_cycle'
  | 'reactive'
  | 'strobing'
  | 'custom'
  | 'off';

export type EffectDirection = 'left' | 'right' | 'up' | 'down' | 'inward' | 'outward';

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface LightingZone {
  id: string;
  name: string;
  ledCount: number;
  color: RGBColor;
}

export interface DeviceCapabilities {
  supportedEffects: LightingEffectType[];
  supportsBrightness: boolean;
  supportsSpeed: boolean;
  supportsDirection: boolean;
  supportsPerKeyOrZone: boolean;
  supportsHardwareProfileSave: boolean;
  maxZones: number;
  brightnessRange: { min: number; max: number; step: number };
  speedRange: { min: number; max: number; step: number };
  notes?: string;
}

export interface LightingState {
  enabled: boolean;
  effect: LightingEffectType;
  primaryColor: RGBColor;
  secondaryColor?: RGBColor;
  gradientColors?: RGBColor[];
  brightness: number; // 0..100 normalizado na UI, convertido pelo provider para a escala do hardware
  speed: number;      // 0..100 normalizado na UI, convertido pelo provider para a escala do hardware
  direction: EffectDirection;
  zones?: LightingZone[];
  updatedAt: string;
}

export interface DeviceInfo {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  category: DeviceCategory;
  protocol: string;
  providerId: string;
  vendorId?: string;
  productId?: string;
  interfacePath?: string;
  firmwareOrBios?: string;
  connected: boolean;
  compatibility: CompatibilityStatus;
  compatibilityMessage: string;
  requiresAdmin: boolean;
  conflictingProcess?: string;
}

export interface RGBDevice {
  info: DeviceInfo;
  capabilities: DeviceCapabilities;
  state: LightingState;
}

export interface SyncConfig {
  enabled: boolean;
  effect: LightingEffectType;
  primaryColor: RGBColor;
  secondaryColor: RGBColor;
  brightness: number;
  speed: number;
  direction: EffectDirection;
  includedDeviceIds: string[];
  excludedDeviceIds: string[]; // Exceções definidas pelo usuário no Sync RGB
}

export interface LightingProfile {
  id: string;
  name: string;
  description: string;
  icon: string;
  isBuiltIn: boolean;
  globalSync?: SyncConfig;
  deviceStates: Record<string, LightingState>;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  startWithWindows: boolean;
  applyLastProfileOnStartup: boolean;
  runInBackground: boolean;
  minimizeToTray: boolean;
  restoreAfterReboot: boolean;
  lastActiveProfileId: string | null;
  openRgbHost: string;
  openRgbPort: number;
  conflictProtectionEnabled: boolean;
  profileSwitchShortcut?: string;
}

export interface HardwareLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'security';
  provider: string;
  deviceId?: string;
  operation: string;
  message: string;
  details?: string;
}

export interface ConflictReport {
  hasConflicts: boolean;
  processes: Array<{
    pid: number;
    name: string;
    affectedVendor: string;
    recommendation: string;
  }>;
}

export interface CompatibilityMatrixItem {
  component: string;
  manufacturer: string;
  model: string;
  vidPid: string;
  interfaceProtocol: string;
  openRgbSupport: string;
  officialSoftware: string;
  nativeProviderStatus: CompatibilityStatus;
  supportedEffectsList: string[];
  technicalNotes: string;
}

/**
 * Camada de abstração obrigatória para todos os fabricantes (Seção 5)
 */
export interface IDeviceProvider {
  readonly providerId: string;
  readonly providerName: string;

  discoverDevices(): Promise<DeviceInfo[]>;
  getDeviceInfo(deviceId: string): Promise<DeviceInfo | null>;
  getCapabilities(deviceId: string): Promise<DeviceCapabilities | null>;
  getLightingState(deviceId: string): Promise<LightingState | null>;
  setColor(deviceId: string, color: RGBColor, secondaryColor?: RGBColor): Promise<boolean>;
  setEffect(
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
  setBrightness(deviceId: string, brightness: number): Promise<boolean>;
  setSpeed(deviceId: string, speed: number): Promise<boolean>;
  saveProfile(deviceId: string): Promise<boolean>;
  disconnect(): Promise<void>;
}
