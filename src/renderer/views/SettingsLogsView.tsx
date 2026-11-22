import React from 'react';
import { useRgbStore } from '../store/useRgbStore';
import {
  Settings,
  Terminal,
  Trash2,
  Shield,
  Power,
  Keyboard,
} from 'lucide-react';

const SHORTCUT_PRESETS = [
  { value: 'CommandOrControl+Alt+P', label: 'Ctrl + Alt + P (Padrão)' },
  { value: 'CommandOrControl+Shift+P', label: 'Ctrl + Shift + P' },
  { value: 'CommandOrControl+Alt+L', label: 'Ctrl + Alt + L' },
  { value: 'F9', label: 'Tecla F9' },
  { value: 'F10', label: 'Tecla F10' },
];

export const SettingsLogsView: React.FC = () => {
  const { settings, logs, updateAppSettings, clearHardwareLogs } = useRgbStore();

  const toggleOption = (key: keyof typeof settings) => {
    updateAppSettings({ [key]: !settings[key] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100">
          Inicialização Automática, Segurança & Logs de Integração
        </h2>
        <p className="text-sm text-slate-400">
          Configurações do ciclo de vida no Windows, bandeja do sistema e auditoria de pacotes de hardware
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Opções de Inicialização e Bandeja do Sistema (Seção 4.6) */}
        <div className="lg:col-span-5 bg-[#11151f] border border-[#232b3e] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Comportamento no Windows e Inicialização
            </h3>
          </div>

          <div className="space-y-3">
            {(
              [
                {
                  key: 'startWithWindows',
                  title: 'Iniciar junto com o Windows',
                  desc: 'Registra o aplicativo na inicialização automática do usuário no Windows.',
                },
                {
                  key: 'applyLastProfileOnStartup',
                  title: 'Aplicar automaticamente o último perfil utilizado',
                  desc: 'Restaura o perfil ativo imediatamente ao iniciar a aplicação.',
                },
                {
                  key: 'runInBackground',
                  title: 'Executar em segundo plano',
                  desc: 'Mantém o serviço de sincronização e perfis ativo sem fechar o processo.',
                },
                {
                  key: 'minimizeToTray',
                  title: 'Minimizar para a bandeja do sistema (System Tray)',
                  desc: 'Ao fechar a janela, recolhe o aplicativo para a bandeja do Windows com menu rápido.',
                },
                {
                  key: 'restoreAfterReboot',
                  title: 'Restaurar configurações após reinicialização',
                  desc: 'Reaplica o estado persistido no SQLite para todos os dispositivos compatíveis.',
                },
                {
                  key: 'conflictProtectionEnabled',
                  title: 'Proteção contra conflitos de softwares oficiais',
                  desc: 'Bloqueia escritas simultâneas caso RGBFusion.exe, OemDrv.exe ou Central Husky estejam abertos.',
                },
              ] as const
            ).map((item) => {
              const checked = Boolean(settings[item.key]);
              return (
                <div
                  key={item.key}
                  className="p-3.5 rounded-xl bg-[#161b28] border border-[#232b3e] flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-100">{item.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{item.desc}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleOption(item.key)}
                    className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 ${
                      checked ? 'bg-cyan-500' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        checked ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Atalho Global para Troca de Perfil LED */}
          <div className="pt-3 border-t border-[#1e2638] space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
              Atalho Global para Troca de Perfil LED (Segundo Plano)
            </div>
            <p className="text-[11px] text-slate-400">
              Alterna entre perfis mesmo com o aplicativo minimizado na bandeja. Também disponível{' '}
              <code className="text-cyan-300">Ctrl+Alt+1..5</code> para acesso direto.
            </p>
            <select
              value={settings.profileSwitchShortcut || 'CommandOrControl+Alt+P'}
              onChange={(e) => updateAppSettings({ profileSwitchShortcut: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#090b10] border border-[#232b3e] text-xs font-mono text-slate-200"
            >
              {SHORTCUT_PRESETS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Configuração da Ponte OpenRGB SDK */}
          <div className="pt-3 border-t border-[#1e2638] space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Power className="w-3.5 h-3.5 text-purple-400" />
              Endpoint do Servidor OpenRGB SDK (Opcional)
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={settings.openRgbHost}
                onChange={(e) => updateAppSettings({ openRgbHost: e.target.value })}
                className="col-span-2 px-3 py-1.5 rounded-lg bg-[#090b10] border border-[#232b3e] text-xs font-mono text-slate-200"
                placeholder="127.0.0.1"
              />
              <input
                type="number"
                value={settings.openRgbPort}
                onChange={(e) => updateAppSettings({ openRgbPort: Number(e.target.value) })}
                className="px-3 py-1.5 rounded-lg bg-[#090b10] border border-[#232b3e] text-xs font-mono text-slate-200"
                placeholder="6742"
              />
            </div>
          </div>
        </div>

        {/* Console de Logs de Comunicação e Segurança (Seção 8) */}
        <div className="lg:col-span-7 bg-[#11151f] border border-[#232b3e] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  Registros de Integração, Checksums HID e Segurança ({logs.length})
                </h3>
              </div>

              <button
                type="button"
                onClick={() => clearHardwareLogs()}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#161b28] hover:bg-[#1e2536] text-slate-300 border border-[#232b3e] text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar Logs
              </button>
            </div>

            <div className="bg-[#090b10] border border-[#1d2436] rounded-xl p-3 h-[460px] overflow-y-auto font-mono text-xs space-y-2">
              {logs.length === 0 ? (
                <div className="text-slate-500 text-center py-12">
                  Nenhum evento registrado ainda.
                </div>
              ) : (
                logs.map((entry) => {
                  const badgeColor =
                    entry.level === 'error'
                      ? 'text-rose-400 border-rose-500/30 bg-rose-500/10'
                      : entry.level === 'warn'
                      ? 'text-amber-300 border-amber-500/30 bg-amber-500/10'
                      : entry.level === 'security'
                      ? 'text-purple-300 border-purple-500/30 bg-purple-500/10'
                      : 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10';
                  return (
                    <div
                      key={entry.id}
                      className="p-2.5 rounded-lg bg-[#11151f] border border-[#1d2436] space-y-1"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${badgeColor}`}
                          >
                            {entry.level}
                          </span>
                          <span className="text-slate-300 font-semibold">[{entry.provider}]</span>
                          <span className="text-slate-400">{entry.operation}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {new Date(entry.timestamp).toLocaleTimeString('pt-BR')}
                        </span>
                      </div>
                      <div className="text-slate-200">{entry.message}</div>
                      {entry.details && (
                        <div className="text-[11px] text-slate-400 bg-black/40 px-2 py-1 rounded">
                          {entry.details}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1e2638] flex items-center gap-2 text-xs text-slate-400">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Todos os pacotes HID passam pelo <code className="text-slate-200">HardwareSafetyValidator</code> (validação de tamanho 64B/17B, endereço EEPROM e checksum antes da transmissão).
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
