import React, { useEffect } from 'react';
import { useRgbStore, NavigationTab } from './store/useRgbStore';
import { DashboardView } from './views/DashboardView';
import { DevicesView } from './views/DevicesView';
import { LightingEditorView } from './views/LightingEditorView';
import { SyncRgbView } from './views/SyncRgbView';
import { ProfilesView } from './views/ProfilesView';
import { CompatibilityMatrixView } from './views/CompatibilityMatrixView';
import { SettingsLogsView } from './views/SettingsLogsView';
import {
  LayoutDashboard,
  Cpu,
  Sliders,
  Zap,
  Layers,
  ShieldCheck,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';

const NAV_ITEMS: Array<{ id: NavigationTab; label: string; icon: React.FC<{ className?: string }> }> =
  [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'devices', label: 'Dispositivos', icon: Cpu },
    { id: 'editor', label: 'Editor de Iluminação', icon: Sliders },
    { id: 'sync', label: 'Sync RGB Global', icon: Zap },
    { id: 'profiles', label: 'Perfis Personalizados', icon: Layers },
    { id: 'compatibility', label: 'Matriz & Diagnóstico', icon: ShieldCheck },
    { id: 'settings', label: 'Configurações & Logs', icon: Settings },
  ];

export const App: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    initializeApp,
    statusBanner,
    clearBanner,
    devices,
    isAdmin,
  } = useRgbStore();

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  const activeRgbCount = devices.filter(
    (d) => d.capabilities.maxZones > 0 && d.state.enabled
  ).length;

  return (
    <div className="h-screen w-screen bg-[#090b10] text-slate-100 flex overflow-hidden">
      {/* Navegação Lateral (Sidebar) */}
      <aside className="w-64 bg-[#0d1018] border-r border-[#1d2436] flex flex-col justify-between shrink-0">
        <div>
          {/* Identidade Visual Própria */}
          <div className="p-5 border-b border-[#1d2436] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center shadow-neon-cyan">
              <Sparkles className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-wide text-slate-100">
                RGB CONTROL
              </h1>
              <span className="text-[11px] text-cyan-400 font-mono uppercase tracking-widest">
                Center v1.0
              </span>
            </div>
          </div>

          {/* Menu Lateral */}
          <nav className="p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/35 shadow-neon-cyan'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#141926] border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Rodapé de Status de Hardware */}
        <div className="p-4 m-3 rounded-xl bg-[#11151f] border border-[#232b3e] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Zonas Ativas</span>
            <span className="font-mono text-emerald-400 font-bold">{activeRgbCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Modo Processo</span>
            <span className={isAdmin ? 'text-emerald-300 font-medium' : 'text-amber-300 font-medium'}>
              {isAdmin ? 'Admin' : 'Padrão'}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 pt-1 border-t border-[#1d2436]">
            Gigabyte • Husky • Redragon • OpenRGB
          </div>
        </div>
      </aside>

      {/* Área Principal de Conteúdo */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Barra de Notificação / Feedback em Tempo Real */}
        {statusBanner && (
          <div
            className={`px-6 py-2.5 border-b flex items-center justify-between text-xs font-medium ${
              statusBanner.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                : statusBanner.type === 'warn'
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
                : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-200'
            }`}
          >
            <span>{statusBanner.text}</span>
            <button
              type="button"
              onClick={clearBanner}
              className="p-1 rounded hover:bg-black/20"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Conteúdo da Aba Selecionada */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'devices' && <DevicesView />}
          {activeTab === 'editor' && <LightingEditorView />}
          {activeTab === 'sync' && <SyncRgbView />}
          {activeTab === 'profiles' && <ProfilesView />}
          {activeTab === 'compatibility' && <CompatibilityMatrixView />}
          {activeTab === 'settings' && <SettingsLogsView />}
        </main>
      </div>
    </div>
  );
};
