import React from 'react';
import { useRgbStore } from '../store/useRgbStore';
import { CompatibilityBadge } from './DashboardView';
import {
  ShieldCheck,
  AlertTriangle,
  Cpu,
  RefreshCw,
} from 'lucide-react';

export const CompatibilityMatrixView: React.FC = () => {
  const { compatibilityMatrix, conflicts, isAdmin, refreshDiagnostics, requestAdminElevation } =
    useRgbStore();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">
            Diagnóstico de Hardware & Matriz de Compatibilidade (Fase 1)
          </h2>
          <p className="text-sm text-slate-400">
            Mapeamento real dos controladores USB HID, SMBus onboard, SDK OpenRGB e verificação de conflitos de processos
          </p>
        </div>

        <button
          type="button"
          onClick={() => refreshDiagnostics()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#161b28] hover:bg-[#1e2536] text-slate-200 border border-[#232b3e] text-xs font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar Diagnóstico
        </button>
      </div>

      {/* Status de Conflitos e Privilégios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#11151f] border border-[#232b3e] rounded-2xl p-5 flex items-start gap-3.5">
          {conflicts.hasConflicts ? (
            <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              {conflicts.hasConflicts
                ? `${conflicts.processes.length} Conflito(s) de Software Oficial Detectado(s)`
                : 'Zero Conflitos de Processos RGB em Execução'}
            </h3>
            {conflicts.hasConflicts ? (
              <ul className="mt-2 space-y-1 text-xs text-rose-300">
                {conflicts.processes.map((p) => (
                  <li key={p.pid}>
                    • <strong>{p.name}</strong> (PID {p.pid}): {p.recommendation}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400 mt-1">
                Nenhum processo conflitante (RGBFusion.exe, OemDrv.exe, Central de Controle Husky.exe, SignalRGB) está disputando os barramentos HID/SMBus.
              </p>
            )}
          </div>
        </div>

        <div className="bg-[#11151f] border border-[#232b3e] rounded-2xl p-5 flex items-start justify-between gap-3.5">
          <div className="flex items-start gap-3.5">
            <Cpu className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Nível de Privilégio do Processo: {isAdmin ? 'Administrador (Elevado)' : 'Usuário Padrão'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Teclado Husky (HID 0xFF1C) e Mouse Redragon (HID 0xFF02) operam em modo usuário. A placa-mãe Gigabyte B450M GAMING exige Administrador para abrir o driver kernel SMBus <code className="text-slate-300">GVCIDrv64.sys</code>.
              </p>
            </div>
          </div>
          {!isAdmin && (
            <button
              type="button"
              onClick={() => requestAdminElevation()}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-semibold shrink-0"
            >
              Elevar UAC
            </button>
          )}
        </div>
      </div>

      {/* Tabela da Matriz de Compatibilidade */}
      <div className="bg-[#11151f] border border-[#232b3e] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#232b3e] bg-[#161b28]/60 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">Componente / Modelo</th>
                <th className="py-3.5 px-4">VID / PID / Endereço</th>
                <th className="py-3.5 px-4">Protocolo Nativo</th>
                <th className="py-3.5 px-4">Diagnóstico OpenRGB</th>
                <th className="py-3.5 px-4">Status no App</th>
                <th className="py-3.5 px-4">Notas Técnicas de Engenharia Reversa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2638] text-xs">
              {compatibilityMatrix.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#161b28]/40">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-100">{row.component}</div>
                    <div className="text-slate-400">
                      {row.manufacturer} — <span className="text-cyan-300">{row.model}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">{row.vidPid}</td>
                  <td className="py-3.5 px-4 text-slate-300">{row.interfaceProtocol}</td>
                  <td className="py-3.5 px-4 text-slate-400">{row.openRgbSupport}</td>
                  <td className="py-3.5 px-4">
                    <CompatibilityBadge status={row.nativeProviderStatus} />
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 max-w-md">{row.technicalNotes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
