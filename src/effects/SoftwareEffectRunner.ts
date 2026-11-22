import { IDeviceProvider, LightingEffectType, RGBColor } from '../shared/types';
import { interpolateColor, sanitizeColor } from '../utils/color';
import { LoggerService } from '../services/LoggerService';

export interface SoftwareEffectJob {
  deviceId: string;
  provider: IDeviceProvider;
  effect: Extract<LightingEffectType, 'gradient' | 'custom'>;
  primaryColor: RGBColor;
  secondaryColor: RGBColor;
  speed: number;
  isMotherboard: boolean;
}

interface ActiveRunner {
  timer: NodeJS.Timeout;
  inFlight: boolean;
  step: number;
  job: SoftwareEffectJob;
}

/**
 * Motor de Efeitos em Software (Seção 7):
 * Executa efeitos dinâmicos calculados pelo RGB Core (como Alternância Primária <-> Secundária
 * e Gradiente entre 2 cores) com controle rigoroso de frequência para evitar sobrecarga de USB/CPU.
 * Nunca mantém loops ativos quando o dispositivo está em modo estático, desligado ou efeito nativo em firmware.
 */
export class SoftwareEffectRunner {
  private activeRunners = new Map<string, ActiveRunner>();
  private logger: LoggerService;

  constructor(logger: LoggerService) {
    this.logger = logger;
  }

  public isSoftwareEffect(effect: LightingEffectType): effect is 'gradient' | 'custom' {
    return effect === 'gradient' || effect === 'custom';
  }

  public start(job: SoftwareEffectJob): void {
    this.stop(job.deviceId);

    const primary = sanitizeColor(job.primaryColor);
    const secondary = sanitizeColor(job.secondaryColor);

    // Intervalo seguro por tipo de barramento (SMBus 32-bit vs USB HID)
    const minIntervalMs = job.isMotherboard ? 1500 : 500;
    const maxIntervalMs = job.isMotherboard ? 3500 : 2400;
    const normalizedSpeed = Math.max(0, Math.min(100, job.speed)) / 100;
    const intervalMs = Math.round(maxIntervalMs - normalizedSpeed * (maxIntervalMs - minIntervalMs));

    const runner: ActiveRunner = {
      inFlight: false,
      step: 0,
      job: { ...job, primaryColor: primary, secondaryColor: secondary },
      timer: setInterval(() => {
        void this.tick(job.deviceId);
      }, intervalMs),
    };

    this.activeRunners.set(job.deviceId, runner);

    this.logger.info(
      'SoftwareEffectRunner',
      'start',
      `Efeito em software '${job.effect}' iniciado (${intervalMs}ms/passo) entre Primária e Secundária.`,
      job.deviceId
    );

    // Dispara o primeiro passo imediatamente
    void this.tick(job.deviceId);
  }

  private async tick(deviceId: string): Promise<void> {
    const runner = this.activeRunners.get(deviceId);
    if (!runner || runner.inFlight) {
      return;
    }

    runner.inFlight = true;
    try {
      const { provider, effect, primaryColor, secondaryColor } = runner.job;
      let nextColor: RGBColor;

      if (effect === 'custom') {
        // Alternância direta: Primária <-> Secundária
        nextColor = runner.step % 2 === 0 ? primaryColor : secondaryColor;
        runner.step = (runner.step + 1) % 2;
      } else {
        // Gradiente suave em onda triangular (8 passos: 0 -> 1 -> 0)
        const totalSteps = 8;
        const phase = runner.step % totalSteps;
        const t = phase <= totalSteps / 2 ? phase / (totalSteps / 2) : (totalSteps - phase) / (totalSteps / 2);
        nextColor = interpolateColor(primaryColor, secondaryColor, t);
        runner.step = (runner.step + 1) % totalSteps;
      }

      await provider.setColor(deviceId, nextColor, secondaryColor);
    } catch (err: any) {
      this.logger.warn(
        'SoftwareEffectRunner',
        'tick',
        `Erro no passo do efeito em software: ${err?.message || String(err)}`,
        deviceId
      );
    } finally {
      const current = this.activeRunners.get(deviceId);
      if (current === runner) {
        current.inFlight = false;
      }
    }
  }

  public stop(deviceId: string): void {
    const existing = this.activeRunners.get(deviceId);
    if (existing) {
      clearInterval(existing.timer);
      this.activeRunners.delete(deviceId);
    }
  }

  public stopAll(): void {
    for (const deviceId of Array.from(this.activeRunners.keys())) {
      this.stop(deviceId);
    }
  }
}
