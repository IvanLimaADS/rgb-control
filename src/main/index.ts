import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { IPC_CHANNELS } from '../shared/ipc';
import { DatabaseManager } from '../database/DatabaseManager';
import { LoggerService } from '../services/LoggerService';
import { AutoStartService } from '../services/AutoStartService';
import { TrayService } from '../services/TrayService';
import { StateRestoreService } from '../services/StateRestoreService';
import { EffectEngine } from '../effects/EffectEngine';
import { ConflictDetector } from '../core/ConflictDetector';
import { HardwareSafetyValidator } from '../core/HardwareSafetyValidator';
import { DeviceManager } from '../core/DeviceManager';
import { ProfileManager } from '../profiles/ProfileManager';
import { NativeHardwareBridge } from '../providers/NativeHardwareBridge';
import { HuskyProvider } from '../providers/HuskyProvider';
import { RedragonProvider } from '../providers/RedragonProvider';
import { GigabyteProvider } from '../providers/GigabyteProvider';
import { OpenRGBProvider } from '../providers/OpenRGBProvider';
import { UnsupportedHidProvider } from '../providers/UnsupportedHidProvider';

// Carrega o Electron dinamicamente
const electron = require('electron');
const { app, BrowserWindow, ipcMain, globalShortcut } = electron;

let mainWindow: any = null;
let isQuitting = false;

const gotSingleInstanceLock = app ? app.requestSingleInstanceLock() : true;
if (!gotSingleInstanceLock && app) {
  app.quit();
}

