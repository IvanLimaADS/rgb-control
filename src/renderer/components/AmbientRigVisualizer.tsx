import React from 'react';
import { RGBDevice } from '../../shared/types';
import { rgbToHex } from '../../utils/color';
import { Cpu, Keyboard, Mouse, Sparkles } from 'lucide-react';

interface Props {
  devices: RGBDevice[];
  selectedDeviceId: string;
  onSelectDevice: (deviceId: string) => void;
}

export const AmbientRigVisualizer: React.FC<Props> = ({
  devices,
  selectedDeviceId,
  onSelectDevice,
}) => {
  const motherboard = devices.find((d) => d.info.id === 'gigabyte-b450m-gaming');
  const keyboard = devices.find((d) => d.info.id === 'husky-tg200-320f-5016');
  const mouse = devices.find((d) => d.info.id === 'redragon-m719rgb-25a7-fa7e');

  const getDeviceVisualStyle = (dev?: RGBDevice): React.CSSProperties => {
    if (!dev || !dev.state.enabled || dev.state.effect === 'off' || dev.state.brightness === 0) {
      return {
        borderColor: '#232b3e',
        background: '#11151f',
        opacity: 0.55,
      };
    }

    const c1 = rgbToHex(dev.state.primaryColor);
    const c2 = dev.state.secondaryColor ? rgbToHex(dev.state.secondaryColor) : '#7C3AED';
    const alpha = Math.max(0.25, dev.state.brightness / 100);

    if (dev.state.effect === 'rainbow' || dev.state.effect === 'color_cycle') {
      return {
        borderColor: '#00f0ff',
        background:
          'linear-gradient(120deg, rgba(255,0,102,0.35), rgba(0,240,255,0.35), rgba(124,58,237,0.35), rgba(16,185,129,0.35))',
        boxShadow: `0 0 28px rgba(0, 240, 255, ${alpha * 0.45})`,
      };
    }

    if (dev.state.effect === 'wave' || dev.state.effect === 'gradient') {
      return {
        borderColor: c1,
        background: `linear-gradient(135deg, ${c1}44 0%, ${c2}44 100%)`,
        boxShadow: `0 0 25px ${c1}55`,
      };
    }

    return {
      borderColor: c1,
      background: `radial-gradient(circle at 50% 35%, ${c1}40 0%, #11151f 85%)`,
      boxShadow: `0 0 24px ${c1}55`,
    };
  };

  return (
    <div className="bg-[#11151f] border border-[#232b3e] rounded-2xl p-5 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Visão Geral do Ambiente RGB em Tempo Real
            </h3>
            <p className="text-xs text-slate-400">
              Clique em qualquer componente físico abaixo para abrir seu editor de iluminação
            </p>
          </div>
        </div>
        <span className="text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-medium">
          Preview Ao Vivo
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Placa-Mãe Gigabyte B450M GAMING */}
        <button
          type="button"
          onClick={() => motherboard && onSelectDevice(motherboard.info.id)}
          style={getDeviceVisualStyle(motherboard)}
          className={`lg:col-span-4 rounded-xl border-2 p-4 text-left transition-all duration-300 flex flex-col justify-between cursor-pointer ${
            motherboard?.state.effect === 'breathing' ? 'animate-rgb-breathing' : ''
          } ${
            selectedDeviceId === motherboard?.info.id
              ? 'ring-2 ring-cyan-400/70 scale-[1.01]'
              : 'hover:scale-[1.01]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-slate-200" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Placa-Mãe (SMBus 12V GRB)
              </span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-black/40 text-slate-300 font-mono">
              {motherboard?.state.enabled ? motherboard.state.effect.toUpperCase() : 'OFF'}
            </span>
          </div>

          <div className="my-4 flex flex-col items-center justify-center py-3 border border-white/10 rounded-lg bg-black/30">
            <div className="text-xs font-bold tracking-widest text-slate-200">
              GIGABYTE B450M GAMING
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              ITE MCU 0x08210001 • BIOS F62
            </div>
            <div className="mt-3 flex gap-2">
              {[0, 1, 2, 3].map((idx) => (
                <span
                  key={idx}
                  style={{
                    backgroundColor:
                      motherboard && motherboard.state.enabled
                        ? rgbToHex(motherboard.state.primaryColor)
                        : '#334155',
                  }}
                  className="w-6 h-1.5 rounded-full transition-colors duration-300"
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span>Brilho: {motherboard?.state.brightness ?? 0}%</span>
            <span>
              Cor:{' '}
              <code className="font-mono">
                {motherboard ? rgbToHex(motherboard.state.primaryColor) : '#000000'}
              </code>
            </span>
          </div>
        </button>

        {/* Teclado Husky TG200 65% */}
        <button
          type="button"
          onClick={() => keyboard && onSelectDevice(keyboard.info.id)}
          style={getDeviceVisualStyle(keyboard)}
          className={`lg:col-span-5 rounded-xl border-2 p-4 text-left transition-all duration-300 flex flex-col justify-between cursor-pointer ${
            keyboard?.state.effect === 'breathing' ? 'animate-rgb-breathing' : ''
          } ${
            selectedDeviceId === keyboard?.info.id
              ? 'ring-2 ring-cyan-400/70 scale-[1.01]'
              : 'hover:scale-[1.01]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-slate-200" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Teclado Husky TG200 (65%)
              </span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-black/40 text-slate-300 font-mono">
              {keyboard?.state.enabled ? keyboard.state.effect.toUpperCase() : 'OFF'}
            </span>
          </div>

          {/* Mini matriz de teclas 65% */}
          <div className="my-3 p-2.5 rounded-lg bg-black/45 border border-white/10 space-y-1.5">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="grid grid-cols-12 gap-1">
                {Array.from({ length: 12 }).map((_, col) => {
                  const isWave =
                    keyboard?.state.effect === 'wave' ||
                    keyboard?.state.effect === 'gradient' ||
                    keyboard?.state.effect === 'rainbow';
                  const keyHex =
                    !keyboard || !keyboard.state.enabled
                      ? '#1e293b'
                      : isWave && (col + row) % 3 === 0 && keyboard.state.secondaryColor
                      ? rgbToHex(keyboard.state.secondaryColor)
                      : rgbToHex(keyboard.state.primaryColor);
                  return (
                    <div
                      key={col}
                      style={{
                        backgroundColor: `${keyHex}33`,
                        borderColor: keyHex,
                      }}
                      className={`h-3 rounded-[3px] border transition-colors duration-300 ${
                        row === 3 && col >= 3 && col <= 7 ? 'col-span-1' : ''
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span>VID_320F & PID_5016 (EVision V102)</span>
            <span>
              Cor:{' '}
              <code className="font-mono">
                {keyboard ? rgbToHex(keyboard.state.primaryColor) : '#000000'}
              </code>
            </span>
          </div>
        </button>

        {/* Mouse Redragon M719RGB-PRO */}
        <button
          type="button"
          onClick={() => mouse && onSelectDevice(mouse.info.id)}
          style={getDeviceVisualStyle(mouse)}
          className={`lg:col-span-3 rounded-xl border-2 p-4 text-left transition-all duration-300 flex flex-col justify-between cursor-pointer ${
            mouse?.state.effect === 'breathing' ? 'animate-rgb-breathing' : ''
          } ${
            selectedDeviceId === mouse?.info.id
              ? 'ring-2 ring-cyan-400/70 scale-[1.01]'
              : 'hover:scale-[1.01]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mouse className="w-5 h-5 text-slate-200" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Redragon M719RGB-PRO
              </span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-black/40 text-slate-300 font-mono">
              {mouse?.state.enabled ? mouse.state.effect.toUpperCase() : 'OFF'}
            </span>
          </div>

          {/* Silhueta do Mouse com Scroll, DPI e Lateral RGB */}
          <div className="my-3 flex items-center justify-center">
            <div
              style={{
                borderColor:
                  mouse && mouse.state.enabled
                    ? rgbToHex(mouse.state.primaryColor)
                    : '#334155',
              }}
              className="w-20 h-28 rounded-full border-2 bg-black/40 flex flex-col items-center justify-between py-3 px-2 relative"
            >
              {/* Scroll Wheel LED */}
              <div
                style={{
                  backgroundColor:
                    mouse && mouse.state.enabled
                      ? rgbToHex(mouse.state.primaryColor)
                      : '#334155',
                }}
                className="w-2.5 h-6 rounded-full"
              />
              {/* Logo Invader LED */}
              <div
                style={{
                  backgroundColor:
                    mouse && mouse.state.enabled
                      ? rgbToHex(mouse.state.primaryColor)
                      : '#334155',
                }}
                className="w-8 h-3 rounded-full opacity-90"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span>25A7:FA7E (0x00A0)</span>
            <span>
              <code className="font-mono">
                {mouse ? rgbToHex(mouse.state.primaryColor) : '#000000'}
              </code>
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};
