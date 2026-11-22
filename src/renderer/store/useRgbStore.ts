import { create } from 'zustand';
import {
  AppSettings,
  CompatibilityMatrixItem,
  ConflictReport,
  EffectDirection,
  HardwareLogEntry,
  LightingEffectType,
  LightingProfile,
  RGBColor,
  RGBDevice,
  SyncConfig,
} from '../../shared/types';
import { clampPercent, sanitizeColor } from '../../utils/color';

export type NavigationTab =
  | 'dashboard'
  | 'devices'
  | 'editor'
  | 'sync'
  | 'profiles'
  | 'compatibility'
  | 'settings';

declare global {
  interface Window {
    rgbApi?: {
      discoverDevices: () => Promise<RGBDevice[]>;
      getAllDevices: () => Promise<RGBDevice[]>;
      setDeviceColor: (
        deviceId: string,
        color: RGBColor,
        secondaryColor?: RGBColor
      ) => Promise<{ success: boolean; devices: RGBDevice[] }>;
      setDeviceEffect: (
        deviceId: string,
        effect: LightingEffectType,
        options?: any
      ) => Promise<{ success: boolean; devices: RGBDevice[] }>;
      setDeviceBrightness: (
        deviceId: string,
        brightness: number
      ) => Promise<{ success: boolean; devices: RGBDevice[] }>;
      setDeviceSpeed: (
        deviceId: string,
        speed: number
      ) => Promise<{ success: boolean; devices: RGBDevice[] }>;
      toggleDevicePower: (
        deviceId: string,
        enabled: boolean
      ) => Promise<{ success: boolean; devices: RGBDevice[] }>;
      saveDeviceHardware: (deviceId: string) => Promise<{ success: boolean }>;
      restorePreviousState: (
        deviceId: string
      ) => Promise<{ success: boolean; devices: RGBDevice[] }>;
      getSyncConfig: () => Promise<SyncConfig>;
      applySyncConfig: (
        config: SyncConfig
      ) => Promise<{ result: any; devices: RGBDevice[]; syncConfig: SyncConfig }>;
      updateSyncExceptions: (
        excludedDeviceIds: string[],
        includedDeviceIds: string[]
      ) => Promise<SyncConfig>;
      listProfiles: () => Promise<LightingProfile[]>;
      applyProfile: (profileId: string) => Promise<{
        success: boolean;
        devices: RGBDevice[];
        profiles: LightingProfile[];
        settings: AppSettings;
      }>;
      createProfile: (
        name: string,
        description: string
      ) => Promise<{ created: LightingProfile; profiles: LightingProfile[] }>;
      updateProfile: (
        id: string,
        name?: string,
        description?: string
      ) => Promise<{ updated: LightingProfile; profiles: LightingProfile[] }>;
      duplicateProfile: (
        profileId: string
      ) => Promise<{ duplicated: LightingProfile; profiles: LightingProfile[] }>;
      deleteProfile: (
        profileId: string
      ) => Promise<{ success: boolean; profiles: LightingProfile[] }>;
      cycleProfile: () => Promise<{
        switchedTo: LightingProfile | null;
        devices: RGBDevice[];
        profiles: LightingProfile[];
        settings: AppSettings;
      }>;
      onProfileSwitched: (
        cb: (payload: {
          devices: RGBDevice[];
          profiles: LightingProfile[];
          settings: AppSettings;
        }) => void
      ) => () => void;
      getSettings: () => Promise<AppSettings>;
      updateSettings: (partial: Partial<AppSettings>) => Promise<AppSettings>;
      getCompatibilityMatrix: () => Promise<CompatibilityMatrixItem[]>;
      getConflicts: () => Promise<ConflictReport>;
      getLogs: () => Promise<HardwareLogEntry[]>;
      clearLogs: () => Promise<HardwareLogEntry[]>;
      isAdmin: () => Promise<boolean>;
      requestAdmin: () => Promise<{ launched: boolean; error?: string }>;
    };
  }
}

