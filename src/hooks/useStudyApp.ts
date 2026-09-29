import { useCallback, useEffect, useMemo, useState } from 'react';
import { sampleQuestions } from '../data/sampleQuestions';
import { getNextRecommendation } from '../algorithms/recommendation';
import { buildNotebookItems } from '../algorithms/notebookAlgorithm';
import { calculateTopicProgress } from '../algorithms/priorityAlgorithm';
import { selectQuestionsForSession, type QuestionSelectionMode } from '../algorithms/questionSelectionAlgorithm';
import { deriveProgressByQuestion, isReviewOverdue } from '../algorithms/reviewAlgorithm';
import { createExportPayload, importStudyData, type ExportKind } from '../services/importExportService';
import { storageService } from '../storage/storageService';
import type {
  AnswerValue,
  AnswerRecord,
  AppState,
  DashboardStats,
  Question,
  Recommendation,
  ReviewItem,
  NotebookItem,
  StudyMode,
  StudySession,
  TopicProgress,
  UserSettings,
  ViewKey,
} from '../types';

const STORAGE_KEY = 'pmma-study-state-v2';

interface SimuladoSession {
  questions: Question[];
  index: number;
  startedAt: number;
  questionStartedAt: number;
  sessionId: string;
  answers: Record<string, AnswerValue | null>;
  elapsedByQuestion: Record<string, number>;
  finished: boolean;
  finishedAt?: number;
}

function createSessionId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const defaultSettings: UserSettings = {
  theme: 'system',
  reviewInterval: 3,
  showDemoQuestions: true,
  dailyGoal: 20,
  simulado: {
    quantidade: 20,
    tempoMinutos: 40,
    penalidade: 1,
    incluirIneditas: true,
    disciplinas: ['História do Maranhão', 'Informática', 'Língua Portuguesa'],
    assuntos: [],
    dificuldade: 'todas',
  },
};

export function createDefaultState(): AppState {
  return {
    questions: sampleQuestions,
    attempts: [],
    sessions: [],
    marks: {},
    settings: defaultSettings,
  };
}

function createOpenSession(id: string, questions: Question[], mode: StudyMode): StudySession {
  return {
    id,
    startedAt: new Date().toISOString(),
    mode,
    questionIds: questions.map((question) => question.id),
    answered: 0,
    correct: 0,
    wrong: 0,
    blank: 0,
  };
}

function updateSession(session: StudySession, attempt: AnswerRecord): StudySession {
  const isBlank = attempt.acertou === null;
  const correct = session.correct + (attempt.acertou === true ? 1 : 0);
  const wrong = session.wrong + (attempt.acertou === false ? 1 : 0);
  const blank = session.blank + (isBlank ? 1 : 0);
  const evaluated = correct + wrong;
  return {
    ...session,
    answered: session.answered + 1,
    correct,
    wrong,
    blank,
    accuracy: evaluated ? correct / evaluated : undefined,
    totalTimeSeconds: (session.totalTimeSeconds ?? 0) + attempt.tempoGasto / 1000,
  };
}

function finishSession(session: StudySession, finishedAt: number): StudySession {
  const evaluated = session.correct + session.wrong;
  return {
    ...session,
    finishedAt: new Date(finishedAt).toISOString(),
    accuracy: evaluated ? session.correct / evaluated : undefined,
    totalTimeSeconds: Math.max(
      session.totalTimeSeconds ?? 0,
      (finishedAt - new Date(session.startedAt).getTime()) / 1000,
    ),
  };
}

