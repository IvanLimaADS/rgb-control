import React from 'react';
import { useRgbStore } from '../store/useRgbStore';
import { EFFECT_CATALOG } from '../../effects/EffectEngine';
import { LightingEffectType } from '../../shared/types';
import { hexToRgb, rgbToHex } from '../../utils/color';
import { CategoryIcon, CompatibilityBadge } from './DashboardView';
import { Zap, ShieldOff, CheckSquare, Square, Sun, Gauge } from 'lucide-react';

export const SyncRgbView: React.FC = () => {
  const {
    devices,
    syncConfig,
    updateSyncDraft,
    toggleSyncDeviceInclusion,
    toggleSyncDeviceException,
    applyGlobalSync,
  } = useRgbStore();

  const controllableDevices = devices.filter((d) => d.capabilities.maxZones > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">
            Sincronização Global — Sync RGB
          </h2>
          <p className="text-sm text-slate-400">
            Aplique simultaneamente a mesma cor, efeito, velocidade e padrão entre múltiplos fabricantes, com suporte a exceções individuais
          </p>
        </div>

        <button
          type="button"
          onClick={() => applyGlobalSync()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-neon-cyan transition-all cursor-pointer"
        >
          <Zap className="w-4 h-4" />
          Aplicar Sync RGB Agora
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Seleção de Dispositivos e Definição de Exceções */}
        <div className="lg:col-span-6 bg-[#11151f] border border-[#232b3e] rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              1. Dispositivos Participantes e Exceções
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Selecione quais periféricos participam do Sync RGB ou marque como Exceção para preservar sua iluminação individual atual
            </p>
          </div>

          <div className="space-y-3">
            {controllableDevices.map((dev) => {
              const id = dev.info.id;
              const isIncluded = syncConfig.includedDeviceIds.includes(id);
              const isException = syncConfig.excludedDeviceIds.includes(id);

              return (
                <div
                  key={id}
                  className={`p-4 rounded-xl border transition-all flex flex-wrap items-center justify-between gap-3 ${
                    isException
                      ? 'bg-amber-500/10 border-amber-500/35'
                      : isIncluded
                      ? 'bg-[#161b28] border-cyan-500/40'
                      : 'bg-[#0d1018] border-[#1e2638] opacity-65'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleSyncDeviceInclusion(id)}
                      className="text-cyan-400 hover:text-cyan-300"
                    >
                      {isIncluded && !isException ? (
                        <CheckSquare className="w-5 h-5" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-500" />
                      )}
                    </button>
                    <CategoryIcon category={dev.info.category} className="w-5 h-5 text-slate-300" />
                    <div>
                      <div className="text-sm font-semibold text-slate-100">{dev.info.name}</div>
                      <div className="mt-1">
                        <CompatibilityBadge status={dev.info.compatibility} />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleSyncDeviceException(id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      isException
                        ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                        : 'bg-[#11151f] text-slate-400 border-[#232b3e] hover:text-slate-200'
                    }`}
                  >
                    <ShieldOff className="w-3.5 h-3.5" />
                    {isException ? 'Exceção Ativa (Ignorar no Sync)' : 'Definir como Exceção'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Configuração Global de Cor, Efeito, Velocidade e Brilho */}
        <div className="lg:col-span-6 bg-[#11151f] border border-[#232b3e] rounded-2xl p-5 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              2. Padrão Global de Iluminação Unificada
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              O motor de efeitos adapta automaticamente o padrão escolhido às capacidades de hardware de cada fabricante
            </p>
          </div>

          {/* Efeito Unificado */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Efeito Sincronizado
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(
                ['static', 'wave', 'breathing', 'rainbow', 'color_cycle', 'gradient', 'custom'] as LightingEffectType[]
              ).map((eff) => {
                const meta = EFFECT_CATALOG[eff];
                const isSelected = syncConfig.effect === eff;
                return (
                  <button
                    key={eff}
                    type="button"
                    onClick={() => updateSyncDraft({ effect: eff })}
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100 shadow-neon-cyan'
                        : 'bg-[#161b28] border-[#232b3e] text-slate-300 hover:bg-[#1d2436]'
                    }`}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cores Primária e Secundária */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#161b28] border border-[#232b3e] rounded-xl p-3.5 space-y-2">
              <span className="text-xs font-semibold text-slate-300 block">
                Cor Global Primária
              </span>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={rgbToHex(syncConfig.primaryColor)}
                  onChange={(e) =>
                    updateSyncDraft({ primaryColor: hexToRgb(e.target.value) })
                  }
                  className="w-10 h-9 rounded cursor-pointer bg-transparent"
                />
                <code className="text-xs font-mono text-cyan-300">
                  {rgbToHex(syncConfig.primaryColor)}
                </code>
              </div>
            </div>

            <div className="bg-[#161b28] border border-[#232b3e] rounded-xl p-3.5 space-y-2">
              <span className="text-xs font-semibold text-slate-300 block">
                Cor Global Secundária
              </span>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={rgbToHex(syncConfig.secondaryColor)}
                  onChange={(e) =>
                    updateSyncDraft({ secondaryColor: hexToRgb(e.target.value) })
                  }
                  className="w-10 h-9 rounded cursor-pointer bg-transparent"
                />
                <code className="text-xs font-mono text-purple-300">
                  {rgbToHex(syncConfig.secondaryColor)}
                </code>
              </div>
            </div>
          </div>

          {/* Brilho e Velocidade Sincronizados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#161b28] border border-[#232b3e] rounded-xl p-3.5 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 text-slate-200 font-semibold">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  Brilho Global
                </span>
                <span className="font-mono text-cyan-300">{syncConfig.brightness}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={syncConfig.brightness}
                onChange={(e) => updateSyncDraft({ brightness: Number(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>

            <div className="bg-[#161b28] border border-[#232b3e] rounded-xl p-3.5 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 text-slate-200 font-semibold">
                  <Gauge className="w-3.5 h-3.5 text-purple-400" />
                  Velocidade Global
                </span>
                <span className="font-mono text-purple-300">{syncConfig.speed}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={syncConfig.speed}
                onChange={(e) => updateSyncDraft({ speed: Number(e.target.value) })}
                className="w-full accent-purple-400"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