const INITIAL_DEVICES: RGBDevice[] = [
  {
    info: {
      id: 'gigabyte-b450m-gaming',
      name: 'Placa-Mãe Gigabyte B450M GAMING',
      manufacturer: 'Gigabyte Technology Co., Ltd.',
      model: 'B450M GAMING',
      category: 'motherboard',
      protocol: 'SMBus Onboard MCU (ITE LED_V4 0x08210001 via SMBCtrl.dll / GVCIDrv64.sys)',
      providerId: 'gigabyte-smbus-bridge',
      vendorId: '0x048D',
      productId: '0x8297',
      firmwareOrBios: 'BIOS F62 | LED_ID 0x8210001',
      connected: true,
      compatibility: 'admin_required',
      compatibilityMessage:
        'Requer privilégios de Administrador para escrita SMBus (driver kernel GVCIDrv64.sys).',
      requiresAdmin: true,
    },
    capabilities: {
      supportedEffects: ['static', 'breathing', 'color_cycle', 'strobing', 'off'],
      supportsBrightness: true,
      supportsSpeed: true,
      supportsDirection: false,
      supportsPerKeyOrZone: false,
      supportsHardwareProfileSave: true,
      maxZones: 1,
      brightnessRange: { min: 0, max: 100, step: 10 },
      speedRange: { min: 0, max: 100, step: 20 },
      notes: 'Header 12V GRB analógico controlado por MCU SMBus LED_V4.',
    },
    state: {
      enabled: true,
      effect: 'static',
      primaryColor: { r: 0, g: 240, b: 255 },
      secondaryColor: { r: 124, g: 58, b: 237 },
      brightness: 100,
      speed: 60,
      direction: 'right',
      updatedAt: new Date().toISOString(),
    },
  },
  {
    info: {
      id: 'husky-tg200-320f-5016',
      name: 'Teclado Mecânico Husky Hailstorm 65% (TG200)',
      manufacturer: 'Husky Gaming (EVision/Sonix OEM)',
      model: 'TG200 (TK50S / WsKeyboardV102)',
      category: 'keyboard',
      protocol: 'USB HID Custom Report (UP: 0xFF1C, Usage: 0x0092, ReportID: 0x04, 64B)',
      providerId: 'husky-native-hid',
      vendorId: '0x320F',
      productId: '0x5016',
      firmwareOrBios: 'EVision V102 (TK50S)',
      connected: true,
      compatibility: 'compatible',
      compatibilityMessage:
        'Compatível via driver nativo HID 64-byte (EVision/Sonix 0xFF1C:0x0092).',
      requiresAdmin: false,
    },
    capabilities: {
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
      notes: 'Controlador EVision/Sonix 0x320F:0x5016 (cmd 0x1C len 0x38 @ 0x0355 + commit 0x06).',
    },
    state: {
      enabled: true,
      effect: 'wave',
      primaryColor: { r: 0, g: 240, b: 255 },
      secondaryColor: { r: 124, g: 58, b: 237 },
      brightness: 100,
      speed: 75,
      direction: 'right',
      updatedAt: new Date().toISOString(),
    },
  },
  {
    info: {
      id: 'redragon-m719rgb-25a7-fa7e',
      name: 'Mouse Gamer Redragon Invader M719RGB-PRO',
      manufacturer: 'Redragon (Compx / Eastern Times Tech OEM)',
      model: 'M719RGB-PRO (Sensor PixArt PMW3325)',
      category: 'mouse',
      protocol: 'USB HID Feature Report (UP: 0xFF02, Usage: 0x0002, ReportID: 0x08, 17B)',
      providerId: 'redragon-native-hid',
      vendorId: '0x25A7',
      productId: '0xFA7E',
      firmwareOrBios: 'PMW3325 / OemDrv v1.0',
      connected: true,
      compatibility: 'compatible',
      compatibilityMessage:
        'Compatível via protocolo HID Feature Report de 17 bytes (0xFF02:0x0002, EEPROM MainRGB 0x00A0).',
      requiresAdmin: false,
    },
    capabilities: {
      supportedEffects: ['static', 'breathing', 'color_cycle', 'wave', 'rainbow', 'off'],
      supportsBrightness: true,
      supportsSpeed: true,
      supportsDirection: false,
      supportsPerKeyOrZone: false,
      supportsHardwareProfileSave: true,
      maxZones: 2,
      brightnessRange: { min: 0, max: 100, step: 33 },
      speedRange: { min: 0, max: 100, step: 20 },
      notes: 'Suporta modos nativos em hardware na EEPROM 0x00A0 com checksum complemento 0x55.',
    },
    state: {
      enabled: true,
      effect: 'static',
      primaryColor: { r: 255, g: 0, b: 64 },
      secondaryColor: { r: 0, g: 240, b: 255 },
      brightness: 100,
      speed: 60,
      direction: 'right',
      updatedAt: new Date().toISOString(),
    },
  },
];

// Timers de debounce por dispositivo para evitar fila excessiva de processos ao arrastar sliders/seletor de cor
const colorDebounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};
const effectDebounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};

