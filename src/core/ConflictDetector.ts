import { execFile } from 'child_process';
import { promisify } from 'util';
import { ConflictReport } from '../shared/types';

const execFileAsync = promisify(execFile);

interface KnownVendorProcess {
  matchName: RegExp;
  displayName: string;
  affectedVendor: string;
  recommendation: string;
}

const KNOWN_CONFLICTING_PROCESSES: KnownVendorProcess[] = [
  {
    matchName: /^(RGBFusion|SelLedV2|GCC)$/i,
    displayName: 'Gigabyte RGB Fusion / Control Center',
    affectedVendor: 'Gigabyte',
    recommendation:
      'Feche o RGB Fusion (RGBFusion.exe / SelLedV2.exe) para evitar acesso concorrente ao barramento SMBus (GVCIDrv64.sys).',
  },
  {
    matchName: /^(OemDrv|Redragon.*|M719.*)$/i,
    displayName: 'Software Oficial Redragon (OemDrv.exe)',
    affectedVendor: 'Redragon',
    recommendation:
      'Encerre o OemDrv.exe na bandeja do sistema antes de enviar relatórios HID Feature (0xFF02:0x0002) ao mouse Redragon M719RGB-PRO.',
  },
  {
    matchName: /^(Central de Controle Husky|Husky.*)$/i,
    displayName: 'Central de Controle Husky',
    affectedVendor: 'Husky',
    recommendation:
      'Encerre a Central de Controle Husky para evitar colisão de pacotes de 64 bytes na interface HID 0xFF1C:0x0092.',
  },
  {
    matchName: /^(SignalRgb|WhirlwindFX)$/i,
    displayName: 'SignalRGB',
    affectedVendor: 'Global',
    recommendation:
      'Feche o SignalRGB para evitar disputa de pacotes USB HID com o RGB Control Center.',
  },
];

export class ConflictDetector {
  public async detectConflicts(): Promise<ConflictReport> {
    if (process.platform !== 'win32') {
      return { hasConflicts: false, processes: [] };
    }

    try {
      const { stdout } = await execFileAsync(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          'Get-Process | Select-Object Id, ProcessName | ConvertTo-Json -Compress',
        ],
        { timeout: 4000 }
      );

      if (!stdout || !stdout.trim()) {
        return { hasConflicts: false, processes: [] };
      }

      const rawList = JSON.parse(stdout.trim());
      const procArray = Array.isArray(rawList) ? rawList : [rawList];
      const detected: ConflictReport['processes'] = [];

      for (const proc of procArray) {
        const pName = String(proc?.ProcessName || '');
        if (!pName) continue;
        for (const rule of KNOWN_CONFLICTING_PROCESSES) {
          if (rule.matchName.test(pName)) {
            detected.push({
              pid: Number(proc.Id) || 0,
              name: `${pName}.exe (${rule.displayName})`,
              affectedVendor: rule.affectedVendor,
              recommendation: rule.recommendation,
            });
          }
        }
      }

      return {
        hasConflicts: detected.length > 0,
        processes: detected,
      };
    } catch {
      return { hasConflicts: false, processes: [] };
    }
  }

  public async hasVendorConflict(vendor: string): Promise<string | undefined> {
    const report = await this.detectConflicts();
    const match = report.processes.find(
      (p) =>
        p.affectedVendor.toLowerCase() === vendor.toLowerCase() ||
        p.affectedVendor.toLowerCase() === 'global'
    );
    return match ? match.name : undefined;
  }
}
