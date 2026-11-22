import React from 'react';
import { useRgbStore } from '../store/useRgbStore';
import { CategoryIcon, CompatibilityBadge } from './DashboardView';
import { EFFECT_CATALOG } from '../../effects/EffectEngine';
import { rgbToHex } from '../../utils/color';
import {
  Sliders,
  Power,
  RotateCcw,
  Save,
  ShieldAlert,
  Terminal,
} from 'lucide-react';

export const DevicesView: React.FC = () => {
  const {
    devices,
    isAdmin,
    selectDeviceForEditor,
    toggleDevicePower,
    restorePreviousDevice,
    saveToDeviceMemory,
    requestAdminElevation,
  } = useRgbStore();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">
            Gerenciamento Detalhado de Dispositivos
          </h2>
          <p className="text-sm text-slate-400">
            Inspeção de protocolos HID/SMBus, capacidades de hardware e controle individual
          </p>
        </div>

        {!isAdmin && (
          <button
            type="button"
            onClick={() => requestAdminElevation()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
          >
            <ShieldAlert className="w-4 h-4" />
            Elevar para Administrador (Habilitar Escrita SMBus Gigabyte)
          </button>
        )}
      </div>

      <div className="space-y-4">
        {devices.map((dev) => {
          const { info, capabilities, state } = dev;
          const hex = rgbToHex(state.primaryColor);

          return (
            <div
              key={info.id}
              className="bg-[#11151f] border border-[#232b3e] rounded-2xl p-5 space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div
                    style={{
                      backgroundColor:
                        state.enabled && capabilities.maxZones > 0 ? `${hex}25` : '#161b28',
                      borderColor:
                        state.enabled && capabilities.maxZones > 0 ? hex : '#232b3e',
                    }}
                    className="w-12 h-12 rounded-xl border flex items-center justify-center text-slate-100 shrink-0"
                  >
                    <CategoryIcon category={info.category} className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-base font-bold text-slate-100">{info.name}</h3>
                      <CompatibilityBadge status={info.compatibility} />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Fabricante: <strong className="text-slate-200">{info.manufacturer}</strong> •
                      Modelo: <strong className="text-slate-200">{info.model}</strong> • Categoria:{' '}
                      <span className="uppercase text-cyan-300">{info.category}</span>
                    </p>
                  </div>
                </div>

                {capabilities.maxZones > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleDevicePower(info.id, !state.enabled)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                        state.enabled
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      {state.enabled ? 'Ativado' : 'Desativado'}
                    </button>

                    <button
                      type="button"
                      onClick={() => restorePreviousDevice(info.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#161b28] hover:bg-[#1e2536] text-slate-300 border border-[#232b3e] text-xs font-medium transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restaurar Anterior
                    </button>

                    {capabilities.supportsHardwareProfileSave && (
                      <button
                        type="button"
                        onClick={() => saveToDeviceMemory(info.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-medium transition-colors"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Gravar na Memória Onboard
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => selectDeviceForEditor(info.id, true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 text-xs font-semibold transition-colors"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      Abrir no Editor Visual
                    </button>
                  </div>
                )}
              </div>

              {/* Especificações Técnicas e Protocolo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#0d1018] border border-[#1d2436] rounded-xl p-3.5 text-xs">
                <div>
                  <span className="text-slate-500 block">Protocolo de Comunicação</span>
                  <span className="text-slate-200 font-mono mt-0.5 block">{info.protocol}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Identificadores de Hardware</span>
                  <span className="text-slate-200 font-mono mt-0.5 block">
                    {info.vendorId ? `VID: ${info.vendorId} | PID: ${info.productId}` : 'Barramento Onboard / TCP'}
                    {info.firmwareOrBios ? ` • ${info.firmwareOrBios}` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Zonas e Capacidades</span>
                  <span className="text-slate-200 mt-0.5 block">
                    {capabilities.maxZones} zona(s) •{' '}
                    {capabilities.supportsBrightness ? 'Brilho Ajustável • ' : ''}
                    {capabilities.supportsSpeed ? 'Velocidade Ajustável • ' : ''}
                    {capabilities.supportsDirection ? 'Direção Ajustável' : 'Direção Fixa'}
                  </span>
                </div>
              </div>

              {/* Recursos de Iluminação Disponíveis no Hardware */}
              <div>
                <span className="text-xs text-slate-400 block mb-2">
                  Modos e Recursos de Iluminação Disponíveis neste Hardware:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {capabilities.supportedEffects.map((eff) => {
                    const meta = EFFECT_CATALOG[eff];
                    const isCurrent = state.effect === eff;
                    return (
                      <span
                        key={eff}
                        className={`text-xs px-2.5 py-1 rounded-lg border ${
                          isCurrent
                            ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40 font-semibold'
                            : 'bg-[#161b28] text-slate-300 border-[#232b3e]'
                        }`}
                      >
                        {meta ? meta.label : eff}
                      </span>
                    );
                  })}
                </div>
              </div>

              {capabilities.notes && (
                <div className="flex items-start gap-2 text-xs text-slate-400 bg-[#161b28]/60 border border-[#232b3e] rounded-xl p-3">
                  <Terminal className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{capabilities.notes}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