export function useStudyApp() {
  const [view, setView] = useState<ViewKey>('dashboard');
  const [state, setState] = useState<AppState>(createDefaultState);
  const [storageReady, setStorageReady] = useState(false);
  const [trainingQueue, setTrainingQueue] = useState<Question[]>([]);
  const [trainingIndex, setTrainingIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<'CERTO' | 'ERRADO' | null>(null);
  const [answerConfirmed, setAnswerConfirmed] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [trainingNotice, setTrainingNotice] = useState('');
  const [simuladoNotice, setSimuladoNotice] = useState('');
  const [activeSessionId, setActiveSessionId] = useState('');
  const [activeMode, setActiveMode] = useState<NonNullable<AnswerRecord['mode']>>('TREINO');
  const [simuladoSession, setSimuladoSession] = useState<SimuladoSession | null>(null);

  useEffect(() => {
    let active = true;
    storageService.get(STORAGE_KEY, createDefaultState()).then((saved) => {
      if (!active) return;
      const partial = saved as Partial<AppState>;
      setState({
        ...createDefaultState(),
        ...partial,
        questions: Array.isArray(partial.questions) ? partial.questions : sampleQuestions,
        attempts: Array.isArray(partial.attempts) ? partial.attempts : [],
        sessions: Array.isArray(partial.sessions) ? partial.sessions : [],
        marks: partial.marks ?? {},
        settings: {
          ...defaultSettings,
          ...partial.settings,
          dailyGoal: partial.settings?.dailyGoal ?? defaultSettings.dailyGoal,
          simulado: { ...defaultSettings.simulado, ...partial.settings?.simulado },
        },
      });
      setStorageReady(true);
    }).catch(() => {
      if (active) setStorageReady(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (storageReady) void storageService.set(STORAGE_KEY, state);
  }, [state, storageReady]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const isDark = state.settings.theme === 'dark' || (state.settings.theme === 'system' && mediaQuery.matches);
      document.documentElement.classList.toggle('dark', isDark);
    };
    applyTheme();
    if (state.settings.theme === 'system') {
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
  }, [state.settings.theme]);

  const updateState = useCallback((updater: (current: AppState) => AppState) => {
    setState((current) => updater(current));
  }, []);

  const progressByQuestion = useMemo(
    () => deriveProgressByQuestion(state.questions, state.attempts),
    [state.attempts, state.questions],
  );

  const stats = useMemo<DashboardStats>(() => {
    const attempts = state.attempts;
    const acertos = attempts.filter((item) => item.acertou === true).length;
    const erros = attempts.filter((item) => item.acertou === false).length;
    const emBranco = attempts.filter((item) => item.acertou === null).length;
    const total = attempts.length;
    const avaliadas = acertos + erros;
    const percentual = avaliadas > 0 ? Math.round((acertos / avaliadas) * 100) : 0;

    const uniqueQuestionIds = new Set(attempts.map((item) => item.questionId));
    const naoRespondidas = state.questions.length - uniqueQuestionIds.size;

    const recentErrors = attempts.filter((attempt) => {
      const date = new Date(attempt.data);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      return attempt.acertou === false && date >= cutoff;
    }).length;

    const byDiscipline = new Map<string, { total: number; acertos: number; erros: number }>();

    for (const attempt of attempts) {
      if (attempt.acertou === null) continue;
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

    const currentStreak = [...attempts].sort((left, right) => new Date(left.data).getTime() - new Date(right.data).getTime()).reduce((streak, attempt) => {
      if (attempt.acertou === true) return streak + 1;
      return 0;
    }, 0);

    const today = new Date();
    const respondidasHoje = attempts.filter((attempt) => {
      const date = new Date(attempt.data);
      return date.toDateString() === today.toDateString();
    }).length;

    const avgTime = avaliadas > 0
      ? Math.round(attempts.filter((item) => item.acertou !== null).reduce((sum, item) => sum + item.tempoGasto, 0) / avaliadas / 1000)
      : 0;
    const progressoDiario = attempts.filter((attempt) => new Date(attempt.data).toDateString() === new Date().toDateString()).length;

    const paraRevisao = [...progressByQuestion.values()].filter((progress) => isReviewOverdue(progress)).length;

    return {
      respondidas: total,
      acertos,
      erros,
      emBranco,
      avaliadas,
      percentual,
      naoRespondidas,
      paraRevisao,
      errosRecentes: recentErrors,
      melhorDisciplina: bestDiscipline,
      piorDisciplina: piorDisciplina,
      sequenciaAtual: currentStreak,
      respondidasHoje: respondidasHoje,
      tempoMedio: avgTime,
      metaDiaria: state.settings.dailyGoal,
      progressoDiario,
    };
  }, [progressByQuestion, state.attempts, state.questions]);

  const topicProgress = useMemo<TopicProgress[]>(
    () => calculateTopicProgress(state.questions, state.attempts, new Date(), progressByQuestion),
    [progressByQuestion, state.attempts, state.questions],
  );
  const recommendation = useMemo(
    () => getNextRecommendation(state.attempts, state.questions, new Date(), progressByQuestion),
    [progressByQuestion, state.attempts, state.questions],
  );

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
      if (attempt.acertou === null) continue;
      if (attempt.acertou) summary.acertos += 1;
      else summary.erros += 1;
    }

    return [...map.entries()].map(([name, summary]) => {
      const relatedTopics = topicProgress.filter((topic) => topic.disciplina === name);
      const questionCount = relatedTopics.reduce((sum, topic) => sum + topic.questionCount, 0);
      const prioridadeScore = questionCount
        ? Math.round(relatedTopics.reduce((sum, topic) => sum + topic.priorityScore * topic.questionCount, 0) / questionCount)
        : 0;
      const trend: TopicProgress['trend'] = relatedTopics.some((topic) => topic.trend === 'down')
        ? 'down'
        : relatedTopics.length && relatedTopics.every((topic) => topic.trend === 'up')
          ? 'up'
          : relatedTopics.some((topic) => topic.trend === 'stable')
            ? 'stable'
            : 'insufficient';

      return {
        name,
        count: summary.total,
        totalAnswered: summary.acertos + summary.erros,
        acertos: summary.acertos,
        erros: summary.erros,
        percentual: summary.acertos + summary.erros > 0 ? Math.round((summary.acertos / (summary.acertos + summary.erros)) * 100) : 0,
        prioridadeScore,
        trend,
      };
    });
  }, [state.attempts, state.questions, topicProgress]);

  const reviewItems = useMemo<ReviewItem[]>(() => {
    const topicsByKey = new Map(topicProgress.map((topic) => [`${topic.disciplina}\u0000${topic.assunto}`, topic]));
    const items = state.questions.flatMap((question) => {
      const progress = progressByQuestion.get(question.id);
      if (!progress) return [];
      const isMarked = Boolean(state.marks[question.id]?.revisar || state.marks[question.id]?.dificil);
      const overdue = isReviewOverdue(progress);
      if (!progress.timesSeen || (!progress.timesWrong && !isMarked && !overdue)) return [];

      const topic = topicsByKey.get(`${question.disciplina}\u0000${question.assunto}`);
      return [{
        questionId: question.id,
        disciplina: question.disciplina,
        assunto: question.assunto,
        data: progress.lastSeenAt ? new Date(progress.lastSeenAt).toLocaleDateString('pt-BR') : '—',
        erros: progress.timesWrong,
        ultimaResposta: progress.lastAnswer ?? null,
        proximaRevisao: progress.nextReviewAt ? new Date(progress.nextReviewAt).toLocaleDateString('pt-BR') : 'Não agendada',
        prioridade: topic && topic.priorityScore >= 65 ? 'alta' as const : topic && topic.priorityScore >= 35 ? 'média' as const : 'baixa' as const,
        vencida: overdue,
      }];
    });

    const priorityOrder = { alta: 0, média: 1, baixa: 2 };
    return items.sort((left, right) => Number(right.vencida) - Number(left.vencida) || priorityOrder[left.prioridade] - priorityOrder[right.prioridade]);
  }, [progressByQuestion, state.attempts, state.marks, state.questions, topicProgress]);

  const notebookItems = useMemo<NotebookItem[]>(
    () => buildNotebookItems(state.questions, state.attempts, state.marks, progressByQuestion, topicProgress),
    [progressByQuestion, state.attempts, state.marks, state.questions, topicProgress],
  );

  const history = useMemo(() => [...state.attempts].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()), [state.attempts]);

  const startTraining = useCallback((filters?: { disciplina?: string; assunto?: string; priorityTopic?: string; quantidade?: number; mode?: Recommendation['mode'] }) => {
    const modeMap: Record<NonNullable<Recommendation['mode']>, QuestionSelectionMode> = {
      TREINO: 'practice',
      REVISAO: 'review',
      ERROS: 'errors',
      NAO_VISTAS: 'unseen',
    };
    const requested = filters?.quantidade ?? 10;
    const selection = selectQuestionsForSession({
      questions: state.questions,
      attempts: state.attempts,
      quantity: requested,
      discipline: filters?.disciplina,
      topic: filters?.assunto,
      priorityTopic: filters?.priorityTopic,
      mode: filters?.mode ? modeMap[filters.mode] : 'practice',
    });

    setTrainingQueue(selection.questions);
    setTrainingIndex(0);
    setSelectedAnswer(null);
    setAnswerConfirmed(false);
    setStartTime(selection.questions.length ? Date.now() : 0);
    const sessionId = createSessionId();
    const mode = filters?.mode ?? 'TREINO';
    setActiveSessionId(sessionId);
    setActiveMode(mode);
    updateState((current) => ({
      ...current,
      sessions: [...current.sessions, createOpenSession(sessionId, selection.questions, mode)],
    }));
    setTrainingNotice(selection.questions.length < requested
      ? `Encontradas ${selection.questions.length} de ${requested} questões elegíveis. ${selection.recentlyExcluded} questão(ões) recente(s) ficaram de fora para evitar repetição.`
      : '');
    setView('train');
  }, [state.attempts, state.questions, updateState]);

  const currentTrainingQuestion = trainingQueue[trainingIndex] ?? null;

  const recordAnswer = useCallback((
    question: Question,
    answer: 'CERTO' | 'ERRADO',
    metadata?: { sessionId?: string; mode?: NonNullable<AnswerRecord['mode']>; confidence?: number },
  ) => {
    if (answerConfirmed) return;
    const acertou = answer === question.respostaCorreta;
    const timeSpentMs = Math.max(1000, Date.now() - startTime);
    const answeredAt = new Date().toISOString();
    const record: AnswerRecord = {
      id: `${question.id}-${createSessionId()}`,
      questionId: question.id,
      disciplina: question.disciplina,
      assunto: question.assunto,
      resposta: answer,
      acertou,
      tempoGasto: timeSpentMs,
      data: answeredAt,
      dificuldade: question.dificuldade,
      tentativa: (state.attempts.filter((item) => item.questionId === question.id).length || 0) + 1,
      revisada: false,
      startedAt: startTime ? new Date(startTime).toISOString() : answeredAt,
      answeredAt,
      sessionId: metadata?.sessionId ?? activeSessionId,
      mode: metadata?.mode ?? activeMode,
      confidence: metadata?.confidence,
    };

    updateState((current) => ({
      ...current,
      attempts: [...current.attempts, record],
      sessions: current.sessions.map((session) => session.id === record.sessionId
        ? updateSession(session, record)
        : session),
    }));

    setSelectedAnswer(answer);
    setAnswerConfirmed(true);
  }, [activeMode, activeSessionId, answerConfirmed, startTime, state.attempts, updateState]);

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
    updateState((current) => ({
      ...current,
      sessions: current.sessions.map((session) => session.id === activeSessionId
        ? finishSession(session, Date.now())
        : session),
    }));
    setView('dashboard');
  }, [activeSessionId, trainingIndex, trainingQueue.length, updateState]);

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

  const exportJson = useCallback((kind: ExportKind = 'backup') => {
    const payload = createExportPayload(state, kind);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pmma-${kind}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [state]);

  const importJson = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (typeof result !== 'string') throw new Error('Invalid file');
        const parsed: unknown = JSON.parse(result);
        const report = importStudyData(parsed, state);
        if (report.changed) setState(report.state);
        const attemptSummary = report.attemptsAnalyzed
          ? `\nTentativas: ${report.attemptsImported}/${report.attemptsAnalyzed} importadas, ${report.attemptsDuplicates} duplicadas, ${report.attemptsInvalid} inválidas`
          : '';
        alert(`Questões analisadas: ${report.analyzed}\nImportadas: ${report.imported}\nDuplicadas: ${report.duplicates}\nInválidas: ${report.invalid}${attemptSummary}${report.changed ? '' : '\nNenhuma alteração foi aplicada.'}`);
      } catch (error) {
        alert(`Erro ao importar: ${error instanceof Error ? error.message : 'arquivo inválido'}`);
      }
    };
    reader.readAsText(file);
  }, [state]);

  const startSimulado = useCallback((disciplinas: string[], assuntos: string[], difficulty: Question['dificuldade'] | 'todas', quantity: number, timeLimitMinutes: number, penalty: number) => {
    const filtered = state.questions.filter((question) =>
      (!disciplinas.length || disciplinas.includes(question.disciplina)) &&
      (!assuntos.length || assuntos.includes(question.assunto)) &&
      (difficulty === 'todas' || question.dificuldade === difficulty),
    );
    const selection = selectQuestionsForSession({
      questions: filtered,
      attempts: state.attempts,
      quantity,
      mode: 'mixed',
      excludeRecentlySeenHours: 0,
    });
    const sessionId = createSessionId();
    const startedAt = Date.now();
    setSimuladoNotice(selection.questions.length < quantity
      ? `O banco tem ${selection.questions.length} questões elegíveis para este simulado; nenhuma foi duplicada.`
      : '');
    if (!selection.questions.length) {
      setSimuladoSession(null);
      return;
    }

    setSimuladoSession({
      questions: selection.questions,
      index: 0,
      startedAt,
      questionStartedAt: startedAt,
      sessionId,
      answers: {},
      elapsedByQuestion: {},
      finished: false,
    });
    updateState((current) => ({
      ...current,
      sessions: [...current.sessions, createOpenSession(sessionId, selection.questions, 'SIMULADO')],
    }));
    setActiveSessionId(sessionId);
    setActiveMode('SIMULADO');
    setSelectedAnswer(null);
    setAnswerConfirmed(false);
    setStartTime(startedAt);
    setState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        simulado: { ...current.settings.simulado, quantidade: quantity, tempoMinutos: timeLimitMinutes, penalidade: penalty, disciplinas, assuntos, dificuldade: difficulty },
      },
    }));
    setView('simulado');
  }, [state.attempts, state.questions, updateState]);

  const simuladoCurrent = simuladoSession && !simuladoSession.finished
    ? simuladoSession.questions[simuladoSession.index] ?? null
    : null;

  const answerSimuladoQuestion = useCallback((answer: AnswerValue | null) => {
    setSimuladoSession((current) => {
      if (!current || current.finished) return current;
      const question = current.questions[current.index];
      return question ? { ...current, answers: { ...current.answers, [question.id]: answer } } : current;
    });
  }, []);

  const moveSimuladoQuestion = useCallback((nextIndex: number) => {
    setSimuladoSession((current) => {
      if (!current || current.finished || nextIndex < 0 || nextIndex >= current.questions.length) return current;
      const question = current.questions[current.index];
      const elapsed = Math.max(0, Date.now() - current.questionStartedAt);
      return {
        ...current,
        index: nextIndex,
        questionStartedAt: Date.now(),
        elapsedByQuestion: question
          ? { ...current.elapsedByQuestion, [question.id]: (current.elapsedByQuestion[question.id] ?? 0) + elapsed }
          : current.elapsedByQuestion,
      };
    });
  }, []);

  const finishSimulado = useCallback(() => {
    if (!simuladoSession) {
      setView('dashboard');
      return;
    }
    if (simuladoSession.finished) {
      setSimuladoSession(null);
      setView('dashboard');
      return;
    }

    const finishedAt = Date.now();
    const currentQuestion = simuladoSession.questions[simuladoSession.index];
    const elapsedByQuestion = { ...simuladoSession.elapsedByQuestion };
    if (currentQuestion) {
      elapsedByQuestion[currentQuestion.id] = (elapsedByQuestion[currentQuestion.id] ?? 0) + Math.max(0, finishedAt - simuladoSession.questionStartedAt);
    }

    updateState((current) => {
      const attemptsByQuestion = new Map<string, number>();
      for (const attempt of current.attempts) attemptsByQuestion.set(attempt.questionId, (attemptsByQuestion.get(attempt.questionId) ?? 0) + 1);
      const sessionAttempts: AnswerRecord[] = simuladoSession.questions.map((question, index) => {
        const answer = simuladoSession.answers[question.id] ?? null;
        return {
          id: `${simuladoSession.sessionId}-${question.id}-${index}`,
          questionId: question.id,
          disciplina: question.disciplina,
          assunto: question.assunto,
          resposta: answer ?? 'EM_BRANCO',
          acertou: answer === null ? null : answer === question.respostaCorreta,
          tempoGasto: elapsedByQuestion[question.id] ?? 0,
          data: new Date(finishedAt).toISOString(),
          startedAt: new Date(simuladoSession.startedAt).toISOString(),
          answeredAt: new Date(finishedAt).toISOString(),
          sessionId: simuladoSession.sessionId,
          mode: 'SIMULADO',
          dificuldade: question.dificuldade,
          tentativa: (attemptsByQuestion.get(question.id) ?? 0) + 1,
          revisada: false,
        };
      });
      const updatedSessions = current.sessions.map((session) => {
        if (session.id !== simuladoSession.sessionId) return session;
        const updated = sessionAttempts.reduce((currentSession, attempt) => updateSession(currentSession, attempt), session);
        return finishSession(updated, finishedAt);
      });
      return { ...current, attempts: [...current.attempts, ...sessionAttempts], sessions: updatedSessions };
    });
    setSimuladoSession({ ...simuladoSession, elapsedByQuestion, finished: true, finishedAt });
  }, [simuladoSession, updateState]);

  const resetApp = useCallback((scope: 'all' | 'progress' | 'history' | 'questions' = 'all') => {
    setState((current) => {
      if (scope === 'progress') return { ...current, attempts: [], sessions: [], marks: {} };
      if (scope === 'history') return { ...current, attempts: [], sessions: [] };
      if (scope === 'questions') return { ...current, questions: [], attempts: [], sessions: [], marks: {} };
      return createDefaultState();
    });
    setTrainingQueue([]);
    setTrainingIndex(0);
    setSimuladoSession(null);
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
    topicProgress,
    recommendation,
    reviewItems,
    notebookItems,
    trainingNotice,
    simuladoNotice,
    storageReady,
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
    moveSimuladoQuestion,
    finishSimulado,
    resetApp,
  };
}