interface RgbStoreState {
  activeTab: NavigationTab;
  selectedDeviceId: string;
  devices: RGBDevice[];
  profiles: LightingProfile[];
  syncConfig: SyncConfig;
  settings: AppSettings;
  compatibilityMatrix: CompatibilityMatrixItem[];
  conflicts: ConflictReport;
  logs: HardwareLogEntry[];
  isAdmin: boolean;
  isLoading: boolean;
  statusBanner: { type: 'info' | 'success' | 'warn'; text: string } | null;

  setActiveTab: (tab: NavigationTab) => void;
  selectDeviceForEditor: (deviceId: string, switchTab?: boolean) => void;
  clearBanner: () => void;

  initializeApp: () => Promise<void>;
  refreshDiscovery: () => Promise<void>;

  updateDeviceEffect: (
    deviceId: string,
    effect: LightingEffectType,
    options?: {
      primaryColor?: RGBColor;
      secondaryColor?: RGBColor;
      brightness?: number;
      speed?: number;
      direction?: EffectDirection;
    }
  ) => Promise<void>;
  updateDeviceColor: (deviceId: string, color: RGBColor, secondaryColor?: RGBColor) => Promise<void>;
  updateDeviceBrightness: (deviceId: string, brightness: number) => Promise<void>;
  updateDeviceSpeed: (deviceId: string, speed: number) => Promise<void>;
  toggleDevicePower: (deviceId: string, enabled: boolean) => Promise<void>;
  saveToDeviceMemory: (deviceId: string) => Promise<void>;
  restorePreviousDevice: (deviceId: string) => Promise<void>;

  updateSyncDraft: (partial: Partial<SyncConfig>) => void;
  toggleSyncDeviceInclusion: (deviceId: string) => void;
  toggleSyncDeviceException: (deviceId: string) => void;
  applyGlobalSync: () => Promise<void>;

  applyProfile: (profileId: string) => Promise<void>;
  createNewProfile: (name: string, description: string) => Promise<void>;
  saveCurrentToProfile: (profileId: string, name?: string, description?: string) => Promise<void>;
  duplicateProfile: (profileId: string) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;

  updateAppSettings: (partial: Partial<AppSettings>) => Promise<void>;
  refreshDiagnostics: () => Promise<void>;
  clearHardwareLogs: () => Promise<void>;
  requestAdminElevation: () => Promise<void>;
}