async function bootstrapApplication() {
  const userDataPath = app ? app.getPath('userData') : path.join(process.cwd(), '.data');
  const db = new DatabaseManager(userDataPath);
  const logger = new LoggerService(db);
  const effectEngine = new EffectEngine();
  const conflictDetector = new ConflictDetector();
  const validator = new HardwareSafetyValidator();
  const bridge = new NativeHardwareBridge();

  const deviceManager = new DeviceManager(db, effectEngine, logger);

  // Registro modular dos Providers (Seção 5)
  const settings = db.getSettings();
  const huskyProvider = new HuskyProvider(logger, validator, bridge, conflictDetector);
  const redragonProvider = new RedragonProvider(logger, validator, bridge, conflictDetector);
  const gigabyteProvider = new GigabyteProvider(logger, validator, bridge, conflictDetector);
  const openRgbProvider = new OpenRGBProvider(
    logger,
    validator,
    settings.openRgbHost,
    settings.openRgbPort
  );
  const unsupportedProvider = new UnsupportedHidProvider(logger, validator, bridge);

  deviceManager.registerProvider(gigabyteProvider);
  deviceManager.registerProvider(huskyProvider);
  deviceManager.registerProvider(redragonProvider);
  deviceManager.registerProvider(openRgbProvider);
  deviceManager.registerProvider(unsupportedProvider);

  const profileManager = new ProfileManager(db, deviceManager, logger);
  const autoStartService = new AutoStartService(logger, app);
  const trayService = new TrayService(logger);
  const restoreService = new StateRestoreService(db, deviceManager, profileManager, logger);

  const formatShortcutLabel = (acc?: string) =>
    (acc || 'CommandOrControl+Alt+P').replace(/CommandOrControl/g, 'Ctrl');

  const syncTrayAndNotify = async (appliedProfileId?: string, showBalloon = false) => {
    const allProfiles = profileManager.listProfiles();
    const curSettings = db.getSettings();
    const activeId = appliedProfileId ?? curSettings.lastActiveProfileId;
    trayService.updateProfilesMenu(
      allProfiles,
      activeId,
      formatShortcutLabel(curSettings.profileSwitchShortcut)
    );
    const devices = await deviceManager.getAllDevices();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.PROFILES_SWITCHED_EVENT, {
        devices,
        profiles: allProfiles,
        settings: curSettings,
      });
    }
    if (showBalloon && activeId) {
      const activeProf = allProfiles.find((p) => p.id === activeId);
      if (activeProf) {
        trayService.showBalloon(
          'RGB Control Center — Perfil Aplicado',
          `Perfil ativo: ${activeProf.name}`
        );
      }
    }
  };

  const cycleToNextProfile = async (showBalloon = true) => {
    const allProfiles = profileManager.listProfiles();
    if (allProfiles.length === 0) return null;
    const curId = db.getSettings().lastActiveProfileId;
    const idx = allProfiles.findIndex((p) => p.id === curId);
    const nextProfile = allProfiles[(idx + 1) % allProfiles.length];
    const ok = await profileManager.applyProfile(nextProfile.id);
    if (ok) {
      logger.info(
        'MainProcess',
        'globalShortcut',
        `Perfil alternado via atalho para: ${nextProfile.name} (${nextProfile.id}).`
      );
      await syncTrayAndNotify(nextProfile.id, showBalloon);
    }
    return nextProfile;
  };

  const registerProfileShortcuts = (accelerator?: string) => {
    if (!globalShortcut) return;
    try {
      globalShortcut.unregisterAll();
      const mainAcc = accelerator || 'CommandOrControl+Alt+P';
      globalShortcut.register(mainAcc, () => {
        void cycleToNextProfile(true);
      });
      // Atalhos rápidos Ctrl+Alt+1..5 para os 5 primeiros perfis
      for (let i = 0; i < 5; i++) {
        globalShortcut.register(`CommandOrControl+Alt+${i + 1}`, () => {
          const allProfiles = profileManager.listProfiles();
          const target = allProfiles[i];
          if (target) {
            void profileManager.applyProfile(target.id).then((ok) => {
              if (ok) void syncTrayAndNotify(target.id, true);
            });
          }
        });
      }
      logger.info(
        'MainProcess',
        'registerProfileShortcuts',
        `Atalhos globais registrados: ${formatShortcutLabel(mainAcc)} (próximo perfil) e Ctrl+Alt+1..5.`
      );
    } catch (err: any) {
      logger.warn(
        'MainProcess',
        'registerProfileShortcuts',
        `Aviso ao registrar atalho global: ${err?.message || String(err)}`
      );
    }
  };

  // Registra canais IPC imediatamente entre Renderer e Main Process
  ipcMain.handle(IPC_CHANNELS.DEVICES_DISCOVER, async () => {
    await bridge.getHostSnapshot(true);
    return deviceManager.discoverAllDevices();
  });

  ipcMain.handle(IPC_CHANNELS.DEVICES_GET_ALL, async () => {
    return deviceManager.getAllDevices();
  });

  ipcMain.handle(
    IPC_CHANNELS.DEVICE_SET_COLOR,
    async (_e: any, payload: { deviceId: string; color: any; secondaryColor?: any }) => {
      const ok = await deviceManager.setDeviceColor(
        payload.deviceId,
        payload.color,
        payload.secondaryColor
      );
      const devices = await deviceManager.getAllDevices();
      return { success: ok, devices };
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.DEVICE_SET_EFFECT,
    async (_e: any, payload: { deviceId: string; effect: any; options?: any }) => {
      const ok = await deviceManager.setDeviceEffect(
        payload.deviceId,
        payload.effect,
        payload.options
      );
      const devices = await deviceManager.getAllDevices();
      return { success: ok, devices };
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.DEVICE_SET_BRIGHTNESS,
    async (_e: any, payload: { deviceId: string; brightness: number }) => {
      const ok = await deviceManager.setDeviceBrightness(payload.deviceId, payload.brightness);
      const devices = await deviceManager.getAllDevices();
      return { success: ok, devices };
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.DEVICE_SET_SPEED,
    async (_e: any, payload: { deviceId: string; speed: number }) => {
      const ok = await deviceManager.setDeviceSpeed(payload.deviceId, payload.speed);
      const devices = await deviceManager.getAllDevices();
      return { success: ok, devices };
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.DEVICE_TOGGLE_POWER,
    async (_e: any, payload: { deviceId: string; enabled: boolean }) => {
      const ok = await deviceManager.toggleDevicePower(payload.deviceId, payload.enabled);
      const devices = await deviceManager.getAllDevices();
      return { success: ok, devices };
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.DEVICE_SAVE_HARDWARE,
    async (_e: any, payload: { deviceId: string }) => {
      const ok = await deviceManager.saveDeviceHardwareProfile(payload.deviceId);
      return { success: ok };
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.DEVICE_RESTORE_PREVIOUS,
    async (_e: any, payload: { deviceId: string }) => {
      const ok = await deviceManager.restorePreviousDeviceState(payload.deviceId);
      const devices = await deviceManager.getAllDevices();
      return { success: ok, devices };
    }
  );

  ipcMain.handle(IPC_CHANNELS.SYNC_GET_CONFIG, async () => {
    return db.getSyncConfig();
  });

  ipcMain.handle(IPC_CHANNELS.SYNC_APPLY, async (_e: any, config: any) => {
    const result = await deviceManager.applyGlobalSync(config);
    const devices = await deviceManager.getAllDevices();
    return { result, devices, syncConfig: db.getSyncConfig() };
  });

  ipcMain.handle(
    IPC_CHANNELS.SYNC_UPDATE_EXCEPTIONS,
    async (_e: any, payload: { excludedDeviceIds: string[]; includedDeviceIds: string[] }) => {
      const current = db.getSyncConfig();
      const updated = db.saveSyncConfig({
        ...current,
        excludedDeviceIds: payload.excludedDeviceIds,
        includedDeviceIds: payload.includedDeviceIds,
      });
      return updated;
    }
  );

  ipcMain.handle(IPC_CHANNELS.PROFILES_LIST, async () => {
    return profileManager.listProfiles();
  });

  ipcMain.handle(IPC_CHANNELS.PROFILES_APPLY, async (_e: any, profileId: string) => {
    const ok = await profileManager.applyProfile(profileId);
    const devices = await deviceManager.getAllDevices();
    const curSettings = db.getSettings();
    const allProfiles = profileManager.listProfiles();
    trayService.updateProfilesMenu(
      allProfiles,
      curSettings.lastActiveProfileId,
      formatShortcutLabel(curSettings.profileSwitchShortcut)
    );
    return {
      success: ok,
      devices,
      profiles: allProfiles,
      settings: curSettings,
    };
  });

  ipcMain.handle(IPC_CHANNELS.PROFILES_CYCLE, async () => {
    const next = await cycleToNextProfile(false);
    return {
      switchedTo: next,
      devices: await deviceManager.getAllDevices(),
      profiles: profileManager.listProfiles(),
      settings: db.getSettings(),
    };
  });

  ipcMain.handle(
    IPC_CHANNELS.PROFILES_CREATE,
    async (_e: any, payload: { name: string; description: string }) => {
      const created = await profileManager.createProfileFromCurrentState(
        payload.name,
        payload.description
      );
      return { created, profiles: profileManager.listProfiles() };
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.PROFILES_UPDATE,
    async (_e: any, payload: { id: string; name?: string; description?: string }) => {
      const updated = await profileManager.updateProfileWithCurrentState(payload.id, {
        name: payload.name,
        description: payload.description,
      });
      return { updated, profiles: profileManager.listProfiles() };
    }
  );

  ipcMain.handle(IPC_CHANNELS.PROFILES_DUPLICATE, async (_e: any, profileId: string) => {
    const duplicated = profileManager.duplicateProfile(profileId);
    return { duplicated, profiles: profileManager.listProfiles() };
  });

  ipcMain.handle(IPC_CHANNELS.PROFILES_DELETE, async (_e: any, profileId: string) => {
    const ok = profileManager.deleteProfile(profileId);
    return { success: ok, profiles: profileManager.listProfiles() };
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    return db.getSettings();
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, async (_e: any, partial: any) => {
    const updated = db.saveSettings(partial);
    if (partial.startWithWindows !== undefined) {
      autoStartService.configureAutoStart(updated.startWithWindows, updated.minimizeToTray);
    }
    if (partial.openRgbHost !== undefined || partial.openRgbPort !== undefined) {
      openRgbProvider.configureEndpoint(updated.openRgbHost, updated.openRgbPort);
    }
    if (partial.profileSwitchShortcut !== undefined) {
      registerProfileShortcuts(updated.profileSwitchShortcut);
      trayService.updateProfilesMenu(
        profileManager.listProfiles(),
        updated.lastActiveProfileId,
        formatShortcutLabel(updated.profileSwitchShortcut)
      );
    }
    return updated;
  });

  ipcMain.handle(IPC_CHANNELS.DIAGNOSTICS_GET_MATRIX, async () => {
    return deviceManager.getCompatibilityMatrix();
  });

  ipcMain.handle(IPC_CHANNELS.DIAGNOSTICS_GET_CONFLICTS, async () => {
    return conflictDetector.detectConflicts();
  });

  ipcMain.handle(IPC_CHANNELS.DIAGNOSTICS_GET_LOGS, async () => {
    return logger.getLogs();
  });

  ipcMain.handle(IPC_CHANNELS.DIAGNOSTICS_CLEAR_LOGS, async () => {
    logger.clearLogs();
    return [];
  });

  ipcMain.handle(IPC_CHANNELS.DIAGNOSTICS_IS_ADMIN, async () => {
    const snap = await bridge.getHostSnapshot();
    return snap.isAdmin;
  });

  ipcMain.handle(IPC_CHANNELS.DIAGNOSTICS_REQUEST_ADMIN, async () => {
    logger.security(
      'MainProcess',
      'requestAdmin',
      'Solicitação de reinicialização com privilégios administrativos (UAC) para controle SMBus da Gigabyte B450M GAMING.'
    );
    try {
      const exePath = process.execPath;
      const appPath = app.getAppPath();
      execFile('powershell.exe', [
        '-NoProfile',
        '-Command',
        `Start-Process -FilePath '${exePath}' -ArgumentList '${appPath}' -Verb RunAs`,
      ]);
      return { launched: true };
    } catch (err: any) {
      return { launched: false, error: err?.message };
    }
  });

  const startMinimized = process.argv.includes('--minimized');

  try {
    await deviceManager.discoverAllDevices();
    await restoreService.restoreOnStartup();
  } catch (err: any) {
    logger.warn('MainProcess', 'bootstrap', `Aviso na descoberta inicial: ${err?.message}`);
  }

  const iconCandidates = [
    path.join(process.cwd(), 'resources', 'icon.png'),
    path.join(__dirname, '../../resources/icon.png'),
    path.join(process.cwd(), 'resources', 'icon.ico'),
    path.join(__dirname, '../../resources/icon.ico'),
  ];
  const appIconPath = iconCandidates.find((p) => fs.existsSync(p));

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1080,
    minHeight: 700,
    show: !startMinimized,
    icon: appIconPath,
    backgroundColor: '#090b10',
    title: 'RGB Control Center',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl);
  } else {
    const indexHtml = path.join(__dirname, '../../dist/index.html');
    await mainWindow.loadFile(indexHtml);
  }

  mainWindow.on('close', (event: any) => {
    const currentSettings = db.getSettings();
    if (!isQuitting && currentSettings.minimizeToTray && currentSettings.runInBackground) {
      event.preventDefault();
      mainWindow.hide();
      logger.info('MainProcess', 'minimizeToTray', 'Janela ocultada para a bandeja do sistema.');
    }
  });

  trayService.initializeTray(
    electron,
    mainWindow,
    async (profileId: string) => {
      const ok = await profileManager.applyProfile(profileId);
      if (ok) await syncTrayAndNotify(profileId, true);
    },
    async () => {
      isQuitting = true;
      if (globalShortcut) globalShortcut.unregisterAll();
      await deviceManager.disconnectAll();
      trayService.destroy();
      app.quit();
    },
    () => {
      void cycleToNextProfile(true);
    }
  );

  const initialSettings = db.getSettings();
  trayService.updateProfilesMenu(
    profileManager.listProfiles(),
    initialSettings.lastActiveProfileId,
    formatShortcutLabel(initialSettings.profileSwitchShortcut)
  );
  registerProfileShortcuts(initialSettings.profileSwitchShortcut);
}

if (app) {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(bootstrapApplication);

  app.on('before-quit', () => {
    isQuitting = true;
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
