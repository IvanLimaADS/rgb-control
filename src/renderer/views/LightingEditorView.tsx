import React, { useState, useEffect } from 'react';
import { useRgbStore } from '../store/useRgbStore';
import { EFFECT_CATALOG } from '../../effects/EffectEngine';
import { EffectDirection, LightingEffectType, RGBColor } from '../../shared/types';
import { hexToRgb, rgbToHex } from '../../utils/color';
import { CompatibilityBadge } from './DashboardView';
import {
  Palette,
  Sliders,
  Sparkles,
  Sun,
  Gauge,
  Compass,
  Save,
  RotateCcw,
} from 'lucide-react';

const PRESET_SWATCHES: Array<{ name: string; hex: string }> = [
  { name: 'Cyber Cyan', hex: '#00F0FF' },
  { name: 'Neon Purple', hex: '#7C3AED' },
  { name: 'Redragon Crimson', hex: '#FF0040' },
  { name: 'Emerald Matrix', hex: '#10B981' },
  { name: 'Aorus Amber', hex: '#FF6E14' },
  { name: 'Pure Ice', hex: '#B4D7FF' },
  { name: 'Solar Gold', hex: '#FACC15' },
  { name: 'Hot Magenta', hex: '#EC4899' },
];

export const LightingEditorView: React.FC = () => {
  const {
    devices,
    selectedDeviceId,
    selectDeviceForEditor,
    updateDeviceEffect,
    updateDeviceColor,
    updateDeviceBrightness,
    updateDeviceSpeed,
    saveToDeviceMemory,
    restorePreviousDevice,
  } = useRgbStore();

  const controllableDevices = devices.filter((d) => d.capabilities.maxZones > 0);
  const activeDevice =
    controllableDevices.find((d) => d.info.id === selectedDeviceId) || controllableDevices[0];

  const [hexInput, setHexInput] = useState('#00F0FF');
  const [secondaryHexInput, setSecondaryHexInput] = useState('#7C3AED');

  useEffect(() => {
    if (activeDevice) {
      setHexInput(rgbToHex(activeDevice.state.primaryColor));
      if (activeDevice.state.secondaryColor) {
        setSecondaryHexInput(rgbToHex(activeDevice.state.secondaryColor));
      }
    }
  }, [activeDevice]);

  if (!activeDevice) {
    return (
      <div className="bg-[#11151f] border border-[#232b3e] rounded-2xl p-8 text-center text-slate-400">
        Nenhum dispositivo com suporte a iluminação selecionado.
      </div>
    );
  }

  const { info, capabilities, state } = activeDevice;
  const currentEffectMeta = EFFECT_CATALOG[state.effect] || EFFECT_CATALOG.static;

  const handlePrimaryHexChange = (hex: string) => {
    setHexInput(hex);
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      const rgb = hexToRgb(hex);
      updateDeviceColor(info.id, rgb, state.secondaryColor);
    }
  };

  const handleSecondaryHexChange = (hex: string) => {
    setSecondaryHexInput(hex);
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      const secRgb = hexToRgb(hex);
      updateDeviceColor(info.id, state.primaryColor, secRgb);
    }
  };

  const handleRgbSliderChange = (channel: 'r' | 'g' | 'b', value: number) => {
    const nextColor: RGBColor = {
      ...state.primaryColor,
      [channel]: Math.max(0, Math.min(255, value)),
    };
    setHexInput(rgbToHex(nextColor));
    updateDeviceColor(info.id, nextColor, state.secondaryColor);
  };

  return (
    <div className="space-y-6">
      {/* Seletor Superior de Dispositivo */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Editor Visual de Iluminação</h2>
          <p className="text-sm text-slate-400">
            Personalização de efeitos nativos, cores RGB/HEX, velocidade, brilho e direção
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {controllableDevices.map((dev) => {
            const isSelected = dev.info.id === info.id;
            return (
              <button
                key={dev.info.id}
                type="button"
                onClick={() => selectDeviceForEditor(dev.info.id, false)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-all ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50 shadow-neon-cyan'
                    : 'bg-[#11151f] hover:bg-[#161b28] text-slate-300 border-[#232b3e]'
                }`}
              >
                {dev.info.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cabeçalho do Dispositivo Selecionado */}
      <div className="bg-[#11151f] border border-[#232b3e] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-slate-100">{info.name}</h3>
            <CompatibilityBadge status={info.compatibility} />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Protocolo: <code className="text-cyan-300 font-mono">{info.protocol}</code>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => restorePreviousDevice(info.id)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#161b28] hover:bg-[#1e2536] text-slate-200 border border-[#232b3e] text-xs font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Anterior
          </button>
          {capabilities.supportsHardwareProfileSave && (
            <button
              type="button"
              onClick={() => saveToDeviceMemory(info.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 text-xs font-semibold"
            >
              <Save className="w-3.5 h-3.5" />
              Salvar na EEPROM / Flash
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda: Seleção de Efeitos (disponibilizados conforme a capacidade do hardware) */}
        <div className="lg:col-span-5 bg-[#11151f] border border-[#232b3e] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-semibold text-slate-100">
              Efeitos Suportados pelo Hardware ({capabilities.supportedEffects.length})
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(Object.keys(EFFECT_CATALOG) as LightingEffectType[]).map((effectKey) => {
              const meta = EFFECT_CATALOG[effectKey];
              const isSupported = capabilities.supportedEffects.includes(effectKey);
              const isSelected = state.effect === effectKey;

              return (
                <button
                  key={effectKey}
                  type="button"
                  disabled={!isSupported}
                  onClick={() =>
                    updateDeviceEffect(info.id, effectKey, {
                      primaryColor: state.primaryColor,
                      secondaryColor: state.secondaryColor,
                      brightness: effectKey === 'off' ? 0 : state.brightness || 100,
                      speed: state.speed,
                      direction: state.direction,
                    })
                  }
                  className={`p-3 rounded-xl border text-left transition-all ${
                    !isSupported
                      ? 'opacity-35 cursor-not-allowed bg-[#0c0f17] border-[#1a2030]'
                      : isSelected
                      ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-100 shadow-neon-cyan'
                      : 'bg-[#161b28] hover:bg-[#1c2233] border-[#232b3e] text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{meta.label}</span>
                    {!isSupported && (
                      <span className="text-[10px] text-slate-500 uppercase">N/D no HW</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{meta.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Coluna Direita: Seletor de Cores RGB/HEX, Brilho, Velocidade e Direção */}
        <div className="lg:col-span-7 space-y-6">
          {/* Seletor de Cores RGB / HEX */}
          <div className="bg-[#11151f] border border-[#232b3e] rounded-2xl p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-semibold text-slate-100">
                  Seletor de Cores RGB / HEX
                </h4>
              </div>
              <span className="text-xs text-slate-400">{currentEffectMeta.label}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Cor Primária */}
              <div className="bg-[#161b28] border border-[#232b3e] rounded-xl p-4 space-y-3">
                <label className="text-xs font-semibold text-slate-300 block">
                  Cor Principal (RGB / HEX)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={rgbToHex(state.primaryColor)}
                    onChange={(e) => handlePrimaryHexChange(e.target.value.toUpperCase())}
                    className="w-12 h-10 rounded-lg cursor-pointer bg-transparent border border-white/20"
                  />
                  <input
                    type="text"
                    value={hexInput}
                    maxLength={7}
                    onChange={(e) => handlePrimaryHexChange(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-lg bg-[#090b10] border border-[#232b3e] text-sm font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Sliders R, G, B */}
                {(['r', 'g', 'b'] as const).map((ch) => (
                  <div key={ch} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="uppercase font-mono text-slate-400">
                        Canal {ch.toUpperCase()}
                      </span>
                      <span className="font-mono text-slate-200">{state.primaryColor[ch]}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={255}
                      value={state.primaryColor[ch]}
                      onChange={(e) => handleRgbSliderChange(ch, Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>
                ))}
              </div>

              {/* Cor Secundária / Transição & Swatches Rápidos */}
              <div className="bg-[#161b28] border border-[#232b3e] rounded-xl p-4 flex flex-col justify-between space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-2">
                    Cor Secundária (Gradiente / Transição)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={
                        state.secondaryColor ? rgbToHex(state.secondaryColor) : '#7C3AED'
                      }
                      onChange={(e) => handleSecondaryHexChange(e.target.value.toUpperCase())}
                      className="w-12 h-10 rounded-lg cursor-pointer bg-transparent border border-white/20"
                    />
                    <input
                      type="text"
                      value={secondaryHexInput}
                      maxLength={7}
                      onChange={(e) => handleSecondaryHexChange(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 rounded-lg bg-[#090b10] border border-[#232b3e] text-sm font-mono text-slate-100 focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-300 block mb-2">
                    Paleta Rápida de Cores
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {PRESET_SWATCHES.map((sw) => (
                      <button
                        key={sw.hex}
                        type="button"
                        onClick={() => handlePrimaryHexChange(sw.hex)}
                        title={sw.name}
                        className="flex items-center gap-1.5 p-1.5 rounded-lg bg-[#0d111a] hover:bg-[#1f273b] border border-[#232b3e] text-[11px] text-slate-300 transition-colors"
                      >
                        <span
                          style={{ backgroundColor: sw.hex }}
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                        />
                        <span className="truncate">{sw.name.split(' ')[1]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Controles de Brilho, Velocidade e Direção */}
          <div className="bg-[#11151f] border border-[#232b3e] rounded-2xl p-5 space-y-5">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-semibold text-slate-100">
                Parâmetros Físicos da Animação
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Intensidade e Brilho */}
              <div className="bg-[#161b28] border border-[#232b3e] rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                    <Sun className="w-4 h-4 text-amber-400" />
                    Intensidade e Brilho
                  </span>
                  <span className="text-xs font-mono text-cyan-300">{state.brightness}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  disabled={!capabilities.supportsBrightness}
                  value={state.brightness}
                  onChange={(e) => updateDeviceBrightness(info.id, Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400">
                  Convertido automaticamente para os registradores nativos do controlador.
                </p>
              </div>

              {/* Velocidade da Animação */}
              <div className="bg-[#161b28] border border-[#232b3e] rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                    <Gauge className="w-4 h-4 text-purple-400" />
                    Velocidade da Animação
                  </span>
                  <span className="text-xs font-mono text-purple-300">{state.speed}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  disabled={!capabilities.supportsSpeed}
                  value={state.speed}
                  onChange={(e) => updateDeviceSpeed(info.id, Number(e.target.value))}
                  className="w-full accent-purple-400 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400">
                  Ajusta a frequência de ciclo para Wave, Breathing, Rainbow e Reactive.
                </p>
              </div>
            </div>

            {/* Direção dos Efeitos */}
            {capabilities.supportsDirection && (
              <div className="bg-[#161b28] border border-[#232b3e] rounded-xl p-4 space-y-2.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <Compass className="w-4 h-4 text-emerald-400" />
                  Direção do Efeito
                </span>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: 'right', label: 'Esquerda → Direita' },
                      { id: 'left', label: 'Direita → Esquerda' },
                      { id: 'up', label: 'Baixo → Cima' },
                      { id: 'down', label: 'Cima → Baixo' },
                      { id: 'outward', label: 'Centro → Bordas' },
                      { id: 'inward', label: 'Bordas → Centro' },
                    ] as Array<{ id: EffectDirection; label: string }>
                  ).map((dir) => (
                    <button
                      key={dir.id}
                      type="button"
                      onClick={() =>
                        updateDeviceEffect(info.id, state.effect, { direction: dir.id })
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        state.direction === dir.id
                          ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
                          : 'bg-[#0d111a] text-slate-300 border-[#232b3e] hover:bg-[#1a2234]'
                      }`}
                    >
                      {dir.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
