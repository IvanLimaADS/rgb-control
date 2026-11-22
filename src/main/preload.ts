const { contextBridge, ipcRenderer } = require('electron');

// Canais IPC inlineados diretamente no preload para evitar qualquer require() relativo
// que possa ser bloqueado pelo sandbox do renderer do Electron.
const CHANNELS = {
  DEVICES_DISCOVER: 'rgb:devices:discover',
  DEVICES_GET_ALL: 'rgb:devices:get-all',
  DEVICE_SET_COLOR: 'rgb:device:set-color',
  DEVICE_SET_EFFECT: 'rgb:device:set-effect',
  DEVICE_SET_BRIGHTNESS: 'rgb:device:set-brightness',
  DEVICE_SET_SPEED: 'rgb:device:set-speed',
  DEVICE_TOGGLE_POWER: 'rgb:device:toggle-power',
  DEVICE_SAVE_HARDWARE: 'rgb:device:save-hardware',
  DEVICE_RESTORE_PREVIOUS: 'rgb:device:restore-previous',

  SYNC_APPLY: 'rgb:sync:apply',
  SYNC_GET_CONFIG: 'rgb:sync:get-config',
  SYNC_UPDATE_EXCEPTIONS: 'rgb:sync:update-exceptions',

  PROFILES_LIST: 'rgb:profiles:list',
  PROFILES_APPLY: 'rgb:profiles:apply',
  PROFILES_CREATE: 'rgb:profiles:create',
  PROFILES_UPDATE: 'rgb:profiles:update',
  PROFILES_DUPLICATE: 'rgb:profiles:duplicate',
  PROFILES_DELETE: 'rgb:profiles:delete',
  PROFILES_CYCLE: 'rgb:profiles:cycle',
  PROFILES_SWITCHED_EVENT: 'rgb:profiles:switched',

  SETTINGS_GET: 'rgb:settings:get',
  SETTINGS_UPDATE: 'rgb:settings:update',

  DIAGNOSTICS_GET_MATRIX: 'rgb:diagnostics:get-matrix',
  DIAGNOSTICS_GET_CONFLICTS: 'rgb:diagnostics:get-conflicts',
  DIAGNOSTICS_GET_LOGS: 'rgb:diagnostics:get-logs',
  DIAGNOSTICS_CLEAR_LOGS: 'rgb:diagnostics:clear-logs',
  DIAGNOSTICS_IS_ADMIN: 'rgb:diagnostics:is-admin',
  DIAGNOSTICS_REQUEST_ADMIN: 'rgb:diagnostics:request-admin',
};

contextBridge.exposeInMainWorld('rgbApi', {
  discoverDevices: () => ipcRenderer.invoke(CHANNELS.DEVICES_DISCOVER),
  getAllDevices: () => ipcRenderer.invoke(CHANNELS.DEVICES_GET_ALL),
  setDeviceColor: (deviceId: string, color: any, secondaryColor?: any) =>
    ipcRenderer.invoke(CHANNELS.DEVICE_SET_COLOR, { deviceId, color, secondaryColor }),
  setDeviceEffect: (deviceId: string, effect: any, options?: any) =>
    ipcRenderer.invoke(CHANNELS.DEVICE_SET_EFFECT, { deviceId, effect, options }),
  setDeviceBrightness: (deviceId: string, brightness: number) =>
    ipcRenderer.invoke(CHANNELS.DEVICE_SET_BRIGHTNESS, { deviceId, brightness }),
  setDeviceSpeed: (deviceId: string, speed: number) =>
    ipcRenderer.invoke(CHANNELS.DEVICE_SET_SPEED, { deviceId, speed }),
  toggleDevicePower: (deviceId: string, enabled: boolean) =>
    ipcRenderer.invoke(CHANNELS.DEVICE_TOGGLE_POWER, { deviceId, enabled }),
  saveDeviceHardware: (deviceId: string) =>
    ipcRenderer.invoke(CHANNELS.DEVICE_SAVE_HARDWARE, { deviceId }),
  restorePreviousState: (deviceId: string) =>
    ipcRenderer.invoke(CHANNELS.DEVICE_RESTORE_PREVIOUS, { deviceId }),

  getSyncConfig: () => ipcRenderer.invoke(CHANNELS.SYNC_GET_CONFIG),
  applySyncConfig: (config: any) => ipcRenderer.invoke(CHANNELS.SYNC_APPLY, config),
  updateSyncExceptions: (excludedDeviceIds: string[], includedDeviceIds: string[]) =>
    ipcRenderer.invoke(CHANNELS.SYNC_UPDATE_EXCEPTIONS, {
      excludedDeviceIds,
      includedDeviceIds,
    }),

  listProfiles: () => ipcRenderer.invoke(CHANNELS.PROFILES_LIST),
  applyProfile: (profileId: string) => ipcRenderer.invoke(CHANNELS.PROFILES_APPLY, profileId),
  createProfile: (name: string, description: string) =>
    ipcRenderer.invoke(CHANNELS.PROFILES_CREATE, { name, description }),
  updateProfile: (id: string, name?: string, description?: string) =>
    ipcRenderer.invoke(CHANNELS.PROFILES_UPDATE, { id, name, description }),
  duplicateProfile: (profileId: string) =>
    ipcRenderer.invoke(CHANNELS.PROFILES_DUPLICATE, profileId),
  deleteProfile: (profileId: string) => ipcRenderer.invoke(CHANNELS.PROFILES_DELETE, profileId),
  cycleProfile: () => ipcRenderer.invoke(CHANNELS.PROFILES_CYCLE),
  onProfileSwitched: (callback: (payload: any) => void) => {
    const listener = (_event: any, payload: any) => callback(payload);
    ipcRenderer.on(CHANNELS.PROFILES_SWITCHED_EVENT, listener);
    return () => ipcRenderer.removeListener(CHANNELS.PROFILES_SWITCHED_EVENT, listener);
  },

  getSettings: () => ipcRenderer.invoke(CHANNELS.SETTINGS_GET),
  updateSettings: (partial: any) => ipcRenderer.invoke(CHANNELS.SETTINGS_UPDATE, partial),

  getCompatibilityMatrix: () => ipcRenderer.invoke(CHANNELS.DIAGNOSTICS_GET_MATRIX),
  getConflicts: () => ipcRenderer.invoke(CHANNELS.DIAGNOSTICS_GET_CONFLICTS),
  getLogs: () => ipcRenderer.invoke(CHANNELS.DIAGNOSTICS_GET_LOGS),
  clearLogs: () => ipcRenderer.invoke(CHANNELS.DIAGNOSTICS_CLEAR_LOGS),
  isAdmin: () => ipcRenderer.invoke(CHANNELS.DIAGNOSTICS_IS_ADMIN),
  requestAdmin: () => ipcRenderer.invoke(CHANNELS.DIAGNOSTICS_REQUEST_ADMIN),
});
