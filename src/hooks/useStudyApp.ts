import { useCallback, useEffect, useMemo, useState } from 'react';
import { sampleQuestions } from '../data/sampleQuestions';
import { getNextRecommendation } from '../algorithms/recommendation';
import { storageService } from '../storage/storageService';
import type {
  AnswerRecord,
  AppState,
  DashboardStats,
  Question,
  ReviewItem,
  UserSettings,
  ViewKey,
} from '../types';

const STORAGE_KEY = 'pmma-study-state-v2';

const defaultSettings: UserSettings = {
  theme: 'light',
  reviewInterval: 3,
  showDemoQuestions: true,
  simulado: {
    quantidade: 20,
    tempoMinutos: 40,
    incluirIneditas: true,
    disciplinas: ['História do Maranhão', 'Informática', 'Língua Portuguesa'],
  },
};

export function createDefaultState(): AppState {
  return {
    questions: sampleQuestions,
    attempts: [],
    marks: {},
    settings: defaultSettings,
  };
}

export function useStudyApp() {
  const [view, setView] = useState<ViewKey>('dashboard');
  const [state, setState] = useState<AppState>(() => storageService.get(STORAGE_KEY, createDefaultState()));
  const [trainingQueue, setTrainingQueue] = useState<Question[]>([]);
  const [trainingIndex, setTrainingIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<'CERTO' | 'ERRADO' | null>(null);
  const [answerConfirmed, setAnswerConfirmed] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [simuladoSession, setSimuladoSession] = useState<{ questions: Question[]; index: number; startedAt: number } | null>(null);

  useEffect(() => {
    storageService.set(STORAGE_KEY, state);
  }, [state]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.settings.theme === 'dark');
  }, [state.settings.theme]);

  const updateState = useCallback((updater: (current: AppState) => AppState) => {
    setState((current) => updater(current));
  }, []);

  const stats = useMemo<DashboardStats>(() => {
    const attempts = state.attempts;
    const total = attempts.length;
    const acertos = attempts.filter((item) => item.acertou).length;
    const erros = total - acertos;
    const percentual = total > 0 ? Math.round((acertos / total) * 100) : 0;

    const uniqueQuestionIds = new Set(attempts.map((item) => item.questionId));
    const naoRespondidas = state.questions.length - uniqueQuestionIds.size;

    const recentErrors = attempts.filter((attempt) => {
      const date = new Date(attempt.data);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      return !attempt.acertou && date >= cutoff;
    }).length;

    const byDiscipline = new Map<string, { total: number; acertos: number; erros: number }>();

    for (const attempt of attempts) {
      const current = byDiscipline.get(attempt.disciplina) ?? { total: 0, acertos: 0, erros: 0 };
      current.total += 1;
      if (attempt.acertou) current.acertos += 1;
      else current.erros += 1;
      byDiscipline.set(attempt.disciplina, current);
    }

    let bestDiscipline = '—';
    let piorDisciplina = '—';
    let bestPercent = -1;
    let worstPercent = 101;

    for (const [discipline, summary] of byDiscipline.entries()) {
      const percent = summary.total > 0 ? (summary.acertos / summary.total) * 100 : 0;
      if (summary.total > 0 && percent > bestPercent) {
        bestPercent = percent;
        bestDiscipline = discipline;
      }
      if (summary.total > 0 && percent < worstPercent) {
        worstPercent = percent;
        piorDisciplina = discipline;
      }
    }

    const currentStreak = attempts.reduce((streak, attempt) => {
      if (attempt.acertou) return streak + 1;
      return 0;
    }, 0);

    const today = new Date();
    const respondidasHoje = attempts.filter((attempt) => {
      const date = new Date(attempt.data);
      return date.toDateString() === today.toDateString();
    }).length;

    const avgTime = total > 0 ? Math.round(attempts.reduce((sum, item) => sum + item.tempoGasto, 0) / total / 1000) : 0;

    const paraRevisao = attempts.filter((item) => !item.acertou).length;

    return {
      respondidas: total,
      acertos,
      erros,
      percentual,
      naoRespondidas,
      paraRevisao,
      errosRecentes: recentErrors,
      melhorDisciplina: bestDiscipline,
      piorDisciplina: piorDisciplina,
      sequenciaAtual: currentStreak,
      respondidasHoje: respondidasHoje,
      tempoMedio: avgTime,
    };
  }, [state.attempts, state.questions]);

  const recommendation = useMemo(() => getNextRecommendation(state.attempts, state.questions), [state.attempts, state.questions]);

  const disciplines = useMemo(() => {
    const map = new Map<string, { total: number; acertos: number; erros: number }>();

    for (const question of state.questions) {
      if (!map.has(question.disciplina)) {
        map.set(question.disciplina, { total: 0, acertos: 0, erros: 0 });
      }
      map.get(question.disciplina)!.total += 1;
    }

    for (const attempt of state.attempts) {
      if (!map.has(attempt.disciplina)) {
        map.set(attempt.disciplina, { total: 0, acertos: 0, erros: 0 });
      }

      const summary = map.get(attempt.disciplina)!;
      if (attempt.acertou) summary.acertos += 1;
      else summary.erros += 1;
    }

    return [...map.entries()].map(([name, summary]) => ({
      name,
      count: summary.total,
      totalAnswered: summary.acertos + summary.erros,
      acertos: summary.acertos,
      erros: summary.erros,
      percentual: summary.total > 0 ? Math.round((summary.acertos / Math.max(1, summary.acertos + summary.erros)) * 100) : 0,
    }));
  }, [state.attempts, state.questions]);

  const reviewItems = useMemo<ReviewItem[]>(() => {
    const items: ReviewItem[] = [];
    const map = new Map<string, { erros: number; ultimaResposta: AnswerRecord['resposta']; data: string; disciplina: string; assunto: string; prioridade: number }>();

    for (const attempt of state.attempts) {
      const key = attempt.questionId;
      const current = map.get(key) ?? { erros: 0, ultimaResposta: null, data: attempt.data, disciplina: attempt.disciplina, assunto: attempt.assunto, prioridade: 0 };
      if (!attempt.acertou) current.erros += 1;
      current.ultimaResposta = attempt.resposta;
      current.data = attempt.data;
      current.disciplina = attempt.disciplina;
      current.assunto = attempt.assunto;
      current.prioridade = Math.min(1, current.erros / 3 + (attempt.acertou ? 0.2 : 0.5));
      map.set(key, current);
    }

    for (const [questionId, item] of map.entries()) {
      const question = state.questions.find((entry) => entry.id === questionId);
      if (!question) continue;
      items.push({
        questionId,
        disciplina: item.disciplina,
        assunto: item.assunto,
        data: new Date(item.data).toLocaleDateString('pt-BR'),
        erros: item.erros,
        ultimaResposta: item.ultimaResposta,
        proximaRevisao: new Date(Date.now() + (item.erros + 1) * 86400000).toLocaleDateString('pt-BR'),
        prioridade: item.prioridade > 0.75 ? 'alta' : item.prioridade > 0.45 ? 'média' : 'baixa',
      });
    }

    return items.filter((item) => item.erros > 0 || state.marks[item.questionId]?.revisar).sort((a, b) => {
      const priorityOrder = { alta: 0, média: 1, baixa: 2 };
      return priorityOrder[a.prioridade] - priorityOrder[b.prioridade];
    }).slice(0, 10);
  }, [state.attempts, state.marks, state.questions]);

  const history = useMemo(() => [...state.attempts].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(0, 50), [state.attempts]);

  const startTraining = useCallback((filters?: { disciplina?: string; assunto?: string; quantidade?: number }) => {
    let source = state.questions;

    if (filters?.disciplina) {
      source = source.filter((question) => question.disciplina === filters.disciplina);
    }

    if (filters?.assunto) {
      source = source.filter((question) => question.assunto === filters.assunto);
    }

    const answeredIds = new Set(state.attempts.map((attempt) => attempt.questionId));
    const prioritized = [...source].sort((a, b) => {
      const aSeen = answeredIds.has(a.id) ? 1 : 0;
      const bSeen = answeredIds.has(b.id) ? 1 : 0;
      return aSeen - bSeen;
    });

    const selected = prioritized.slice(0, filters?.quantidade ?? 10);
    setTrainingQueue(selected);
    setTrainingIndex(0);
    setSelectedAnswer(null);
    setAnswerConfirmed(false);
    setStartTime(Date.now());
    setView('train');
  }, [state.attempts, state.questions]);

  const currentTrainingQuestion = trainingQueue[trainingIndex] ?? null;

  const recordAnswer = useCallback((question: Question, answer: 'CERTO' | 'ERRADO') => {
    const acertou = answer === question.respostaCorreta;
    const timeSpentMs = Math.max(1000, Date.now() - startTime);
    const record: AnswerRecord = {
      id: `${question.id}-${Date.now()}`,
      questionId: question.id,
      disciplina: question.disciplina,
      assunto: question.assunto,
      resposta: answer,
      acertou,
      tempoGasto: timeSpentMs,
      data: new Date().toISOString(),
      dificuldade: question.dificuldade,
      tentativa: (state.attempts.filter((item) => item.questionId === question.id).length || 0) + 1,
      revisada: false,
    };

    updateState((current) => ({
      ...current,
      attempts: [...current.attempts, record],
    }));

    setSelectedAnswer(answer);
    setAnswerConfirmed(true);
  }, [startTime, state.attempts, updateState]);

  const nextTrainingQuestion = useCallback(() => {
    if (trainingIndex < trainingQueue.length - 1) {
      setTrainingIndex((index) => index + 1);
      setSelectedAnswer(null);
      setAnswerConfirmed(false);
      setStartTime(Date.now());
      return;
    }

    setTrainingQueue([]);
    setTrainingIndex(0);
    setSelectedAnswer(null);
    setAnswerConfirmed(false);
    setStartTime(0);
    setView('dashboard');
  }, [trainingIndex, trainingQueue.length]);

  const toggleMark = useCallback((questionId: string, mark: 'favorita' | 'revisar' | 'pegadinha' | 'dificil') => {
    updateState((current) => {
      const existing = current.marks[questionId] ?? { favorita: false, revisar: false, pegadinha: false, dificil: false };
      return {
        ...current,
        marks: {
          ...current.marks,
          [questionId]: {
            favorita: mark === 'favorita' ? !existing.favorita : existing.favorita,
            revisar: mark === 'revisar' ? !existing.revisar : existing.revisar,
            pegadinha: mark === 'pegadinha' ? !existing.pegadinha : existing.pegadinha,
            dificil: mark === 'dificil' ? !existing.dificil : existing.dificil,
          },
        },
      };
    });
  }, [updateState]);

  const updateSettings = useCallback((next: Partial<UserSettings>) => {
    setState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        ...next,
      },
    }));
  }, []);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pmma-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state]);

  const importJson = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (typeof result !== 'string') throw new Error('Invalid file');
        const parsed = JSON.parse(result);
        setState({
          questions: parsed.questions ?? sampleQuestions,
          attempts: parsed.attempts ?? [],
          marks: parsed.marks ?? {},
          settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
        });
        alert('Dados importados com sucesso!');
      } catch (error) {
        alert(`Erro ao importar: ${error instanceof Error ? error.message : 'arquivo inválido'}`);
      }
    };
    reader.readAsText(file);
  }, []);

  const startSimulado = useCallback((disciplinas: string[], quantity: number) => {
    const filtered = state.questions.filter((question) => disciplinas.includes(question.disciplina));
    const pool = filtered.length > 0 ? filtered : state.questions;
    const chosen = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(quantity, pool.length));
    setSimuladoSession({
      questions: chosen,
      index: 0,
      startedAt: Date.now(),
    });
    setSelectedAnswer(null);
    setAnswerConfirmed(false);
    setStartTime(Date.now());
    setView('simulado');
  }, [state.questions]);

  const simuladoCurrent = simuladoSession?.questions[simuladoSession.index] ?? null;

  const answerSimuladoQuestion = useCallback((question: Question, answer: 'CERTO' | 'ERRADO') => {
    recordAnswer(question, answer);

    if (simuladoSession && simuladoSession.index < simuladoSession.questions.length - 1) {
      setTimeout(() => {
        setSimuladoSession((current) => (current ? { ...current, index: current.index + 1 } : current));
        setSelectedAnswer(null);
        setAnswerConfirmed(false);
        setStartTime(Date.now());
      }, 500);
    }
  }, [recordAnswer, simuladoSession]);

  const finishSimulado = useCallback(() => {
    setSimuladoSession(null);
    setSelectedAnswer(null);
    setAnswerConfirmed(false);
    setStartTime(0);
    setView('dashboard');
  }, []);

  return {
    view,
    state,
    trainingQueue,
    trainingIndex,
    currentTrainingQuestion,
    selectedAnswer,
    answerConfirmed,
    simuladoSession,
    simuladoCurrent,
    stats,
    disciplines,
    recommendation,
    reviewItems,
    history,
    setView,
    startTraining,
    recordAnswer,
    nextTrainingQuestion,
    toggleMark,
    updateSettings,
    exportJson,
    importJson,
    startSimulado,
    answerSimuladoQuestion,
    finishSimulado,
    resetApp: () => setState(createDefaultState()),
  };
}
