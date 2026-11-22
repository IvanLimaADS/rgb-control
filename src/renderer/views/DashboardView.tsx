import React from 'react';
import { useRgbStore } from '../store/useRgbStore';
import { AmbientRigVisualizer } from '../components/AmbientRigVisualizer';
import { hexToRgb, rgbToHex } from '../../utils/color';
import { EFFECT_CATALOG } from '../../effects/EffectEngine';
import {
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  XCircle,
  Power,
  Sliders,
  RefreshCw,
  Layers,
  Zap,
  Cpu,
  Keyboard,
  Mouse,
  Headphones,
  Radio,
} from 'lucide-react';
import { CompatibilityStatus, DeviceCategory } from '../../shared/types';

export const CategoryIcon: React.FC<{ category: DeviceCategory; className?: string }> = ({
  category,
  className = 'w-5 h-5',
}) => {
  switch (category) {
    case 'motherboard':
      return <Cpu className={className} />;
    case 'keyboard':
      return <Keyboard className={className} />;
    case 'mouse':
      return <Mouse className={className} />;
    case 'headset':
      return <Headphones className={className} />;
    case 'receiver':
      return <Radio className={className} />;
    default:
      return <Zap className={className} />;
  }
};

export const CompatibilityBadge: React.FC<{ status: CompatibilityStatus }> = ({ status }) => {
  switch (status) {
    case 'compatible':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Compatível (Nativo)
        </span>
      );
    case 'admin_required':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
          <ShieldAlert className="w-3.5 h-3.5" />
          Requer Administrador (SMBus)
        </span>
      );
    case 'conflict_detected':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-medium">
          <AlertTriangle className="w-3.5 h-3.5" />
          Conflito de Software Oficial
        </span>
      );
    case 'sdk_offline':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-500/15 text-slate-300 border border-slate-500/30 font-medium">
          <AlertTriangle className="w-3.5 h-3.5" />
          Servidor SDK Offline
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-700/40 text-slate-400 border border-slate-600/40 font-medium">
          <XCircle className="w-3.5 h-3.5" />
          Sem Suporte RGB
        </span>
      );
  }
};

