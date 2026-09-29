import React, { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { PriorityBadge, QuestionCard, SectionHeader, StatCard } from './components/StatCard';
import { calculateDailyPerformance, calculatePerformance } from './algorithms/performanceAlgorithm';
import { calculateCebraspeScore } from './algorithms/cebraspeAlgorithm';
import { calculateTagPerformance } from './algorithms/tagPerformanceAlgorithm';
import type { ExportKind } from './services/importExportService';
import { useStudyApp } from './hooks/useStudyApp';
import type { AnswerValue, Question, ViewKey, AnswerRecord, Recommendation, UserSettings, NotebookCategory, NotebookItem } from './types';

interface DashboardPageProps {
  stats: {
    respondidas: number;
    acertos: number;
    erros: number;
    emBranco: number;
    avaliadas: number;
    percentual: number;
    naoRespondidas: number;
    paraRevisao: number;
    errosRecentes: number;
    melhorDisciplina: string;
    piorDisciplina: string;
    sequenciaAtual: number;
    respondidasHoje: number;
    tempoMedio: number;
    metaDiaria: number;
    progressoDiario: number;
  };
  recommendation: Recommendation;
  reviewItems: Array<{ disciplina: string; assunto: string; data: string; erros: number; ultimaResposta: 'CERTO' | 'ERRADO' | null; prioridade: 'alta' | 'média' | 'baixa'; questionId: string }>
  setView: (view: ViewKey) => void;
  startTraining: (filters?: { disciplina?: string; assunto?: string; priorityTopic?: string; quantidade?: number; mode?: Recommendation['mode'] }) => void;
  sessions: Array<{ id: string; startedAt: string; mode: string; answered: number; correct: number; wrong: number; blank: number; accuracy?: number }>;
}

export function DashboardPage({ stats, recommendation, reviewItems, setView, startTraining, sessions }: DashboardPageProps) {
  const nextPriority = React.useMemo(() => reviewItems.slice(0, 3), [reviewItems]);

  return (
    <div className="space-y-6 pb-28">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Questões respondidas" value={stats.respondidas} tone="primary" helper="total de registros" />
        <StatCard label="Acertos" value={stats.acertos} tone="success" helper="respostas corretas" />
        <StatCard label="Erros" value={stats.erros} tone="danger" helper="respostas erradas" />
        <StatCard label="Em branco" value={stats.emBranco} tone="warning" helper="itens sem resposta" />
        <StatCard label="Aproveitamento" value={`${stats.percentual}%`} tone="warning" helper={stats.avaliadas < 5 ? `${stats.acertos}/${stats.avaliadas} avaliadas; amostra pequena` : `${stats.acertos}/${stats.avaliadas} avaliadas`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card">
          <SectionHeader title="Próxima missão" right={<PriorityBadge priority={recommendation.prioridade} />} />
          <div className="space-y-3">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{recommendation.disciplina}</p>
            <p className="text-base text-slate-700 dark:text-slate-200">{recommendation.assunto}</p>
            <div className="flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span>{recommendation.quantidade} questões</span>
              <span className="text-xs italic">{recommendation.motivo}</span>
            </div>
            <button
              type="button"
              onClick={() => startTraining({ disciplina: recommendation.disciplina || undefined, assunto: recommendation.mode === 'ERROS' || recommendation.mode === 'REVISAO' ? undefined : recommendation.assunto === 'Questões não vistas' ? undefined : recommendation.assunto, priorityTopic: recommendation.mode === 'ERROS' ? recommendation.assunto : undefined, quantidade: recommendation.quantidade, mode: recommendation.mode })}
              disabled={!recommendation.quantidade}
              className="mt-3 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition"
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
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{item.disciplina}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 truncate">{item.assunto}</p>
                    </div>
                    <PriorityBadge priority={item.prioridade} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma prioridade urgente.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Não respondidas" value={stats.naoRespondidas} tone="primary" helper="questões em aberto" />
        <StatCard label="Para revisão" value={stats.paraRevisao} tone="warning" helper="itens com erros" />
        <StatCard label="Erros recentes" value={stats.errosRecentes} tone="danger" helper="últimos 7 dias" />
        <StatCard label="Sequência atual" value={`${stats.sequenciaAtual}x`} tone="success" helper="acertos seguidos" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <SectionHeader title="Meta diária" />
          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
            <span>{Math.min(stats.progressoDiario, stats.metaDiaria)}/{stats.metaDiaria} questões</span>
            <span>{Math.round(Math.min(1, stats.progressoDiario / Math.max(1, stats.metaDiaria)) * 100)}%</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full bg-brand-500" style={{ width: `${Math.min(100, stats.progressoDiario / Math.max(1, stats.metaDiaria) * 100)}%` }} /></div>
        </div>
        <div className="card">
          <SectionHeader title="Resumo rápido" />
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li>Melhor: <span className="font-semibold text-slate-800 dark:text-slate-100">{stats.melhorDisciplina}</span></li>
            <li>Menor aproveitamento: <span className="font-semibold text-slate-800 dark:text-slate-100">{stats.piorDisciplina}</span></li>
            <li>Respondidas hoje: <span className="font-semibold text-slate-800 dark:text-slate-100">{stats.respondidasHoje}</span></li>
            <li>Tempo médio: <span className="font-semibold text-slate-800 dark:text-slate-100">{stats.tempoMedio}s</span></li>
          </ul>
        </div>

        <div className="card">
          <SectionHeader title="Acertos x Erros" />
          <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
            <div className="flex h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${stats.percentual}%` }} />
              <div className="h-full bg-rose-500" style={{ width: `${100 - stats.percentual}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{stats.acertos} acertos • {stats.erros} erros</p>
          </div>
        </div>
      </div>

      <div className="card">
        <SectionHeader title="Últimas sessões" right={<button type="button" onClick={() => setView('sessoes')} className="text-sm font-medium text-brand-700 dark:text-brand-200">Ver todas</button>} />
        {sessions.length ? <div className="grid gap-3 md:grid-cols-3">{sessions.slice(0, 3).map((session) => <div key={session.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="font-semibold text-slate-800 dark:text-slate-100">{session.mode}</p><p className="text-xs text-slate-500 dark:text-slate-400">{new Date(session.startedAt).toLocaleString('pt-BR')}</p><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{session.correct} acertos · {session.wrong} erros · {session.blank} brancos</p><p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{session.accuracy === undefined ? 'Em andamento' : `${Math.round(session.accuracy * 100)}%`}</p></div>)}</div> : <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma sessão registrada.</p>}
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
  onAnswer: (answer: 'CERTO' | 'ERRADO', confidence?: number) => void;
  onToggleMark: (mark: 'favorita' | 'revisar' | 'pegadinha' | 'dificil') => void;
  marks: Record<string, { favorita?: boolean; revisar?: boolean; pegadinha?: boolean; dificil?: boolean }>;
  nextQuestion: () => void;
  disciplines: string[];
  trainingNotice: string;
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
  trainingNotice,
}: TrainPageProps) {
  const [disciplina, setDisciplina] = useState('');
  const [quantidade, setQuantidade] = useState(10);
  const [confidence, setConfidence] = useState<number | undefined>();

  useEffect(() => setConfidence(undefined), [currentQuestion?.id]);

  useEffect(() => {
    if (!currentQuestion) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.ctrlKey || event.metaKey || event.altKey || target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')) return;

      const key = event.key.toLowerCase();
      if (!answerConfirmed && key === 'c') onAnswer('CERTO', confidence);
      else if (!answerConfirmed && key === 'e') onAnswer('ERRADO', confidence);
      else if (answerConfirmed && (key === 'n' || key === 'enter')) nextQuestion();
      else if (key === 'r') onToggleMark('revisar');
      else return;
      event.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [answerConfirmed, confidence, currentQuestion, nextQuestion, onAnswer, onToggleMark]);

  if (!currentQuestion) {
    return (
      <div className="space-y-6 pb-28">
        <div className="card space-y-4">
          <SectionHeader title="Seleção de treino" />
          {trainingNotice && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">{trainingNotice}</p>}
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
              <span>Disciplina</span>
              <select
                value={disciplina}
                onChange={(event) => setDisciplina(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="">Todas</option>
                {disciplines.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
              <span>Quantidade</span>
              <select
                value={quantidade}
                onChange={(event) => setQuantidade(Number(event.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                {[5, 10, 15, 20, 30, 50, 100].map((qtd) => (
                  <option key={qtd} value={qtd}>{qtd}</option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => startTraining({ disciplina: disciplina || undefined, quantidade })}
                className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition"
              >
                Iniciar treino
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      {trainingNotice && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">{trainingNotice}</p>}
      <QuestionCard
        question={currentQuestion}
        index={index + 1}
        total={total}
        selectedAnswer={selectedAnswer}
        answerConfirmed={answerConfirmed}
        disabled={answerConfirmed}
        onAnswer={(answer) => onAnswer(answer, confidence)}
        onToggleMark={onToggleMark}
        currentMark={marks[currentQuestion.id]}
      />

      {!answerConfirmed && (
        <label className="flex max-w-xs items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
          <span>Confiança</span>
          <select value={confidence ?? ''} onChange={(event) => setConfidence(event.target.value ? Number(event.target.value) : undefined)} className="rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
            <option value="">Opcional</option>
            {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} de 5</option>)}
          </select>
        </label>
      )}

      {answerConfirmed && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={nextQuestion}
            className="rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition"
          >
            {index < total - 1 ? 'Próxima questão' : 'Finalizar treino'}
          </button>
        </div>
      )}
    </div>
  );
}

interface CadernoPageProps {
  items: NotebookItem[];
  onReviewNow: () => void;
  defaultCategory: NotebookCategory;
}

const notebookCategoryLabels: Record<NotebookCategory, string> = {
  ERROS_RECENTES: 'Erros recentes',
  ERROS_RECORRENTES: 'Erros recorrentes',
  REVISOES_VENCIDAS: 'Revisões vencidas',
  QUESTOES_DIFICEIS: 'Questões difíceis',
  FAVORITAS: 'Favoritas',
  PEGADINHAS: 'Pegadinhas',
  NAO_VISTAS: 'Não vistas',
};

export function CadernoPage({ items, onReviewNow, defaultCategory }: CadernoPageProps) {
  const [category, setCategory] = useState<NotebookCategory | 'TODAS'>(defaultCategory);
  const [visibleCount, setVisibleCount] = useState(40);
  const filteredItems = items.filter((item) => category === 'TODAS' || item.categorias.includes(category));
  const overdueCount = items.filter((item) => item.vencida).length;

  useEffect(() => {
    setCategory(defaultCategory);
    setVisibleCount(40);
  }, [defaultCategory]);

  const changeCategory = (nextCategory: NotebookCategory | 'TODAS') => {
    setCategory(nextCategory);
    setVisibleCount(40);
  };

  return (
    <div className="space-y-5 pb-28">
      <div className="card">
        <SectionHeader title="Caderno Inteligente" />
        {overdueCount > 0 && (
          <button type="button" onClick={onReviewNow} className="mb-4 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700">
            Revisar agora ({overdueCount})
          </button>
        )}
        <label className="mb-4 block max-w-md space-y-2 text-sm text-slate-700 dark:text-slate-200">
          <span>Categoria</span>
          <select value={category} onChange={(event) => changeCategory(event.target.value as NotebookCategory | 'TODAS')} className="w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <option value="TODAS">Todas ({items.length})</option>
            {(Object.entries(notebookCategoryLabels) as Array<[NotebookCategory, string]>).map(([key, label]) => (
              <option key={key} value={key}>{label} ({items.filter((item) => item.categorias.includes(key)).length})</option>
            ))}
          </select>
        </label>
        <div className="space-y-3">
          {filteredItems.length ? (
            filteredItems.slice(0, visibleCount).map((item) => (
              <div key={item.questionId} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{item.disciplina}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 truncate">{item.assunto}</p>
                  </div>
                  <PriorityBadge priority={item.prioridade} />
                </div>
                <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">{item.enunciado}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.categorias.map((itemCategory) => <span key={itemCategory} className="pill bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{notebookCategoryLabels[itemCategory]}</span>)}
                  {item.confidenceSignal && <span className="pill bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">{item.confidenceSignal === 'ERRO_ALTA_CONFIANCA' ? 'Erro com alta confiança' : 'Acerto com baixa confiança'}</span>}
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-3">
                  <span>Erros: {item.erros}</span>
                  <span>Data: {item.data}</span>
                  <span>{item.vencida ? 'Vencida' : 'Próxima'}: {item.proximaRevisao}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma questão nesta categoria.</p>
          )}
          {filteredItems.length > visibleCount && <button type="button" onClick={() => setVisibleCount((count) => count + 40)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium dark:border-slate-700">Carregar mais ({filteredItems.length - visibleCount})</button>}
        </div>
      </div>
    </div>
  );
}

interface PerformancePageProps {
  attempts: AnswerRecord[]; 
  questions: Question[];
}

export function PerformancePage({ attempts, questions }: PerformancePageProps) {
  const performance = calculatePerformance(attempts);
  const tagPerformance = calculateTagPerformance(questions, attempts);
  const [period, setPeriod] = useState<'7' | '30' | '90' | 'all'>('30');
  const dailyPerformance = calculateDailyPerformance(attempts, period === 'all' ? undefined : Number(period));
  const maxDailyAttempts = Math.max(1, ...dailyPerformance.map((item) => item.attempts));
  const overallPercent = performance.windows.all.accuracy === null ? null : Math.round(performance.windows.all.accuracy * 100);

  return (
    <div className="space-y-6 pb-28">
      <div className="card">
        <SectionHeader title="Desempenho" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total" value={attempts.length} tone="primary" />
          <StatCard label="Acertos" value={attempts.filter((item) => item.acertou).length} tone="success" />
          <StatCard label="Erros" value={attempts.filter((item) => item.acertou === false).length} tone="danger" />
          <StatCard label="Em branco" value={attempts.filter((item) => item.acertou === null).length} tone="warning" />
        </div>
      </div>

      <div className="card">
        <SectionHeader title="Aproveitamento geral" />
        <div className="flex items-center justify-center gap-4">
          <div className="flex-1">
            <div className="flex h-4 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="h-full bg-brand-500 transition-all" style={{ width: `${overallPercent}%` }} />
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{overallPercent === null ? 'Sem respostas avaliadas' : `${overallPercent}% de aproveitamento`}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <SectionHeader title="Desempenho recente" right={<span className="text-sm text-slate-500 dark:text-slate-400">Tendência: {performance.recentTrend === 'down' ? 'queda' : performance.recentTrend === 'up' ? 'alta' : performance.recentTrend === 'stable' ? 'estável' : 'amostra insuficiente'}</span>} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {(['10', '20', '30', '50', '100', 'all'] as const).map((windowKey) => {
            const metric = performance.windows[windowKey];
            const label = windowKey === 'all' ? 'Histórico' : `Últimas ${windowKey}`;
            const percentage = metric.accuracy === null ? '—' : `${Math.round(metric.accuracy * 100)}%`;
            const evaluated = metric.correct + metric.wrong;
            const helper = metric.accuracy === null
              ? `${metric.attempts} tentativas; sem respostas avaliadas`
              : `${metric.correct}/${evaluated} avaliadas${evaluated < 5 ? '; amostra pequena' : ''}`;
            return <StatCard key={windowKey} label={label} value={percentage} helper={helper} />;
          })}
        </div>
      </div>

      <div className="card">
        <SectionHeader title="Tempo de resposta" />
        {performance.time.averageSeconds === null ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum tempo registrado.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5 text-sm text-slate-600 dark:text-slate-300">
            <span>Média: <strong>{performance.time.averageSeconds.toFixed(1)}s</strong></span>
            <span>Mediana: <strong>{performance.time.medianSeconds?.toFixed(1)}s</strong></span>
            <span>Mais rápida: <strong>{performance.time.fastestSeconds?.toFixed(1)}s</strong></span>
            <span>Mais lenta: <strong>{performance.time.slowestSeconds?.toFixed(1)}s</strong></span>
            <span>Muito rápidas/lentas: <strong>{performance.time.veryFast}/{performance.time.verySlow}</strong></span>
          </div>
        )}
      </div>

      <div className="card">
        <SectionHeader title="Evolução diária" right={<select value={period} onChange={(event) => setPeriod(event.target.value as typeof period)} className="rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option><option value="all">Tudo</option></select>} />
        {dailyPerformance.length ? <div className="space-y-2">{dailyPerformance.slice(-30).map((item) => <div key={item.date} className="grid grid-cols-[5rem_1fr_4rem] items-center gap-2 text-xs text-slate-600 dark:text-slate-300"><span>{new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span><div className="h-4 overflow-hidden rounded bg-slate-100 dark:bg-slate-800"><div className="h-full bg-brand-500" style={{ width: `${item.attempts / maxDailyAttempts * 100}%` }} /></div><span className="text-right">{item.accuracy === null ? '—' : `${Math.round(item.accuracy * 100)}%`}</span></div>)}</div> : <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma tentativa registrada no período.</p>}
      </div>

      <div className="card">
        <SectionHeader title="Desempenho por disciplina" />
        <div className="space-y-3">
          {performance.byDiscipline.length ? (
            performance.byDiscipline.map((item) => (
              <div key={item.discipline}>
                <div className="mb-1 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                  <span className="truncate">{item.discipline}</span>
                  <span className="ml-2 shrink-0 text-right font-semibold">{item.accuracy === null ? '—' : `${Math.round(item.accuracy * 100)}%`} · {item.attempts} questões<br /><span className="text-xs font-normal">média {item.time.averageSeconds === null ? '—' : `${item.time.averageSeconds.toFixed(1)}s`}</span></span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${item.accuracy === null ? 0 : item.accuracy * 100}%` }} />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma tentativa registrada.</p>
          )}
        </div>
      </div>

      <div className="card">
        <SectionHeader title="Desempenho por tipo de questão" />
        {tagPerformance.length ? (
          <div className="space-y-3">
            {tagPerformance.slice(0, 10).map((item) => <div key={item.tag} className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-300"><span className="font-medium">{item.tag}</span><span>{Math.round(item.errorRate * 100)}% de erro · {item.attempts} questões · {item.correct} acertos / {item.wrong} erros</span></div>)}
          </div>
        ) : <p className="text-sm text-slate-500 dark:text-slate-400">Ainda não há tentativas suficientes por tag.</p>}
      </div>
    </div>
  );
}

interface HistoryPageProps {
  attempts: AnswerRecord[];
  questions: Question[];
  disciplines: string[];
}

export function HistoryPage({ attempts, questions, disciplines }: HistoryPageProps) {
  const [outcome, setOutcome] = useState<'all' | 'correct' | 'wrong' | 'blank'>('all');
  const [discipline, setDiscipline] = useState('');
  const [mode, setMode] = useState('all');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const filtered = attempts.filter((attempt) => {
    const question = questionById.get(attempt.questionId);
    const matchesOutcome = outcome === 'all' ||
      (outcome === 'correct' && attempt.acertou === true) ||
      (outcome === 'wrong' && attempt.acertou === false) ||
      (outcome === 'blank' && attempt.acertou === null);
    const attemptDate = new Date(attempt.data);
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const to = toDate ? new Date(`${toDate}T23:59:59.999`) : null;
    const query = search.trim().toLocaleLowerCase('pt-BR');
    const matchesSearch = !query || `${attempt.disciplina} ${attempt.assunto} ${question?.enunciado ?? ''}`.toLocaleLowerCase('pt-BR').includes(query);
    return matchesOutcome && (!discipline || attempt.disciplina === discipline) &&
      (mode === 'all' || attempt.mode === mode) &&
      (!from || attemptDate >= from) && (!to || attemptDate <= to) && matchesSearch;
  });
  const pageCount = Math.ceil(filtered.length / pageSize);
  const visibleAttempts = filtered.slice(page * pageSize, (page + 1) * pageSize);

  useEffect(() => setPage(0), [outcome, discipline, mode, search, fromDate, toDate]);

  return (
    <div className="space-y-5 pb-28">
      <div className="card space-y-4">
        <SectionHeader title="Histórico de tentativas" right={<span className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} registros</span>} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-1 text-sm text-slate-700 dark:text-slate-200">Resultado
            <select value={outcome} onChange={(event) => setOutcome(event.target.value as typeof outcome)} className="w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <option value="all">Todos</option><option value="correct">Acertos</option><option value="wrong">Erros</option><option value="blank">Em branco</option>
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-700 dark:text-slate-200">Disciplina
            <select value={discipline} onChange={(event) => setDiscipline(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <option value="">Todas</option>{disciplines.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-700 dark:text-slate-200">Modo
            <select value={mode} onChange={(event) => setMode(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <option value="all">Todos</option><option value="TREINO">Treino</option><option value="REVISAO">Revisão</option><option value="SIMULADO">Simulado</option><option value="ERROS">Erros</option><option value="NAO_VISTAS">Não vistas</option>
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-700 dark:text-slate-200">De
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900" />
          </label>
          <label className="space-y-1 text-sm text-slate-700 dark:text-slate-200">Até
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900" />
          </label>
          <label className="space-y-1 text-sm text-slate-700 dark:text-slate-200">Questão ou assunto
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar no histórico" className="w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900" />
          </label>
        </div>
      </div>
      <div className="card divide-y divide-slate-200 dark:divide-slate-700">
        {visibleAttempts.length ? visibleAttempts.map((attempt) => {
          const question = questionById.get(attempt.questionId);
          const resultLabel = attempt.acertou === null ? 'Em branco' : attempt.acertou ? 'Acerto' : 'Erro';
          return (
            <details key={attempt.id} className="py-4 first:pt-0 last:pb-0">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-slate-800 dark:text-slate-100">{attempt.disciplina} · {attempt.assunto}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{new Date(attempt.data).toLocaleString('pt-BR')} · {attempt.tempoGasto ? `${(attempt.tempoGasto / 1000).toFixed(1)}s` : 'tempo indisponível'} · {attempt.mode ?? 'TREINO'}</span>
                </span>
                <span className={attempt.acertou === null ? 'font-medium text-slate-500' : attempt.acertou ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>{resultLabel}</span>
              </summary>
              {question && <div className="mt-4"><QuestionCard question={question} selectedAnswer={attempt.resposta === 'CERTO' || attempt.resposta === 'ERRADO' ? attempt.resposta : null} answerConfirmed disabled /></div>}
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Sua resposta: {attempt.resposta ?? 'Em branco'} · Gabarito: {question?.respostaCorreta ?? 'indisponível'}</p>
            </details>
          );
        }) : <p className="py-4 text-sm text-slate-500 dark:text-slate-400">Nenhuma tentativa corresponde aos filtros.</p>}
        {pageCount > 1 && (
          <div className="flex items-center justify-between gap-3 pt-4">
            <button type="button" disabled={page === 0} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-40 dark:border-slate-700">Anterior</button>
            <span className="text-sm text-slate-500 dark:text-slate-400">Página {page + 1} de {pageCount}</span>
            <button type="button" disabled={page >= pageCount - 1} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-40 dark:border-slate-700">Próxima</button>
          </div>
        )}
      </div>
    </div>
  );
}

interface SettingsPageProps {
  theme: 'light' | 'dark' | 'system';
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  onExport: (kind: ExportKind) => void;
  onImport: (file: File) => void;
  onReset: (scope: 'all' | 'progress' | 'history' | 'questions') => void;
  dailyGoal: number;
  onDailyGoalChange: (goal: number) => void;
}

interface SessionsPageProps {
  sessions: Array<{
    id: string;
    startedAt: string;
    finishedAt?: string;
    mode: string;
    questionIds: string[];
    answered: number;
    correct: number;
    wrong: number;
    blank: number;
    accuracy?: number;
    totalTimeSeconds?: number;
  }>;
}

export function SessionsPage({ sessions }: SessionsPageProps) {
  const ordered = [...sessions].sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime());
  return (
    <div className="space-y-5 pb-28">
      <div className="card">
        <SectionHeader title="Sessões de estudo" right={<span className="text-sm text-slate-500 dark:text-slate-400">{ordered.length} sessões</span>} />
        <div className="space-y-3">
          {ordered.length ? ordered.map((session) => (
            <div key={session.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{session.mode}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(session.startedAt).toLocaleString('pt-BR')} · {session.questionIds.length} questões</p>
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{session.accuracy === undefined ? 'Em andamento' : `${Math.round(session.accuracy * 100)}%`}</span>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-5">
                <span>Respondidas: {session.answered}</span><span>Acertos: {session.correct}</span><span>Erros: {session.wrong}</span><span>Brancos: {session.blank}</span><span>Tempo: {session.totalTimeSeconds === undefined ? '—' : `${Math.round(session.totalTimeSeconds)}s`}</span>
              </div>
            </div>
          )) : <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma sessão concluída.</p>}
        </div>
      </div>
    </div>
  );
}

export function SettingsPage({ theme, onThemeChange, onExport, onImport, onReset, dailyGoal, onDailyGoalChange }: SettingsPageProps) {
  return (
    <div className="space-y-6 pb-28">
      <div className="card space-y-4">
        <SectionHeader title="Configurações" />
        <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">Modo escuro</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Salvar preferência no navegador</p>
          </div>
          <select value={theme} onChange={(event) => onThemeChange(event.target.value as 'light' | 'dark' | 'system')} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
            <option value="system">Sistema</option>
            <option value="light">Claro</option>
            <option value="dark">Escuro</option>
          </select>
        </div>
        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">Meta diária
          <select value={dailyGoal} onChange={(event) => onDailyGoalChange(Number(event.target.value))} className="rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">{[10, 20, 30, 50, 100].map((goal) => <option key={goal} value={goal}>{goal} questões</option>)}</select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {([
            ['backup', 'Backup completo'],
            ['questions', 'Exportar questões'],
            ['history', 'Exportar histórico'],
            ['progress', 'Exportar progresso'],
          ] as const).map(([kind, label]) => (
            <button key={kind} type="button" onClick={() => onExport(kind)} className="rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700">
              {label}
            </button>
          ))}
          <label className="cursor-pointer rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-medium dark:border-slate-700 transition hover:bg-slate-50 dark:hover:bg-slate-800">
            Importar
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(event) => event.target.files?.[0] && onImport(event.target.files[0])}
              aria-label="Importar arquivo de backup"
            />
          </label>
          {([
            ['history', 'Apagar histórico'],
            ['progress', 'Resetar progresso'],
            ['questions', 'Apagar banco'],
            ['all', 'Apagar tudo'],
          ] as const).map(([scope, label]) => <button key={scope} type="button" onClick={() => { if (window.confirm(`${label}? Esta ação não pode ser desfeita.`)) onReset(scope); }} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200 transition hover:bg-rose-100 dark:hover:bg-rose-900">{label}</button>)}
        </div>
      </div>
    </div>
  );
}

interface SimuladoPageProps {
  currentQuestion: Question | null;
  currentIndex: number;
  total: number;
  answer: AnswerValue | null;
  session: {
    questions: Question[];
    answers: Record<string, AnswerValue | null>;
    startedAt: number;
    finishedAt?: number;
    finished: boolean;
  } | null;
  disciplines: string[];
  topics: string[];
  defaults: UserSettings['simulado'];
  notice: string;
  onAnswer: (answer: AnswerValue | null) => void;
  onMove: (index: number) => void;
  onStart: (disciplines: string[], topics: string[], difficulty: UserSettings['simulado']['dificuldade'], quantity: number, minutes: number, penalty: number) => void;
  onFinish: () => void;
}

export function SimuladoPage({
  currentQuestion,
  currentIndex,
  total,
  answer,
  session,
  disciplines,
  topics,
  defaults,
  notice,
  onAnswer,
  onMove,
  onStart,
  onFinish,
}: SimuladoPageProps) {
  const [quantity, setQuantity] = useState(defaults.quantidade);
  const [minutes, setMinutes] = useState(defaults.tempoMinutos);
  const [penalty, setPenalty] = useState(defaults.penalidade);
  const [selectedDisciplines, setSelectedDisciplines] = useState(defaults.disciplinas);
  const [selectedTopic, setSelectedTopic] = useState(defaults.assuntos[0] ?? '');
  const [difficulty, setDifficulty] = useState(defaults.dificuldade);
  const [clockNow, setClockNow] = useState(Date.now());

  useEffect(() => {
    setQuantity(defaults.quantidade);
    setMinutes(defaults.tempoMinutos);
    setPenalty(defaults.penalidade);
    setSelectedDisciplines(defaults.disciplinas);
    setSelectedTopic(defaults.assuntos[0] ?? '');
    setDifficulty(defaults.dificuldade);
  }, [defaults]);

  useEffect(() => {
    if (!session || session.finished) return;
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [session]);

  const remainingSeconds = session && !session.finished
    ? Math.max(0, Math.ceil((session.startedAt + minutes * 60_000 - clockNow) / 1000))
    : 0;

  useEffect(() => {
    if (session && !session.finished && remainingSeconds === 0) onFinish();
  }, [onFinish, remainingSeconds, session]);

  if (session?.finished) {
    const answers = session.questions.map((question) => ({
      question,
      answer: session.answers[question.id] ?? null,
      correct: session.answers[question.id] === null || session.answers[question.id] === undefined
        ? null
        : session.answers[question.id] === question.respostaCorreta,
    }));
    const score = calculateCebraspeScore(answers.map((item) => item.correct), penalty);
    const { correct, wrong, blank, evaluated, netScore } = score;
    const elapsedMinutes = Math.floor(((session.finishedAt ?? clockNow) - session.startedAt) / 60_000);
    const byDiscipline = new Map<string, { correct: number; wrong: number; blank: number }>();
    for (const item of answers) {
      const summary = byDiscipline.get(item.question.disciplina) ?? { correct: 0, wrong: 0, blank: 0 };
      if (item.correct === true) summary.correct += 1;
      else if (item.correct === false) summary.wrong += 1;
      else summary.blank += 1;
      byDiscipline.set(item.question.disciplina, summary);
    }

    return (
      <div className="space-y-5 pb-28">
        <div className="card space-y-4">
          <SectionHeader title="Resultado do simulado" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Acertos" value={correct} tone="success" />
            <StatCard label="Erros" value={wrong} tone="danger" />
            <StatCard label="Em branco" value={blank} tone="warning" />
            <StatCard label="Aproveitamento" value={score.accuracy === null ? '—' : `${Math.round(score.accuracy * 100)}%`} helper={`${correct}/${evaluated} questões avaliadas`} />
            <StatCard label="Pontuação líquida" value={netScore.toFixed(1)} helper={`+1 / -${penalty} / 0 · ${elapsedMinutes} min`} />
          </div>
          <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Desempenho por disciplina</p>
            {[...byDiscipline.entries()].map(([discipline, summary]) => {
              const evaluatedInDiscipline = summary.correct + summary.wrong;
              const percent = evaluatedInDiscipline ? Math.round(summary.correct / evaluatedInDiscipline * 100) : 0;
              return <p key={discipline} className="flex justify-between gap-3 text-sm text-slate-600 dark:text-slate-300"><span>{discipline}</span><span>{percent}% · {summary.correct} acertos, {summary.wrong} erros, {summary.blank} brancos</span></p>;
            })}
          </div>
        </div>
        <div className="card space-y-3">
          <SectionHeader title="Revisar questões" />
          {answers.map((item, index) => (
            <details key={item.question.id} className="border-b border-slate-200 py-3 last:border-0 dark:border-slate-700">
              <summary className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-200">
                Questão {index + 1} · {item.question.disciplina} · {item.correct === null ? 'Em branco' : item.correct ? 'Acerto' : 'Erro'}
              </summary>
              <div className="mt-3"><QuestionCard question={item.question} selectedAnswer={item.answer} answerConfirmed /></div>
            </details>
          ))}
          <button type="button" onClick={onFinish} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Voltar ao dashboard</button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="card space-y-4 pb-28">
        <SectionHeader title="Configurar simulado" />
        {notice && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">{notice}</p>}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-2 text-sm text-slate-700 dark:text-slate-200">Questões
            <select value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              {[5, 10, 15, 20, 30, 50, 100].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm text-slate-700 dark:text-slate-200">Tempo
            <select value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} className="w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              {[20, 40, 60, 90, 120].map((value) => <option key={value} value={value}>{value} min</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm text-slate-700 dark:text-slate-200">Penalidade por erro
            <select value={penalty} onChange={(event) => setPenalty(Number(event.target.value))} className="w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              {[0, 0.5, 1].map((value) => <option key={value} value={value}>-{value}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm text-slate-700 dark:text-slate-200">Assunto
            <select value={selectedTopic} onChange={(event) => setSelectedTopic(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"><option value="">Todos</option>{topics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}</select>
          </label>
          <label className="space-y-2 text-sm text-slate-700 dark:text-slate-200">Dificuldade
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as typeof difficulty)} className="w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"><option value="todas">Todas</option><option value="fácil">Fácil</option><option value="média">Média</option><option value="difícil">Difícil</option></select>
          </label>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">Disciplinas</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {disciplines.map((discipline) => (
              <label key={discipline} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={selectedDisciplines.includes(discipline)} onChange={(event) => setSelectedDisciplines((current) => event.target.checked ? [...current, discipline] : current.filter((item) => item !== discipline))} />
                {discipline}
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Nenhuma selecionada: todas as disciplinas.</p>
        </fieldset>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => onStart(selectedDisciplines, selectedTopic ? [selectedTopic] : [], difficulty, quantity, minutes, penalty)} className="rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700">Iniciar simulado</button>
          <button type="button" onClick={onFinish} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium dark:border-slate-700">Voltar</button>
        </div>
      </div>
    );
  }

  const minutesLeft = Math.floor(remainingSeconds / 60);
  const secondsLeft = remainingSeconds % 60;
  return (
    <div className="space-y-5 pb-28">
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Progresso</p>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{currentIndex + 1} de {total} · {Object.keys(session?.answers ?? {}).length} respondidas</p>
        </div>
        <p role="timer" aria-live="off" className="font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{String(minutesLeft).padStart(2, '0')}:{String(secondsLeft).padStart(2, '0')}</p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div className="h-full bg-brand-500" style={{ width: `${((currentIndex + 1) / total) * 100}%` }} />
        </div>
      </div>

      <QuestionCard question={currentQuestion} index={currentIndex + 1} total={total} selectedAnswer={answer} onAnswer={onAnswer} />

      <div className="flex flex-wrap justify-between gap-3">
        <button type="button" disabled={currentIndex === 0} onClick={() => onMove(currentIndex - 1)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium disabled:opacity-40 dark:border-slate-700">Anterior</button>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => onAnswer(null)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium dark:border-slate-700">Deixar em branco</button>
          {currentIndex < total - 1 && <button type="button" onClick={() => onMove(currentIndex + 1)} className="rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white">Próxima</button>}
          <button type="button" onClick={() => { if (window.confirm('Finalizar o simulado e registrar as respostas?')) onFinish(); }} className="rounded-xl border border-rose-200 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-800 dark:text-rose-200">Finalizar</button>
        </div>
        <button type="button" disabled={currentIndex >= total - 1} onClick={() => onMove(currentIndex + 1)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium disabled:opacity-40 dark:border-slate-700">Próxima</button>
      </div>
    </div>
  );
}

export default function App() {
  const study = useStudyApp();

  if (!study.storageReady) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">Carregando dados locais...</main>;
  }

  let page: React.ReactNode;

  switch (study.view) {
    case 'dashboard':
      page = (
        <DashboardPage
          stats={study.stats}
          recommendation={study.recommendation}
          reviewItems={study.reviewItems}
          setView={study.setView}
          startTraining={study.startTraining}
          sessions={[...study.state.sessions].sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime())}
        />
      );
      break;
    case 'train':
      page = (
        <TrainPage
          questions={study.trainingQueue}
          startTraining={study.startTraining}
          currentQuestion={study.currentTrainingQuestion}
          index={study.trainingIndex}
          total={study.trainingQueue.length}
          selectedAnswer={study.selectedAnswer}
          answerConfirmed={study.answerConfirmed}
          onAnswer={(answer, confidence) => {
            if (study.currentTrainingQuestion) study.recordAnswer(study.currentTrainingQuestion, answer, { confidence });
          }}
          onToggleMark={(mark) => {
            if (study.currentTrainingQuestion) study.toggleMark(study.currentTrainingQuestion.id, mark);
          }}
          marks={study.state.marks}
          nextQuestion={study.nextTrainingQuestion}
          disciplines={study.disciplines.map((discipline) => discipline.name)}
          trainingNotice={study.trainingNotice}
        />
      );
      break;
    case 'caderno':
      page = (
        <CadernoPage
          items={study.notebookItems}
          defaultCategory="NAO_VISTAS"
          onReviewNow={() => study.startTraining({ quantidade: study.notebookItems.filter((item) => item.vencida).length, mode: 'REVISAO' })}
        />
      );
      break;
    case 'review':
      page = (
        <CadernoPage
          items={study.notebookItems}
          defaultCategory="REVISOES_VENCIDAS"
          onReviewNow={() => study.startTraining({ quantidade: study.notebookItems.filter((item) => item.vencida).length, mode: 'REVISAO' })}
        />
      );
      break;
    case 'prioridades':
      page = (
        <div className="card space-y-4">
          <SectionHeader title="Prioridade por assunto" />
          {study.topicProgress.length ? study.topicProgress.map((topic) => {
            const answered = topic.correct + topic.wrong;
            const priority = topic.priorityScore >= 65 ? 'alta' : topic.priorityScore >= 35 ? 'média' : 'baixa';
            const trend = topic.trend === 'down' ? 'Queda recente' : topic.trend === 'up' ? 'Alta recente' : topic.trend === 'stable' ? 'Estável' : 'Amostra insuficiente';
            return (
              <div key={`${topic.disciplina}-${topic.assunto}`} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 py-3 last:border-0 dark:border-slate-700">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{topic.assunto}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{topic.disciplina} · {topic.questionCount} questões · {answered ? `${Math.round(topic.accuracy * 100)}% em ${answered}` : 'sem tentativas'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{trend} · {topic.overdueReviews} vencidas · {topic.unseenQuestions} não vistas{answered < 5 ? ' · amostra pequena' : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <PriorityBadge priority={priority} />
                  <span className="text-sm tabular-nums text-slate-500 dark:text-slate-400">{topic.priorityScore}/100</span>
                  <button type="button" onClick={() => study.startTraining({ disciplina: topic.disciplina, assunto: topic.assunto, quantidade: 10 })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                    Treinar
                  </button>
                </div>
              </div>
            );
          }) : <p className="text-sm text-slate-500 dark:text-slate-400">Adicione questões para calcular prioridades.</p>}
        </div>
      );
      break;
    case 'performance':
      page = <PerformancePage attempts={study.state.attempts} questions={study.state.questions} />;
      break;
    case 'settings':
      page = (
        <SettingsPage
          theme={study.state.settings.theme}
          onThemeChange={(theme) => study.updateSettings({ theme })}
          onExport={study.exportJson}
          onImport={study.importJson}
          onReset={study.resetApp}
          dailyGoal={study.state.settings.dailyGoal}
          onDailyGoalChange={(dailyGoal) => study.updateSettings({ dailyGoal })}
        />
      );
      break;
    case 'simulado':
      page = (
        <SimuladoPage
          currentQuestion={study.simuladoCurrent}
          currentIndex={study.simuladoSession?.index ?? 0}
          total={study.simuladoSession?.questions.length ?? 0}
          answer={study.simuladoCurrent ? study.simuladoSession?.answers[study.simuladoCurrent.id] ?? null : null}
          session={study.simuladoSession}
          disciplines={study.disciplines.map((discipline) => discipline.name)}
          topics={[...new Set(study.state.questions.map((question) => question.assunto))].sort()}
          defaults={study.state.settings.simulado}
          notice={study.simuladoNotice}
          onAnswer={study.answerSimuladoQuestion}
          onMove={study.moveSimuladoQuestion}
          onStart={study.startSimulado}
          onFinish={study.finishSimulado}
        />
      );
      break;
    case 'disciplinas':
      page = (
        <div className="card space-y-4">
          <SectionHeader title="Disciplinas" />
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {study.disciplines.map((discipline) => (
              <div key={discipline.name} className="flex flex-wrap items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 dark:text-slate-100">{discipline.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{discipline.count} questões · {discipline.totalAnswered} respostas · {discipline.percentual}% de acerto</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tendência: {discipline.trend === 'down' ? 'queda' : discipline.trend === 'up' ? 'alta' : discipline.trend === 'stable' ? 'estável' : 'amostra insuficiente'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <PriorityBadge priority={discipline.prioridadeScore >= 65 ? 'alta' : discipline.prioridadeScore >= 35 ? 'média' : 'baixa'} />
                  <span className="text-sm tabular-nums text-slate-500 dark:text-slate-400">{discipline.prioridadeScore}/100</span>
                  <button type="button" onClick={() => study.startTraining({ disciplina: discipline.name, quantidade: 10 })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Treinar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
      break;
    case 'historico':
      page = <HistoryPage attempts={study.history} questions={study.state.questions} disciplines={study.disciplines.map((discipline) => discipline.name)} />;
      break;
    case 'sessoes':
      page = <SessionsPage sessions={study.state.sessions} />;
      break;
  }

  return (
    <Layout
      view={study.view}
      setView={study.setView}
      state={study.state}
      recommendation={study.recommendation}
      reviewItems={study.reviewItems}
    >
      {page}
    </Layout>
  );
}
