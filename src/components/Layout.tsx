import React from 'react';
import { PriorityBadge } from './StatCard';
import type { AppState, Question, ReviewItem, ViewKey } from '../types';

interface LayoutProps {
  view: ViewKey;
  setView: (view: ViewKey) => void;
  state: AppState;
  children: React.ReactNode;
  recommendation: { disciplina: string; assunto: string; quantidade: number; prioridade: 'alta' | 'média' | 'baixa'; motivo: string; type: string };
  reviewItems: ReviewItem[];
}

const navItems: Array<{ key: ViewKey; label: string; subtitle: string }> = [
  { key: 'dashboard', label: 'Dashboard', subtitle: 'Resumo' },
  { key: 'disciplinas', label: 'Disciplinas', subtitle: 'Banco' },
  { key: 'train', label: 'Treinar', subtitle: 'Questões' },
  { key: 'caderno', label: 'Caderno', subtitle: 'Inteligente' },
  { key: 'review', label: 'Revisão', subtitle: 'Agenda' },
  { key: 'performance', label: 'Desempenho', subtitle: 'Estatísticas' },
  { key: 'prioridades', label: 'Prioridades', subtitle: 'Foco' },
  { key: 'historico', label: 'Histórico', subtitle: 'Respostas' },
  { key: 'simulado', label: 'Simulado', subtitle: 'Prova' },
  { key: 'sessoes', label: 'Sessões', subtitle: 'Treinos' },
  { key: 'settings', label: 'Configurações', subtitle: 'Dados' },
];

export function Layout({ view, setView, state, children, recommendation, reviewItems }: LayoutProps) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-4 lg:px-6">
        <aside className="hidden w-72 shrink-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-700 dark:bg-slate-900 lg:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">P</div>
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Estudos</p>
              <h1 className="text-xl font-bold">PMMA</h1>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setView(item.key)}
                className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition ${
                  view === item.key
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-100'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <span>
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="text-xs opacity-70">{item.subtitle}</span>
                </span>
              </button>
            ))}
          </nav>

          <div className="mt-8 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Próxima missão</p>
            <h3 className="mt-2 text-lg font-semibold">{recommendation.disciplina}</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{recommendation.assunto}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{recommendation.quantidade} questões</span>
              <PriorityBadge priority={recommendation.prioridade} />
            </div>
          </div>
        </aside>

        <main className="flex-1">
          <header className="mb-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-soft dark:border-slate-700 dark:bg-slate-900">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Ambiente de estudos</p>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{navItems.find((item) => item.key === view)?.label ?? 'Dashboard'}</h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span className="rounded-full bg-brand-50 px-2 py-1 text-brand-700 dark:bg-brand-950 dark:text-brand-200">{state.attempts.length} respostas</span>
            </div>
          </header>

          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1 px-2 py-2 text-center text-[11px]">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setView(item.key)}
              className={`rounded-xl px-1 py-2 ${view === item.key ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200' : 'text-slate-500 dark:text-slate-300'}`}
            >
              <div className="font-medium">{item.label}</div>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
