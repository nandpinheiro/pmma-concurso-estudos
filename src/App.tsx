import { useMemo, useState } from 'react';
import { useStudyApp } from './hooks/useStudyApp';
import { Layout } from './components/Layout';
import { PriorityBadge, QuestionCard, SectionHeader, StatCard } from './components/StatCard';
import type { Question, ViewKey } from './types';

function DisciplinesPage({ disciplines, questions }: { disciplines: string[]; questions: Question[] }) {
  const byDiscipline = useMemo(() => {
    return disciplines.map((name) => {
      const related = questions.filter((q) => q.disciplina === name);
      return {
        name,
        total: related.length,
        answered: related.filter((q) => q.isDemo).length,
      };
    });
  }, [disciplines, questions]);

  return (
    <div className="space-y-6 pb-28">
      <div className="card">
        <SectionHeader title="Disciplinas" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {byDiscipline.map((item) => (
            <div key={item.name} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{item.name}</p>
              <div className="mt-3 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>Questões</span>
                <span>{item.total}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>Exemplos</span>
                <span>{item.answered}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReviewPage({ items }: { items: Array<{ questionId: string; disciplina: string; assunto: string; data: string; erros: number; ultimaResposta: 'CERTO' | 'ERRADO' | null; proximaRevisao: string; prioridade: 'alta' | 'média' | 'baixa' }> }) {
  return (
    <div className="space-y-6 pb-28">
      <div className="card">
        <SectionHeader title="Revisão" />
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.questionId} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{item.disciplina}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{item.assunto}</p>
                </div>
                <PriorityBadge priority={item.prioridade} />
              </div>
              <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-3">
                <span>Erros: {item.erros}</span>
                <span>Última: {item.ultimaResposta ?? '—'}</span>
                <span>Próxima: {item.proximaRevisao}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PrioridadesPage({ items }: { items: Array<{ disciplina: string; assunto: string; percentual: number; erros: number; prioridade: 'alta' | 'média' | 'baixa' }> }) {
  return (
    <div className="space-y-6 pb-28">
      <div className="card">
        <SectionHeader title="Prioridades" />
        <div className="space-y-3">
          {items.map((item) => (
            <div key={`${item.disciplina}-${item.assunto}`} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{item.disciplina}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{item.assunto}</p>
                </div>
                <PriorityBadge priority={item.prioridade} />
              </div>
              <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                {item.percentual}% de aproveitamento • {item.erros} erros recentes
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HistoryPage({ history }: { history: Array<{ id: string; disciplina: string; assunto: string; resposta: 'CERTO' | 'ERRADO' | null; acertou: boolean | null; data: string; tempoGasto: number }> }) {
  return (
    <div className="space-y-6 pb-28">
      <div className="card">
        <SectionHeader title="Histórico" />
        <div className="space-y-3">
          {history.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{item.disciplina}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{item.assunto}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${item.acertou ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200'}`}>
                  {item.acertou ? 'ACERTOU' : 'ERROU'}
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-3">
                <span>Resposta: {item.resposta ?? '—'}</span>
                <span>Data: {new Date(item.data).toLocaleDateString('pt-BR')}</span>
                <span>Tempo: {Math.round(item.tempoGasto / 1000)}s</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const {
    view,
    setView,
    state,
    stats,
    recommendation,
    reviewItems,
    history,
    trainingQueue,
    trainingIndex,
    currentTrainingQuestion,
    selectedAnswer,
    answerConfirmed,
    disciplines,
    startTraining,
    recordAnswer,
    nextTrainingQuestion,
    toggleMark,
    updateSettings,
    exportJson,
    importJson,
    resetApp,
    simuladoSession,
    simuladoCurrent,
    startSimulado,
    answerSimuladoQuestion,
    finishSimulado,
  } = useStudyApp();

  const priorities = useMemo(() => {
    const rows = new Map<string, { disciplina: string; assunto: string; percentual: number; erros: number; prioridade: 'alta' | 'média' | 'baixa' }>();

    for (const attempt of state.attempts) {
      const key = `${attempt.disciplina}-${attempt.assunto}`;
      const current = rows.get(key) ?? { disciplina: attempt.disciplina, assunto: attempt.assunto, percentual: 0, erros: 0, prioridade: 'baixa' };
      current.erros += attempt.acertou ? 0 : 1;
      const related = state.attempts.filter((entry) => entry.disciplina === attempt.disciplina && entry.assunto === attempt.assunto);
      const acertos = related.filter((entry) => entry.acertou).length;
      current.percentual = related.length ? Math.round((acertos / related.length) * 100) : 0;
      current.prioridade = current.percentual < 55 ? 'alta' : current.percentual < 75 ? 'média' : 'baixa';
      rows.set(key, current);
    }

    return [...rows.values()].sort((a, b) => {
      const weight = { alta: 3, média: 2, baixa: 1 };
      return weight[b.prioridade] - weight[a.prioridade];
    });
  }, [state.attempts]);

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return (
          <DashboardPage
            stats={stats}
            recommendation={recommendation}
            reviewItems={reviewItems}
            setView={setView}
            startTraining={startTraining}
          />
        );
      case 'disciplinas':
        return <DisciplinesPage disciplines={disciplines.map((item) => item.name)} questions={state.questions} />;
      case 'train':
        return (
          <TrainPage
            questions={state.questions}
            startTraining={startTraining}
            currentQuestion={currentTrainingQuestion}
            index={trainingIndex}
            total={trainingQueue.length}
            selectedAnswer={selectedAnswer}
            answerConfirmed={answerConfirmed}
            onAnswer={(answer) => {
              if (currentTrainingQuestion) {
                recordAnswer(currentTrainingQuestion, answer, 18_000);
              }
            }}
            onToggleMark={(mark) => {
              if (currentTrainingQuestion) {
                toggleMark(currentTrainingQuestion.id, mark);
              }
            }}
            marks={state.marks}
            nextQuestion={nextTrainingQuestion}
            disciplines={disciplines.map((item) => item.name)}
          />
        );
      case 'caderno':
        return <CadernoPage items={reviewItems} />;
      case 'review':
        return <ReviewPage items={reviewItems} />;
      case 'performance':
        return <PerformancePage attempts={state.attempts} />;
      case 'prioridades':
        return <PrioridadesPage items={priorities} />;
      case 'historico':
        return <HistoryPage history={history} />;
      case 'settings':
        return (
          <SettingsPage
            theme={state.settings.theme}
            onThemeToggle={() => updateSettings({ theme: state.settings.theme === 'dark' ? 'light' : 'dark' })}
            onExport={exportJson}
            onImport={importJson}
            onReset={resetApp}
          />
        );
      case 'simulado':
        return simuladoCurrent ? (
          <SimuladoPage
            currentQuestion={simuladoCurrent}
            currentIndex={simuladoSession?.index ?? 0}
            total={simuladoSession?.questions.length ?? 0}
            onAnswer={(answer) => {
              if (simuladoCurrent) {
                answerSimuladoQuestion(simuladoCurrent, answer, 20_000);
              }
            }}
            onFinish={finishSimulado}
          />
        ) : (
          <div className="card pb-28">
            <SectionHeader title="Modo simulado" />
            <p className="text-sm text-slate-600 dark:text-slate-300">Nenhuma sessão ativa. Configure um simulado para iniciar.</p>
            <button
              type="button"
              onClick={() => startSimulado(state.settings.simulado.disciplinas, state.settings.simulado.quantidade)}
              className="mt-4 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Iniciar simulado
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Layout
      view={view}
      setView={setView}
      state={state}
      recommendation={recommendation}
      reviewItems={reviewItems}
    >
      {renderView()}
    </Layout>
  );
}
