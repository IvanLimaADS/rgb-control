export const IPC_CHANNELS = {
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
} as const;