export const useRgbStore = create<RgbStoreState>((set, get) => ({
  activeTab: 'dashboard',
  selectedDeviceId: 'husky-tg200-320f-5016',
  devices: INITIAL_DEVICES,
  profiles: [],
  syncConfig: {
    enabled: true,
    effect: 'wave',
    primaryColor: { r: 0, g: 240, b: 255 },
    secondaryColor: { r: 124, g: 58, b: 237 },
    brightness: 100,
    speed: 75,
    direction: 'right',
    includedDeviceIds: [
      'husky-tg200-320f-5016',
      'redragon-m719rgb-25a7-fa7e',
      'gigabyte-b450m-gaming',
    ],
    excludedDeviceIds: [],
  },
  settings: {
    startWithWindows: false,
    applyLastProfileOnStartup: true,
    runInBackground: true,
    minimizeToTray: true,
    restoreAfterReboot: true,
    lastActiveProfileId: 'profile-gaming',
    openRgbHost: '127.0.0.1',
    openRgbPort: 6742,
    conflictProtectionEnabled: true,
  },
  compatibilityMatrix: [],
  conflicts: { hasConflicts: false, processes: [] },
  logs: [],
  isAdmin: false,
  isLoading: true,
  statusBanner: null,

  setActiveTab: (tab) => set({ activeTab: tab }),

  selectDeviceForEditor: (deviceId, switchTab = true) =>
    set((state) => ({
      selectedDeviceId: deviceId,
      activeTab: switchTab ? 'editor' : state.activeTab,
    })),

  clearBanner: () => set({ statusBanner: null }),

  initializeApp: async () => {
    set({ isLoading: true });
    try {
      if (window.rgbApi) {
        const [devices, profiles, syncConfig, settings, matrix, conflicts, logs, isAdmin] =
          await Promise.all([
            window.rgbApi.getAllDevices(),
            window.rgbApi.listProfiles(),
            window.rgbApi.getSyncConfig(),
            window.rgbApi.getSettings(),
            window.rgbApi.getCompatibilityMatrix(),
            window.rgbApi.getConflicts(),
            window.rgbApi.getLogs(),
            window.rgbApi.isAdmin(),
          ]);

        set({
          devices: devices && devices.length > 0 ? devices : INITIAL_DEVICES,
          profiles,
          syncConfig,
          settings,
          compatibilityMatrix: matrix,
          conflicts,
          logs,
          isAdmin,
          isLoading: false,
        });

        window.rgbApi.onProfileSwitched?.((payload) => {
          const active = payload.profiles.find(
            (p) => p.id === payload.settings.lastActiveProfileId
          );
          set({
            devices: payload.devices && payload.devices.length > 0 ? payload.devices : get().devices,
            profiles: payload.profiles,
            settings: payload.settings,
            statusBanner: active
              ? {
                  type: 'info',
                  text: `Perfil alternado via atalho/bandeja: ${active.name}`,
                }
              : get().statusBanner,
          });
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  refreshDiscovery: async () => {
    if (!window.rgbApi) return;
    set({ isLoading: true });
    const [devices, conflicts, logs, isAdmin] = await Promise.all([
      window.rgbApi.discoverDevices(),
      window.rgbApi.getConflicts(),
      window.rgbApi.getLogs(),
      window.rgbApi.isAdmin(),
    ]);
    set({
      devices: devices && devices.length > 0 ? devices : get().devices,
      conflicts,
      logs,
      isAdmin,
      isLoading: false,
      statusBanner: {
        type: 'info',
        text: `Barramento USB/HID e SMBus escaneado: ${devices.length} componentes mapeados.`,
      },
    });
  },

  updateDeviceEffect: async (deviceId, effect, options) => {
    // 1. Atualização otimista imediata na UI
    set((state) => ({
      devices: state.devices.map((d) => {
        if (d.info.id !== deviceId) return d;
        return {
          ...d,
          state: {
            ...d.state,
            enabled: effect !== 'off',
            effect,
            primaryColor: options?.primaryColor
              ? sanitizeColor(options.primaryColor)
              : d.state.primaryColor,
            secondaryColor: options?.secondaryColor
              ? sanitizeColor(options.secondaryColor)
              : d.state.secondaryColor,
            brightness:
              options?.brightness !== undefined
                ? clampPercent(options.brightness)
                : effect === 'off'
                ? 0
                : d.state.brightness || 100,
            speed: options?.speed !== undefined ? clampPercent(options.speed) : d.state.speed,
            direction: options?.direction ?? d.state.direction,
            updatedAt: new Date().toISOString(),
          },
        };
      }),
    }));

    if (!window.rgbApi) return;
    if (effectDebounceTimers[deviceId]) {
      clearTimeout(effectDebounceTimers[deviceId]);
    }
    effectDebounceTimers[deviceId] = setTimeout(async () => {
      if (!window.rgbApi) return;
      const res = await window.rgbApi.setDeviceEffect(deviceId, effect, options);
      const logs = await window.rgbApi.getLogs();
      set({
        devices: res.devices,
        logs,
        statusBanner: {
          type: res.success ? 'success' : 'info',
          text: res.success
            ? `Efeito '${effect}' aplicado no hardware com sucesso.`
            : `Efeito '${effect}' atualizado e salvo no perfil do dispositivo.`,
        },
      });
    }, 100);
  },

  updateDeviceColor: async (deviceId, color, secondaryColor) => {
    const cleanPrimary = sanitizeColor(color);
    const cleanSecondary = secondaryColor ? sanitizeColor(secondaryColor) : undefined;

    // 1. Atualização otimista instantânea na UI (0ms lag no color picker e sliders)
    set((state) => ({
      devices: state.devices.map((d) => {
        if (d.info.id !== deviceId) return d;
        return {
          ...d,
          state: {
            ...d.state,
            enabled: true,
            effect: d.state.effect === 'off' ? 'static' : d.state.effect,
            brightness: d.state.brightness === 0 ? 100 : d.state.brightness,
            primaryColor: cleanPrimary,
            secondaryColor: cleanSecondary ?? d.state.secondaryColor,
            updatedAt: new Date().toISOString(),
          },
        };
      }),
    }));

    if (!window.rgbApi) return;
    if (colorDebounceTimers[deviceId]) {
      clearTimeout(colorDebounceTimers[deviceId]);
    }
    colorDebounceTimers[deviceId] = setTimeout(async () => {
      if (!window.rgbApi) return;
      const res = await window.rgbApi.setDeviceColor(deviceId, cleanPrimary, cleanSecondary);
      const logs = await window.rgbApi.getLogs();
      set({
        devices: res.devices,
        logs,
        statusBanner: {
          type: res.success ? 'success' : 'info',
          text: res.success
            ? `Cor RGB (${cleanPrimary.r}, ${cleanPrimary.g}, ${cleanPrimary.b}) enviada ao hardware.`
            : `Cor RGB (${cleanPrimary.r}, ${cleanPrimary.g}, ${cleanPrimary.b}) aplicada e persistida.`,
        },
      });
    }, 120);
  },

  updateDeviceBrightness: async (deviceId, brightness) => {
    const cleanBr = clampPercent(brightness);
    set((state) => ({
      devices: state.devices.map((d) =>
        d.info.id === deviceId
          ? {
              ...d,
              state: {
                ...d.state,
                enabled: cleanBr > 0,
                brightness: cleanBr,
                updatedAt: new Date().toISOString(),
              },
            }
          : d
      ),
    }));

    if (!window.rgbApi) return;
    if (effectDebounceTimers[deviceId]) clearTimeout(effectDebounceTimers[deviceId]);
    effectDebounceTimers[deviceId] = setTimeout(async () => {
      if (!window.rgbApi) return;
      const res = await window.rgbApi.setDeviceBrightness(deviceId, cleanBr);
      const logs = await window.rgbApi.getLogs();
      set({ devices: res.devices, logs });
    }, 120);
  },

  updateDeviceSpeed: async (deviceId, speed) => {
    const cleanSpd = clampPercent(speed);
    set((state) => ({
      devices: state.devices.map((d) =>
        d.info.id === deviceId
          ? {
              ...d,
              state: { ...d.state, speed: cleanSpd, updatedAt: new Date().toISOString() },
            }
          : d
      ),
    }));

    if (!window.rgbApi) return;
    if (effectDebounceTimers[deviceId]) clearTimeout(effectDebounceTimers[deviceId]);
    effectDebounceTimers[deviceId] = setTimeout(async () => {
      if (!window.rgbApi) return;
      const res = await window.rgbApi.setDeviceSpeed(deviceId, cleanSpd);
      const logs = await window.rgbApi.getLogs();
      set({ devices: res.devices, logs });
    }, 120);
  },

  toggleDevicePower: async (deviceId, enabled) => {
    set((state) => ({
      devices: state.devices.map((d) =>
        d.info.id === deviceId
          ? {
              ...d,
              state: {
                ...d.state,
                enabled,
                effect: enabled ? (d.state.effect === 'off' ? 'static' : d.state.effect) : 'off',
                brightness: enabled ? (d.state.brightness === 0 ? 100 : d.state.brightness) : 0,
              },
            }
          : d
      ),
    }));

    if (!window.rgbApi) return;
    const res = await window.rgbApi.toggleDevicePower(deviceId, enabled);
    const logs = await window.rgbApi.getLogs();
    set({
      devices: res.devices,
      logs,
      statusBanner: {
        type: 'info',
        text: `Iluminação do dispositivo ${enabled ? 'ativada' : 'desativada'}.`,
      },
    });
  },

  saveToDeviceMemory: async (deviceId) => {
    if (!window.rgbApi) return;
    const res = await window.rgbApi.saveDeviceHardware(deviceId);
    const logs = await window.rgbApi.getLogs();
    set({
      logs,
      statusBanner: {
        type: res.success ? 'success' : 'info',
        text: res.success
          ? 'Configuração gravada na memória EEPROM/Flash onboard do dispositivo.'
          : 'Estado salvo no banco SQLite local.',
      },
    });
  },

  restorePreviousDevice: async (deviceId) => {
    if (!window.rgbApi) return;
    const res = await window.rgbApi.restorePreviousState(deviceId);
    const logs = await window.rgbApi.getLogs();
    set({
      devices: res.devices,
      logs,
      statusBanner: {
        type: 'info',
        text: 'Configuração anterior do dispositivo restaurada.',
      },
    });
  },

  updateSyncDraft: (partial) =>
    set((state) => ({
      syncConfig: { ...state.syncConfig, ...partial },
    })),

  toggleSyncDeviceInclusion: (deviceId) =>
    set((state) => {
      const current = state.syncConfig.includedDeviceIds;
      const next = current.includes(deviceId)
        ? current.filter((id) => id !== deviceId)
        : [...current, deviceId];
      return {
        syncConfig: {
          ...state.syncConfig,
          includedDeviceIds: next,
        },
      };
    }),

  toggleSyncDeviceException: (deviceId) =>
    set((state) => {
      const current = state.syncConfig.excludedDeviceIds;
      const next = current.includes(deviceId)
        ? current.filter((id) => id !== deviceId)
        : [...current, deviceId];
      return {
        syncConfig: {
          ...state.syncConfig,
          excludedDeviceIds: next,
        },
      };
    }),

  applyGlobalSync: async () => {
    const cfg = get().syncConfig;
    // Atualização otimista imediata em todos os dispositivos incluídos (e não excluídos)
    set((state) => ({
      devices: state.devices.map((d) => {
        if (
          cfg.excludedDeviceIds.includes(d.info.id) ||
          !cfg.includedDeviceIds.includes(d.info.id) ||
          d.capabilities.maxZones === 0
        ) {
          return d;
        }
        return {
          ...d,
          state: {
            ...d.state,
            enabled: cfg.effect !== 'off',
            effect: cfg.effect,
            primaryColor: cfg.primaryColor,
            secondaryColor: cfg.secondaryColor,
            brightness: cfg.brightness,
            speed: cfg.speed,
            direction: cfg.direction,
            updatedAt: new Date().toISOString(),
          },
        };
      }),
    }));

    if (!window.rgbApi) return;
    const res = await window.rgbApi.applySyncConfig({ ...cfg, enabled: true });
    const logs = await window.rgbApi.getLogs();
    set({
      devices: res.devices,
      syncConfig: res.syncConfig,
      logs,
      statusBanner: {
        type: 'success',
        text: `Sync RGB global aplicado! (${res.result.appliedDevices.length} sincronizados, ${res.result.skippedExceptions.length} exceções preservadas).`,
      },
    });
  },

  applyProfile: async (profileId) => {
    if (!window.rgbApi) return;
    const res = await window.rgbApi.applyProfile(profileId);
    const logs = await window.rgbApi.getLogs();
    set({
      devices: res.devices,
      profiles: res.profiles,
      settings: res.settings,
      logs,
      statusBanner: {
        type: 'success',
        text: `Perfil aplicado em todos os dispositivos compatíveis.`,
      },
    });
  },

  createNewProfile: async (name, description) => {
    if (!window.rgbApi) return;
    const res = await window.rgbApi.createProfile(name, description);
    set({
      profiles: res.profiles,
      statusBanner: {
        type: 'success',
        text: `Perfil '${res.created.name}' criado com o estado atual dos periféricos.`,
      },
    });
  },

  saveCurrentToProfile: async (profileId, name, description) => {
    if (!window.rgbApi) return;
    const res = await window.rgbApi.updateProfile(profileId, name, description);
    set({
      profiles: res.profiles,
      statusBanner: {
        type: 'success',
        text: `Perfil '${res.updated?.name || ''}' atualizado.`,
      },
    });
  },

  duplicateProfile: async (profileId) => {
    if (!window.rgbApi) return;
    const res = await window.rgbApi.duplicateProfile(profileId);
    set({
      profiles: res.profiles,
      statusBanner: {
        type: 'info',
        text: `Perfil duplicado como '${res.duplicated?.name || ''}'.`,
      },
    });
  },

  deleteProfile: async (profileId) => {
    if (!window.rgbApi) return;
    const res = await window.rgbApi.deleteProfile(profileId);
    set({
      profiles: res.profiles,
      statusBanner: {
        type: 'info',
        text: 'Perfil personalizado removido.',
      },
    });
  },

  updateAppSettings: async (partial) => {
    if (!window.rgbApi) return;
    const updated = await window.rgbApi.updateSettings(partial);
    set({
      settings: updated,
      statusBanner: {
        type: 'success',
        text: 'Preferências do aplicativo salvas no banco SQLite.',
      },
    });
  },

  refreshDiagnostics: async () => {
    if (!window.rgbApi) return;
    const [matrix, conflicts, logs, isAdmin] = await Promise.all([
      window.rgbApi.getCompatibilityMatrix(),
      window.rgbApi.getConflicts(),
      window.rgbApi.getLogs(),
      window.rgbApi.isAdmin(),
    ]);
    set({ compatibilityMatrix: matrix, conflicts, logs, isAdmin });
  },

  clearHardwareLogs: async () => {
    if (!window.rgbApi) return;
    await window.rgbApi.clearLogs();
    set({ logs: [] });
  },

  requestAdminElevation: async () => {
    if (!window.rgbApi) return;
    await window.rgbApi.requestAdmin();
  },
}));
