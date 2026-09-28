import { useMemo, useState } from 'react';
import { PriorityBadge, QuestionCard, SectionHeader, StatCard } from './StatCard';
import type { Question, ViewKey } from '../types';

interface DashboardPageProps {
  stats: {
    respondidas: number;
    acertos: number;
    erros: number;
    percentual: number;
    naoRespondidas: number;
    paraRevisao: number;
    errosRecentes: number;
    melhorDisciplina: string;
    piorDisciplina: string;
    sequenciaAtual: number;
    respondidasHoje: number;
    tempoMedio: number;
  };
  recommendation: { disciplina: string; assunto: string; quantidade: number; prioridade: 'alta' | 'média' | 'baixa'; motivo: string };
  reviewItems: Array<{ disciplina: string; assunto: string; data: string; erros: number; ultimaResposta: 'CERTO' | 'ERRADO' | null; prioridade: 'alta' | 'média' | 'baixa'; questionId: string };
  setView: (view: ViewKey) => void;
  startTraining: (filters?: { disciplina?: string; assunto?: string; quantidade?: number }) => void;
}

export function DashboardPage({ stats, recommendation, reviewItems, setView, startTraining }: DashboardPageProps) {
  const nextPriority = useMemo(() => reviewItems.slice(0, 3), [reviewItems]);

  return (
    <div className="space-y-6 pb-28">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Questões respondidas" value={stats.respondidas} tone="primary" helper="total de registros" />
        <StatCard label="Acertos" value={stats.acertos} tone="success" helper="respostas corretas" />
        <StatCard label="Erros" value={stats.erros} tone="danger" helper="respostas erradas" />
        <StatCard label="Aproveitamento" value={`${stats.percentual}%`} tone="warning" helper="média geral" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card">
          <SectionHeader title="Próxima missão" right={<PriorityBadge priority={recommendation.prioridade} />} />
          <div className="space-y-3">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{recommendation.disciplina}</p>
            <p className="text-base text-slate-700 dark:text-slate-200">{recommendation.assunto}</p>
            <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
              <span>{recommendation.quantidade} questões</span>
              <span>{recommendation.motivo}</span>
            </div>
            <button
              type="button"
              onClick={() => startTraining({ disciplina: recommendation.disciplina, quantidade: recommendation.quantidade })}
              className="mt-3 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Começar treino
            </button>
          </div>
        </div>

        <div className="card">
          <SectionHeader title="Prioridades de hoje" />
          <div className="space-y-3">
            {nextPriority.length ? (
              nextPriority.map((item) => (
                <div key={item.questionId} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{item.disciplina}</p>
                    <PriorityBadge priority={item.prioridade} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.assunto}</p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Última resposta: {item.ultimaResposta ?? '—'}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma prioridade urgente no momento.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Não respondidas" value={stats.naoRespondidas} tone="primary" helper="questões em aberto" />
        <StatCard label="Para revisão" value={stats.paraRevisao} tone="warning" helper="itens pendentes" />
        <StatCard label="Erros recentes" value={stats.errosRecentes} tone="danger" helper="últimos 7 dias" />
        <StatCard label="Sequência atual" value={`${stats.sequenciaAtual}x`} tone="success" helper="acertos seguidos" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <SectionHeader title="Resumo rápido" />
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li>Melhor disciplina: <span className="font-semibold text-slate-800 dark:text-slate-100">{stats.melhorDisciplina}</span></li>
            <li>Menor aproveitamento: <span className="font-semibold text-slate-800 dark:text-slate-100">{stats.piorDisciplina}</span></li>
            <li>Respondidas hoje: <span className="font-semibold text-slate-800 dark:text-slate-100">{stats.respondidasHoje}</span></li>
            <li>Tempo médio por questão: <span className="font-semibold text-slate-800 dark:text-slate-100">{stats.tempoMedio}s</span></li>
          </ul>
        </div>

        <div className="card">
          <SectionHeader title="Atenção" />
          <div className="space-y-3">
            <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Acertos x erros</p>
              <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div className="h-full bg-emerald-500" style={{ width: `${stats.percentual}%` }} />
                <div className="h-full bg-rose-500" style={{ width: `${100 - stats.percentual}%` }} />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setView('performance')}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Ver desempenho detalhado
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TrainPageProps {
  questions: Question[];
  startTraining: (filters?: { disciplina?: string; assunto?: string; quantidade?: number }) => void;
  currentQuestion: Question | null;
  index: number;
  total: number;
  selectedAnswer: 'CERTO' | 'ERRADO' | null;
  answerConfirmed: boolean;
  onAnswer: (answer: 'CERTO' | 'ERRADO') => void;
  onToggleMark: (mark: 'favorita' | 'revisar' | 'pegadinha' | 'dificil') => void;
  marks: Record<string, { favorita?: boolean; revisar?: boolean; pegadinha?: boolean; dificil?: boolean }>;
  nextQuestion: () => void;
  disciplines: string[];
}

export function TrainPage({
  questions,
  startTraining,
  currentQuestion,
  index,
  total,
  selectedAnswer,
  answerConfirmed,
  onAnswer,
  onToggleMark,
  marks,
  nextQuestion,
  disciplines,
}: TrainPageProps) {
  const [disciplina, setDisciplina] = useState('');
  const [quantidade, setQuantidade] = useState(10);

  if (!currentQuestion) {
    return (
      <div className="space-y-6 pb-28">
        <div className="card space-y-4">
          <SectionHeader title="Seleção de treino" />
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
              <span>Disciplina</span>
              <select value={disciplina} onChange={(event) => setDisciplina(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <option value="">Todas</option>
                {disciplines.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
              <span>Quantidade</span>
              <select value={quantidade} onChange={(event) => setQuantidade(Number(event.target.value))} className="w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                {[5, 10, 15, 20, 30, 50, 100].map((qtd) => (
                  <option key={qtd} value={qtd}>{qtd}</option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button type="button" onClick={() => startTraining({ disciplina: disciplina || undefined, quantidade })} className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700">
                Iniciar treino
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <SectionHeader title="Treino recomendado" />
          <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-600">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-100">História do Maranhão</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">15 questões • Prioridade: alta</p>
            </div>
            <button type="button" onClick={() => startTraining({ disciplina: 'História do Maranhão', quantidade: 15 })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium dark:border-slate-700">
              Começar
            </button>
          </div>
        </div>

        <div className="card">
          <SectionHeader title="Banco atual" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {questions.slice(0, 6).map((question) => (
              <div key={question.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="font-medium text-slate-800 dark:text-slate-100">{question.disciplina}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{question.assunto}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      <QuestionCard
        question={currentQuestion}
        index={index + 1}
        total={total}
        selectedAnswer={selectedAnswer}
        answerConfirmed={answerConfirmed}
        onAnswer={onAnswer}
        onToggleMark={onToggleMark}
        currentMark={marks[currentQuestion.id]}
      />

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={nextQuestion} className="rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700">
          {index < total - 1 ? 'Próxima questão' : 'Finalizar treino'}
        </button>
        <button type="button" className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium dark:border-slate-700">
          Revisar comentário
        </button>
        <button type="button" className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium dark:border-slate-700">
          Ver fundamento
        </button>
      </div>
    </div>
  );
}

interface CadernoPageProps {
  items: Array<{ disciplina: string; assunto: string; data: string; erros: number; ultimaResposta: 'CERTO' | 'ERRADO' | null; proximaRevisao: string; prioridade: 'alta' | 'média' | 'baixa'; questionId: string }>;
}

export function CadernoPage({ items }: CadernoPageProps) {
  return (
    <div className="space-y-5 pb-28">
      <div className="card">
        <SectionHeader title="Caderno Inteligente" />
        <div className="space-y-3">
          {items.length ? (
            items.map((item) => (
              <div key={item.questionId} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{item.disciplina}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{item.assunto}</p>
                  </div>
                  <PriorityBadge priority={item.prioridade} />
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-3">
                  <span>Data do erro: {item.data}</span>
                  <span>Vezes: {item.erros}</span>
                  <span>Última resposta: {item.ultimaResposta ?? '—'}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Próxima revisão: {item.proximaRevisao}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma questão em análise no caderno inteligente.</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface PerformancePageProps {
  attempts: Array<{ disciplina: string; assunto: string; acertou: boolean; data: string; tempoGasto: number }>; 
}

export function PerformancePage({ attempts }: PerformancePageProps) {
  const countByDiscipline = new Map<string, number>();
  const acertos = new Map<string, number>();

  for (const attempt of attempts) {
    countByDiscipline.set(attempt.disciplina, (countByDiscipline.get(attempt.disciplina) ?? 0) + 1);
    if (attempt.acertou) {
      acertos.set(attempt.disciplina, (acertos.get(attempt.disciplina) ?? 0) + 1);
    }
  }

  const data = [...countByDiscipline.entries()].map(([discipline, total]) => ({
    discipline,
    total,
    percent: Math.round(((acertos.get(discipline) ?? 0) / Math.max(1, total)) * 100),
  }));

  return (
    <div className="space-y-6 pb-28">
      <div className="card">
        <SectionHeader title="Desempenho" />
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Total" value={attempts.length} tone="primary" />
          <StatCard label="Acertos" value={attempts.filter((item) => item.acertou).length} tone="success" />
          <StatCard label="Erros" value={attempts.filter((item) => !item.acertou).length} tone="danger" />
        </div>
      </div>

      <div className="card">
        <SectionHeader title="Desempenho por disciplina" />
        <div className="space-y-3">
          {data.map((item) => (
            <div key={item.discipline}>
              <div className="mb-1 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>{item.discipline}</span>
                <span>{item.percent}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${item.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface SettingsPageProps {
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
}

export function SettingsPage({ theme, onThemeToggle, onExport, onImport, onReset }: SettingsPageProps) {
  return (
    <div className="space-y-6 pb-28">
      <div className="card space-y-4">
        <SectionHeader title="Configurações" />
        <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">Modo escuro</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Salvar preferência no navegador</p>
          </div>
          <button type="button" onClick={onThemeToggle} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900">
            {theme === 'dark' ? 'Claro' : 'Escuro'}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <button type="button" onClick={onExport} className="rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700">
            Exportar meus dados
          </button>
          <label className="cursor-pointer rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-medium dark:border-slate-700">
            Importar dados
            <input type="file" accept="application/json" className="hidden" onChange={(event) => event.target.files?.[0] && onImport(event.target.files[0])} />
          </label>
          <button type="button" onClick={onReset} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">
            Resetar app
          </button>
        </div>
      </div>
    </div>
  );
}

interface SimuladoPageProps {
  currentQuestion: Question | null;
  currentIndex: number;
  total: number;
  onAnswer: (answer: 'CERTO' | 'ERRADO') => void;
  onFinish: () => void;
}

export function SimuladoPage({ currentQuestion, currentIndex, total, onAnswer, onFinish }: SimuladoPageProps) {
  if (!currentQuestion) {
    return (
      <div className="card pb-28">
        <SectionHeader title="Modo simulado" />
        <p className="text-sm text-slate-600 dark:text-slate-300">Nenhuma sessão ativa. Selecione uma disciplina e quantidade para começar.</p>
        <button type="button" onClick={onFinish} className="mt-4 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700">
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-28">
      <QuestionCard question={currentQuestion} index={currentIndex + 1} total={total} onAnswer={onAnswer} />
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onFinish} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium dark:border-slate-700">
          Finalizar simulado
        </button>
      </div>
    </div>
  );
}
