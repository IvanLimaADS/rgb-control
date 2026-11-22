import fs from 'fs';
import path from 'path';
import { LightingProfile } from '../shared/types';
import { LoggerService } from './LoggerService';

export class TrayService {
  private logger: LoggerService;
  private tray: any = null;
  private electronRef: any = null;
  private mainWindowRef: any = null;
  private onApplyProfileRef: ((profileId: string) => void) | null = null;
  private onCycleProfileRef: (() => void) | null = null;
  private onQuitRef: (() => void) | null = null;

  constructor(logger: LoggerService) {
    this.logger = logger;
  }

  private resolveTrayIcon(nativeImage: any): any {
    const candidates = [
      path.join(process.cwd(), 'resources', 'tray-icon.png'),
      path.join(process.cwd(), 'resources', 'icon.png'),
      path.join(__dirname, '../../resources/tray-icon.png'),
      path.join(__dirname, '../../resources/icon.png'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const img = nativeImage.createFromPath(p);
        if (!img.isEmpty()) {
          return img.resize({ width: 16, height: 16 });
        }
      }
    }
    const size = 16;
    const buf = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const dist = Math.hypot(x - 7.5, y - 7.5);
        if (dist <= 6.5) {
          buf[i] = 255;
          buf[i + 1] = 220;
          buf[i + 2] = 0;
          buf[i + 3] = 255;
        } else {
          buf[i + 3] = 0;
        }
      }
    }
    return nativeImage.createFromBitmap(buf, { width: size, height: size });
  }

  public initializeTray(
    electron: any,
    mainWindow: any,
    onApplyProfile: (profileId: string) => void,
    onQuit: () => void,
    onCycleProfile?: () => void
  ): void {
    try {
      this.electronRef = electron;
      this.mainWindowRef = mainWindow;
      this.onApplyProfileRef = onApplyProfile;
      this.onCycleProfileRef = onCycleProfile || null;
      this.onQuitRef = onQuit;

      const { Tray, nativeImage } = electron;
      const icon = this.resolveTrayIcon(nativeImage);
      this.tray = new Tray(icon);
      this.tray.setToolTip('RGB Control Center — Gerenciador Unificado RGB/ARGB');

      this.updateProfilesMenu([], null, 'Ctrl+Alt+P');

      this.tray.on('double-click', () => {
        if (this.mainWindowRef) {
          this.mainWindowRef.show();
          this.mainWindowRef.focus();
        }
      });

      this.logger.info('TrayService', 'initializeTray', 'Ícone da bandeja do sistema (System Tray) inicializado.');
    } catch (err: any) {
      this.logger.warn('TrayService', 'initializeTray', `Não foi possível criar ícone na bandeja: ${err?.message}`);
    }
  }

  public updateProfilesMenu(
    profiles: LightingProfile[],
    activeProfileId: string | null,
    shortcutLabel = 'Ctrl+Alt+P'
  ): void {
    if (!this.tray || !this.electronRef) return;
    try {
      const { Menu } = this.electronRef;
      const profileSubmenu =
        profiles.length > 0
          ? profiles.map((p, idx) => ({
              label: `${p.name}${idx < 5 ? ` (Ctrl+Alt+${idx + 1})` : ''}`,
              type: 'radio',
              checked: p.id === activeProfileId,
              click: () => this.onApplyProfileRef?.(p.id),
            }))
          : [
              { label: 'Gaming (Dinâmico)', click: () => this.onApplyProfileRef?.('profile-gaming') },
              { label: 'Work (Foco Discreto)', click: () => this.onApplyProfileRef?.('profile-work') },
              { label: 'Night (Brilho Reduzido)', click: () => this.onApplyProfileRef?.('profile-night') },
              { label: 'Static (Ciano Unificado)', click: () => this.onApplyProfileRef?.('profile-static') },
            ];

      const template: any[] = [
        {
          label: 'Abrir RGB Control Center',
          click: () => {
            if (this.mainWindowRef) {
              this.mainWindowRef.show();
              this.mainWindowRef.focus();
            }
          },
        },
        {
          label: 'Ocultar para Segundo Plano',
          click: () => {
            if (this.mainWindowRef) {
              this.mainWindowRef.hide();
            }
          },
        },
        { type: 'separator' },
        ...(this.onCycleProfileRef
          ? [
              {
                label: `Alternar Próximo Perfil (${shortcutLabel})`,
                click: () => this.onCycleProfileRef?.(),
              },
            ]
          : []),
        {
          label: 'Perfis de Iluminação LED',
          submenu: profileSubmenu,
        },
        { type: 'separator' },
        {
          label: 'Sair do RGB Control Center',
          click: () => this.onQuitRef?.(),
        },
      ];

      const contextMenu = Menu.buildFromTemplate(template);
      this.tray.setContextMenu(contextMenu);
    } catch {
      // Ignora
    }
  }

  public showBalloon(title: string, content: string): void {
    if (!this.tray || typeof this.tray.displayBalloon !== 'function') return;
    try {
      this.tray.displayBalloon({
        title,
        content,
        noSound: true,
      });
    } catch {
      // Ignora em plataformas sem suporte a balloon
    }
  }

  public destroy(): void {
    if (this.tray) {
      try {
        this.tray.destroy();
      } catch {
        // Ignora
      }
      this.tray = null;
    }
  }
}