export const DashboardView: React.FC = () => {
  const {
    devices,
    profiles,
    settings,
    selectedDeviceId,
    selectDeviceForEditor,
    toggleDevicePower,
    updateDeviceColor,
    applyProfile,
    refreshDiscovery,
    setActiveTab,
  } = useRgbStore();

  const rgbCapableDevices = devices.filter((d) => d.capabilities.maxZones > 0);
  const compatibleCount = devices.filter(
    (d) => d.info.compatibility === 'compatible' || d.info.compatibility === 'admin_required'
  ).length;

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Resumo Rápido */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Dashboard do Ecossistema RGB</h2>
          <p className="text-sm text-slate-400">
            Monitoramento centralizado de barramentos USB HID, SMBus onboard e ponte OpenRGB SDK
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-sm font-medium transition-colors"
          >
            <Zap className="w-4 h-4" />
            Sincronização Global (Sync RGB)
          </button>
          <button
            type="button"
            onClick={() => refreshDiscovery()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#161b28] hover:bg-[#1e2536] text-slate-200 border border-[#232b3e] text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reescanear Hardware
          </button>
        </div>
      </div>

      {/* Indicadores do Ambiente */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#11151f] border border-[#232b3e] rounded-2xl p-4">
          <span className="text-xs text-slate-400 uppercase tracking-wider">
            Dispositivos Detectados
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-100">{devices.length}</span>
            <span className="text-xs text-cyan-400">{rgbCapableDevices.length} com zonas RGB</span>
          </div>
        </div>

        <div className="bg-[#11151f] border border-[#232b3e] rounded-2xl p-4">
          <span className="text-xs text-slate-400 uppercase tracking-wider">
            Controladores Integrados
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-400">{compatibleCount}</span>
            <span className="text-xs text-slate-400">Husky + Redragon + Gigabyte</span>
          </div>
        </div>

        <div className="bg-[#11151f] border border-[#232b3e] rounded-2xl p-4">
          <span className="text-xs text-slate-400 uppercase tracking-wider">Perfil Ativo</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-bold text-purple-300 truncate">
              {profiles.find((p) => p.id === settings.lastActiveProfileId)?.name || 'Personalizado'}
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('profiles')}
              className="text-xs text-cyan-400 hover:underline"
            >
              Trocar
            </button>
          </div>
        </div>

        <div className="bg-[#11151f] border border-[#232b3e] rounded-2xl p-4">
          <span className="text-xs text-slate-400 uppercase tracking-wider">
            Proteção de Conflitos
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-bold text-emerald-400">Ativa (Mutex HID)</span>
            <span className="text-xs text-slate-400">Validação CRC 0x55 / 16b</span>
          </div>
        </div>
      </div>

      {/* Preview Visual em Tempo Real */}
      <AmbientRigVisualizer
        devices={devices}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={(id) => selectDeviceForEditor(id, true)}
      />

      {/* Atalhos Rápidos de Perfis */}
      <div className="bg-[#11151f] border border-[#232b3e] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Layers className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-slate-200">Aplicar Perfil Rápido:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {profiles.map((profile) => {
            const isActive = settings.lastActiveProfileId === profile.id;
            return (
              <button
                key={profile.id}
                type="button"
                onClick={() => applyProfile(profile.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50 shadow-neon-cyan'
                    : 'bg-[#161b28] hover:bg-[#1e2536] text-slate-300 border-[#232b3e]'
                }`}
              >
                {profile.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de Cards Individuais dos Dispositivos */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Dispositivos e Interfaces Identificados no Computador
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {devices.map((dev) => {
            const { info, state, capabilities } = dev;
            const hex = rgbToHex(state.primaryColor);
            const effectInfo = EFFECT_CATALOG[state.effect] || EFFECT_CATALOG.static;
            const canControl =
              info.compatibility === 'compatible' || info.compatibility === 'admin_required';

            return (
              <div
                key={info.id}
                className="bg-[#11151f] border border-[#232b3e] rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        style={{
                          backgroundColor: state.enabled && canControl ? `${hex}22` : '#161b28',
                          borderColor: state.enabled && canControl ? hex : '#232b3e',
                        }}
                        className="w-10 h-10 rounded-xl border flex items-center justify-center text-slate-100 shrink-0"
                      >
                        <CategoryIcon category={info.category} className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-100 leading-snug">
                          {info.name}
                        </h4>
                        <p className="text-xs text-slate-400">
                          {info.manufacturer} • <span className="text-slate-300">{info.model}</span>
                        </p>
                      </div>
                    </div>

                    {capabilities.maxZones > 0 && (
                      <button
                        type="button"
                        title={state.enabled ? 'Desativar iluminação' : 'Ativar iluminação'}
                        onClick={() => toggleDevicePower(info.id, !state.enabled)}
                        className={`p-2 rounded-lg border transition-colors ${
                          state.enabled
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                            : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <CompatibilityBadge status={info.compatibility} />
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full border ${
                        info.connected
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                      }`}
                    >
                      {info.connected ? 'Conectado' : 'Desconectado'}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                    {info.compatibilityMessage}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#1e2638] space-y-3">
                  {capabilities.maxZones > 0 && canControl && (
                    <div className="flex items-center justify-between gap-2 bg-[#161b28] border border-[#232b3e] rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          title="Mudar cor deste dispositivo"
                          value={hex}
                          onChange={(e) =>
                            updateDeviceColor(info.id, hexToRgb(e.target.value))
                          }
                          className="w-7 h-7 rounded cursor-pointer bg-transparent border border-white/20"
                        />
                        <span className="text-xs text-slate-300 font-mono">{hex}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {['#00F0FF', '#7C3AED', '#FF0040', '#10B981', '#FF6E14'].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            title={`Aplicar cor ${preset}`}
                            onClick={() => updateDeviceColor(info.id, hexToRgb(preset))}
                            style={{ backgroundColor: preset }}
                            className="w-4 h-4 rounded-full border border-white/30 hover:scale-125 transition-transform cursor-pointer"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    {capabilities.maxZones > 0 ? (
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <span
                          style={{ backgroundColor: state.enabled ? hex : '#334155' }}
                          className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                        />
                        <span>
                          Efeito: <strong className="text-slate-100">{effectInfo.label}</strong>
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">Periférico sem LEDs RGB</span>
                    )}

                    {capabilities.maxZones > 0 && (
                      <button
                        type="button"
                        onClick={() => selectDeviceForEditor(info.id, true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        Editor Completo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
