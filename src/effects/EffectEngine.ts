import {
  DeviceCapabilities,
  EffectDirection,
  LightingEffectType,
  LightingState,
  RGBColor,
} from '../shared/types';
import { clampPercent, interpolateColor, sanitizeColor } from '../utils/color';

export interface EffectMetadata {
  id: LightingEffectType;
  label: string;
  description: string;
  usesPrimaryColor: boolean;
  usesSecondaryColor: boolean;
  usesSpeed: boolean;
  usesDirection: boolean;
}

export const EFFECT_CATALOG: Record<LightingEffectType, EffectMetadata> = {
  static: {
    id: 'static',
    label: 'Cor Estática',
    description: 'Iluminação contínua e uniforme na cor selecionada.',
    usesPrimaryColor: true,
    usesSecondaryColor: false,
    usesSpeed: false,
    usesDirection: false,
  },
  gradient: {
    id: 'gradient',
    label: 'Gradiente (2 Cores)',
    description: 'Transição suave e contínua entre a cor primária e a cor secundária.',
    usesPrimaryColor: true,
    usesSecondaryColor: true,
    usesSpeed: true,
    usesDirection: true,
  },
  rainbow: {
    id: 'rainbow',
    label: 'Rainbow (Arco-Íris)',
    description: 'Espectro cromático contínuo percorrendo as zonas do dispositivo.',
    usesPrimaryColor: false,
    usesSecondaryColor: false,
    usesSpeed: true,
    usesDirection: true,
  },
  breathing: {
    id: 'breathing',
    label: 'Breathing (Respiração)',
    description: 'Pulsação suave de brilho imitando um ciclo de respiração.',
    usesPrimaryColor: true,
    usesSecondaryColor: true,
    usesSpeed: true,
    usesDirection: false,
  },
  wave: {
    id: 'wave',
    label: 'Wave (Onda)',
    description: 'Onda dinâmica de iluminação com direção e velocidade ajustáveis.',
    usesPrimaryColor: true,
    usesSecondaryColor: true,
    usesSpeed: true,
    usesDirection: true,
  },
  color_cycle: {
    id: 'color_cycle',
    label: 'Color Cycle (Neon)',
    description: 'Alternância cíclica contínua por todo o espectro RGB.',
    usesPrimaryColor: false,
    usesSecondaryColor: false,
    usesSpeed: true,
    usesDirection: false,
  },
  reactive: {
    id: 'reactive',
    label: 'Reactive (Reação ao Uso)',
    description: 'Acende ou propaga ondas ao pressionar teclas ou clicar.',
    usesPrimaryColor: true,
    usesSecondaryColor: false,
    usesSpeed: true,
    usesDirection: false,
  },
  strobing: {
    id: 'strobing',
    label: 'Strobing (Flash)',
    description: 'Piscadas rápidas de alta intensidade para alertas ou destaque.',
    usesPrimaryColor: true,
    usesSecondaryColor: false,
    usesSpeed: true,
    usesDirection: false,
  },
  custom: {
    id: 'custom',
    label: 'Alternância (2 Cores)',
    description: 'Alterna periodicamente entre a cor primária e a cor secundária.',
    usesPrimaryColor: true,
    usesSecondaryColor: true,
    usesSpeed: true,
    usesDirection: true,
  },
  off: {
    id: 'off',
    label: 'Desligado',
    description: 'Desativa todos os LEDs do dispositivo.',
    usesPrimaryColor: false,
    usesSecondaryColor: false,
    usesSpeed: false,
    usesDirection: false,
  },
};

export class EffectEngine {
  /**
   * Resolve o efeito mais adequado suportado pelo hardware do dispositivo,
   * respeitando estritamente as capacidades reais de cada controlador.
   */
  public resolveHardwareEffect(
    requestedEffect: LightingEffectType,
    capabilities: DeviceCapabilities
  ): LightingEffectType {
    if (capabilities.supportedEffects.includes(requestedEffect)) {
      return requestedEffect;
    }

    // Mapeamento de fallback seguro caso um efeito global (Sync RGB) seja aplicado
    // a um hardware com conjunto menor de modos nativos em firmware
    const fallbackOrder: Record<LightingEffectType, LightingEffectType[]> = {
      static: ['static'],
      gradient: ['wave', 'breathing', 'color_cycle', 'static'],
      rainbow: ['wave', 'color_cycle', 'static'],
      breathing: ['breathing', 'static'],
      wave: ['wave', 'rainbow', 'color_cycle', 'static'],
      color_cycle: ['color_cycle', 'rainbow', 'wave', 'breathing', 'static'],
      reactive: ['reactive', 'breathing', 'static'],
      strobing: ['strobing', 'breathing', 'static'],
      custom: ['custom', 'static'],
      off: ['off', 'static'],
    };

    const candidates = fallbackOrder[requestedEffect] || ['static'];
    for (const candidate of candidates) {
      if (capabilities.supportedEffects.includes(candidate)) {
        return candidate;
      }
    }

    return capabilities.supportedEffects[0] || 'static';
  }

  /**
   * Normaliza e valida um estado de iluminação completo antes de enviá-lo ao provider.
   */
  public buildValidatedState(
    current: LightingState,
    capabilities: DeviceCapabilities,
    updates: Partial<{
      enabled: boolean;
      effect: LightingEffectType;
      primaryColor: RGBColor;
      secondaryColor: RGBColor;
      gradientColors: RGBColor[];
      brightness: number;
      speed: number;
      direction: EffectDirection;
    }>
  ): LightingState {
    const requestedEffect = updates.effect ?? current.effect;
    const resolvedEffect = this.resolveHardwareEffect(requestedEffect, capabilities);
    const primaryColor = sanitizeColor(updates.primaryColor ?? current.primaryColor);
    const secondaryColor = sanitizeColor(
      updates.secondaryColor ?? current.secondaryColor ?? { r: 124, g: 58, b: 237 }
    );
    const brightness = clampPercent(updates.brightness ?? current.brightness);
    const speed = clampPercent(updates.speed ?? current.speed);
    const direction = updates.direction ?? current.direction ?? 'right';
    const enabled = updates.enabled !== undefined ? updates.enabled : resolvedEffect !== 'off';

    // Se o efeito solicitado era gradiente mas o hardware opera com cor única ou zonas,
    // calculamos a interpolação para as zonas
    const gradientColors =
      updates.gradientColors ??
      current.gradientColors ?? [
        primaryColor,
        interpolateColor(primaryColor, secondaryColor, 0.5),
        secondaryColor,
      ];

    return {
      enabled: resolvedEffect === 'off' ? false : enabled,
      effect: enabled ? resolvedEffect : 'off',
      primaryColor,
      secondaryColor,
      gradientColors,
      brightness: resolvedEffect === 'off' ? 0 : brightness,
      speed,
      direction,
      updatedAt: new Date().toISOString(),
    };
  }
}
