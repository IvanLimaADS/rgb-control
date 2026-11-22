import React, { useState } from 'react';
import { useRgbStore } from '../store/useRgbStore';
import { rgbToHex } from '../../utils/color';
import { EFFECT_CATALOG } from '../../effects/EffectEngine';
import {
  Plus,
  Play,
  Copy,
  Trash2,
  Save,
  Layers,
  CheckCircle2,
  Keyboard,
} from 'lucide-react';

export const ProfilesView: React.FC = () => {
  const {
    profiles,
    settings,
    applyProfile,
    createNewProfile,
    saveCurrentToProfile,
    duplicateProfile,
    deleteProfile,
  } = useRgbStore();

  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await createNewProfile(newName, newDesc);
    setNewName('');
    setNewDesc('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Perfis Personalizados de Iluminação</h2>
          <p className="text-sm text-slate-400">
            Crie, edite, duplique, exclua e aplique perfis completos persistidos em banco SQLite local
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#11151f] border border-cyan-500/30 text-xs text-slate-300">
          <Keyboard className="w-4 h-4 text-cyan-400" />
          <span>
            Atalho global:{' '}
            <code className="text-cyan-300 font-mono">
              {(settings.profileSwitchShortcut || 'CommandOrControl+Alt+P').replace(
                /CommandOrControl/g,
                'Ctrl'
              )}
            </code>{' '}
            (ou <code className="text-purple-300 font-mono">Ctrl+Alt+1..5</code>)
          </span>
        </div>
      </div>

      {/* Formulário para Salvar Estado Atual como Novo Perfil */}
      <form
        onSubmit={handleCreate}
        className="bg-[#11151f] border border-[#232b3e] rounded-2xl p-5 flex flex-wrap items-end gap-4"
      >
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            Nome do Novo Perfil
          </label>
          <input
            type="text"
            placeholder="Ex: Cyberpunk Stream, competitivo CS2..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-[#090b10] border border-[#232b3e] text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex-[2] min-w-[260px]">
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            Descrição do Perfil
          </label>
          <input
            type="text"
            placeholder="Descreva a combinação de cores e efeitos deste perfil..."
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-[#090b10] border border-[#232b3e] text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 text-xs font-semibold transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Salvar Estado Atual como Novo Perfil
        </button>
      </form>

      {/* Grid de Perfis */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {profiles.map((profile) => {
          const isActive = settings.lastActiveProfileId === profile.id;
          const devEntries = Object.entries(profile.deviceStates || {});

          return (
            <div
              key={profile.id}
              className={`bg-[#11151f] rounded-2xl p-5 border flex flex-col justify-between transition-all ${
                isActive
                  ? 'border-cyan-400/60 shadow-neon-cyan'
                  : 'border-[#232b3e] hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-100">{profile.name}</h3>
                        {profile.isBuiltIn && (
                          <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            Padrão
                          </span>
                        )}
                      </div>
                      {isActive && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-cyan-300 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Perfil Ativo
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  {profile.description}
                </p>

                {/* Resumo das Cores por Dispositivo no Perfil */}
                <div className="mt-4 space-y-1.5 bg-[#0d1018] border border-[#1d2436] rounded-xl p-3">
                  {devEntries.slice(0, 3).map(([devId, st]) => {
                    const hex = rgbToHex(st.primaryColor);
                    const effLabel = EFFECT_CATALOG[st.effect]?.label || st.effect;
                    const shortName = devId.includes('husky')
                      ? 'Teclado Husky TG200'
                      : devId.includes('redragon')
                      ? 'Mouse Redragon M719'
                      : devId.includes('gigabyte')
                      ? 'Placa Gigabyte B450M'
                      : devId;
                    return (
                      <div
                        key={devId}
                        className="flex items-center justify-between text-[11px] text-slate-300"
                      >
                        <span className="truncate">{shortName}</span>
                        <div className="flex items-center gap-1.5">
                          <span>{effLabel}</span>
                          <span
                            style={{ backgroundColor: st.enabled ? hex : '#334155' }}
                            className="w-3 h-3 rounded-full border border-white/20"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ações do Perfil */}
              <div className="mt-4 pt-3 border-t border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => applyProfile(profile.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 text-xs font-semibold transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  Aplicar Perfil
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    title="Atualizar perfil com as cores atuais"
                    onClick={() => saveCurrentToProfile(profile.id)}
                    className="p-1.5 rounded-lg bg-[#161b28] hover:bg-[#1e2536] text-slate-300 border border-[#232b3e]"
                  >
                    <Save className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Duplicar perfil"
                    onClick={() => duplicateProfile(profile.id)}
                    className="p-1.5 rounded-lg bg-[#161b28] hover:bg-[#1e2536] text-slate-300 border border-[#232b3e]"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {!profile.isBuiltIn && (
                    <button
                      type="button"
                      title="Excluir perfil"
                      onClick={() => deleteProfile(profile.id)}
                      className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
