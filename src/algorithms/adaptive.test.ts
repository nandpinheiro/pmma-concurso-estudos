import { describe, expect, it } from 'vitest';
import type { AnswerRecord, Question } from '../types';
import { calculateTopicProgress } from './priorityAlgorithm';
import { getNextRecommendation } from './recommendation';
import { selectQuestionsForSession } from './questionSelectionAlgorithm';
import { calculateDailyPerformance, calculatePerformance } from './performanceAlgorithm';
import { createExportPayload, importStudyData } from '../services/importExportService';
import { calculateCebraspeScore } from './cebraspeAlgorithm';
import { buildNotebookItems } from './notebookAlgorithm';
import { deriveProgressByQuestion } from './reviewAlgorithm';
import { calculateTagPerformance } from './tagPerformanceAlgorithm';
import { calculateNextReview, deriveQuestionProgress } from './reviewAlgorithm';

const fixedNow = new Date('2026-09-28T12:00:00.000Z');
const dayInMs = 24 * 60 * 60 * 1000;

function makeQuestion(id: string, assunto = 'Assunto A', disciplina = 'História do Maranhão'): Question {
  return {
    id,
    disciplina,
    assunto,
    subassunto: 'Conceitos',
    enunciado: `Enunciado ${id}`,
    respostaCorreta: 'CERTO',
    comentario: 'Explicação demonstrativa.',
    fundamento: 'Exemplo didático.',
    pontoChave: 'Ponto-chave.',
    dificuldade: 'média',
    fonte: 'Exemplo didático',
    tags: [],
    isDemo: true,
  };
}

function makeAttempt(question: Question, correct: boolean, date: Date, index = 0): AnswerRecord {
  return {
    id: `${question.id}-${date.getTime()}-${index}`,
    questionId: question.id,
    disciplina: question.disciplina,
    assunto: question.assunto,
    resposta: correct ? 'CERTO' : 'ERRADO',
    acertou: correct,
    tempoGasto: 5000,
    data: date.toISOString(),
    dificuldade: question.dificuldade,
    tentativa: index + 1,
    revisada: false,
  };
}

describe('revisão espaçada', () => {
  it('agenda erro para amanhã e amplia intervalo após acerto', () => {
    const error = calculateNextReview({ correct: false, currentLevel: 4, difficulty: 'média', now: fixedNow });
    const recovered = calculateNextReview({ correct: true, currentLevel: error.level, difficulty: 'média', now: fixedNow });

    expect(error.level).toBe(1);
    expect(error.nextReviewAt).toBe(new Date(fixedNow.getTime() + dayInMs).toISOString());
    expect(recovered.level).toBe(2);
    expect(recovered.nextReviewAt).toBe(new Date(fixedNow.getTime() + 3 * dayInMs).toISOString());
  });

  it('não classifica uma única resposta correta como domínio consolidado', () => {
    const question = makeQuestion('small-sample');
    const progress = deriveQuestionProgress(question, [makeAttempt(question, true, fixedNow)], fixedNow);
    const topic = calculateTopicProgress([question], [makeAttempt(question, true, fixedNow)], fixedNow)[0];

    expect(progress.currentLevel).toBe(3);
    expect(topic.accuracy).toBe(1);
    expect(topic.confidence).toBeCloseTo(1 / 6);
    expect(topic.masteryScore).toBeLessThan(20);
  });

  it('marca dificuldade crítica quando questões diferentes do assunto são erradas', () => {
    const questions = Array.from({ length: 5 }, (_, index) => makeQuestion(`critical-${index}`));
    const attempts = questions.slice(0, 3).map((question, index) => makeAttempt(question, false, fixedNow, index));
    const topic = calculateTopicProgress(questions, attempts, fixedNow)[0];

    expect(topic.recurringErrors).toBe(3);
    expect(topic.errorClassification).toBe('ERRO_CRITICO');
  });
});

describe('recomendação e seleção', () => {
  it('recomenda o assunto com revisões vencidas e explica a quantidade', () => {
    const history = makeQuestion('due-history');
    const other = makeQuestion('unseen-computing', 'Segurança', 'Informática');
    const oldAttempt = makeAttempt(history, false, new Date(fixedNow.getTime() - 3 * dayInMs));
    const recommendation = getNextRecommendation([oldAttempt], [history, other], fixedNow);

    expect(recommendation.mode).toBe('REVISAO');
    expect(recommendation.disciplina).toBe(history.disciplina);
    expect(recommendation.assunto).toBe(history.assunto);
    expect(recommendation.motivo).toContain('1 revisão vencida');
  });

  it('retorna somente questões não vistas e não repete as respondidas recentemente', () => {
    const questions = Array.from({ length: 100 }, (_, index) => makeQuestion(`q-${index}`));
    const recentAttempts = questions.slice(0, 20).map((question, index) =>
      makeAttempt(question, true, new Date(fixedNow.getTime() - 60 * 60 * 1000), index),
    );
    const selection = selectQuestionsForSession({
      questions,
      attempts: recentAttempts,
      quantity: 100,
      mode: 'unseen',
      now: fixedNow,
    });

    expect(selection.questions).toHaveLength(80);
    expect(selection.recentlyExcluded).toBe(20);
    expect(selection.questions.some((question) => question.id === 'q-0')).toBe(false);
  });

  it('reduz a prioridade quando novas tentativas melhoram o aproveitamento', () => {
    const historyQuestions = Array.from({ length: 20 }, (_, index) => makeQuestion(`history-${index}`));
    const computingQuestions = Array.from({ length: 30 }, (_, index) => makeQuestion(`computing-${index}`, 'Segurança', 'Informática'));
    const portugueseQuestions = Array.from({ length: 40 }, (_, index) => makeQuestion(`portuguese-${index}`, 'Interpretação', 'Língua Portuguesa'));
    const questions = [...historyQuestions, ...computingQuestions, ...portugueseQuestions];
    const oldDate = new Date(fixedNow.getTime() - 5 * dayInMs);
    const initialAttempts = [
      ...historyQuestions.slice(0, 10).map((question, index) => makeAttempt(question, index < 2, oldDate, index)),
      ...computingQuestions.slice(0, 20).map((question, index) => makeAttempt(question, index >= 6, oldDate, index)),
      ...portugueseQuestions.slice(0, 25).map((question, index) => makeAttempt(question, index >= 5, oldDate, index)),
    ];
    const initialTopics = calculateTopicProgress(questions, initialAttempts, fixedNow);
    const improvedAttempts = historyQuestions.slice(0, 10).map((question, index) => makeAttempt(question, index < 8, fixedNow, index + 100));
    const updatedTopics = calculateTopicProgress(questions, [...initialAttempts, ...improvedAttempts], fixedNow);
    const initialHistoryPriority = initialTopics.find((topic) => topic.disciplina === 'História do Maranhão')!.priorityScore;
    const updatedHistoryPriority = updatedTopics.find((topic) => topic.disciplina === 'História do Maranhão')!.priorityScore;

    expect(initialTopics[0].disciplina).toBe('História do Maranhão');
    expect(updatedHistoryPriority).toBeLessThan(initialHistoryPriority);
  });

  it('seleciona aproximadamente 70% do assunto crítico e 30% de complementares', () => {
    const priorityQuestions = Array.from({ length: 10 }, (_, index) => makeQuestion(`priority-${index}`, 'França Equinocial'));
    const complementaryQuestions = Array.from({ length: 10 }, (_, index) => makeQuestion(`other-${index}`, 'Revolta de Bequimão'));
    const selection = selectQuestionsForSession({
      questions: [...priorityQuestions, ...complementaryQuestions],
      attempts: [],
      quantity: 10,
      mode: 'errors',
      priorityTopic: 'França Equinocial',
      now: fixedNow,
    });

    expect(selection.questions).toHaveLength(10);
    expect(selection.questions.filter((question) => question.assunto === 'França Equinocial')).toHaveLength(7);
    expect(selection.questions.filter((question) => question.assunto === 'Revolta de Bequimão')).toHaveLength(3);
  });
});

describe('desempenho recente', () => {
  it('trata banco vazio e amostra de uma resposta sem inferir tendência', () => {
    expect(calculatePerformance([]).windows.all.accuracy).toBeNull();
    const question = makeQuestion('one-performance');
    const summary = calculatePerformance([makeAttempt(question, true, fixedNow)]);

    expect(summary.windows['10'].accuracy).toBe(1);
    expect(summary.windows['10'].attempts).toBe(1);
    expect(summary.recentTrend).toBe('insufficient');
  });

  it('separa últimas 10 respostas do histórico completo e não pontua brancos', () => {
    const questions = Array.from({ length: 100 }, (_, index) => makeQuestion(`performance-${index}`));
    const attempts = questions.map((question, index) => makeAttempt(question, index < 80, new Date(fixedNow.getTime() + index * 1000), index));
    attempts[99] = { ...attempts[99], acertou: null, resposta: 'EM_BRANCO' };
    const summary = calculatePerformance(attempts);

    expect(summary.windows.all.accuracy).toBeCloseTo(80 / 99);
    expect(summary.windows['10'].accuracy).toBeCloseTo(0);
    expect(summary.windows['10'].blank).toBe(1);
    expect(summary.recentTrend).toBe('down');
  });

  it('agrega evolução diária e respeita o período solicitado', () => {
    const question = makeQuestion('daily-performance');
    const old = makeAttempt(question, true, new Date(fixedNow.getTime() - 10 * dayInMs));
    const recent = makeAttempt(question, false, new Date(fixedNow.getTime() - 2 * dayInMs), 1);

    expect(calculateDailyPerformance([old, recent], 7)).toHaveLength(1);
    expect(calculateDailyPerformance([old, recent])).toHaveLength(2);
  });
});

describe('importação e backup', () => {
  it('valida aliases, rejeita questões inválidas e informa duplicatas', () => {
    const existing = makeQuestion('existing');
    const current = {
      questions: [existing],
      attempts: [],
      sessions: [],
      marks: {},
      settings: {
        theme: 'light' as const,
        reviewInterval: 3,
        showDemoQuestions: true,
        dailyGoal: 20,
        simulado: { quantidade: 10, tempoMinutos: 40, penalidade: 1, incluirIneditas: true, disciplinas: [], assuntos: [], dificuldade: 'todas' as const },
      },
    };
    const valid = {
      id: 'imported',
      statement: 'Enunciado importado.',
      correctAnswer: 'CERTO',
      disciplineId: 'Informática',
      topicId: 'Redes',
      difficulty: 'FACIL',
      tags: ['conceito'],
      source: 'Exemplo próprio',
    };
    const report = importStudyData([valid, valid, { ...valid, id: existing.id }, { ...valid, id: 'invalid', tags: 'não é lista' }], current);

    expect(report.analyzed).toBe(4);
    expect(report.imported).toBe(1);
    expect(report.duplicates).toBe(2);
    expect(report.invalid).toBe(1);
    expect(report.state.questions[1].disciplina).toBe('Informática');
    expect(report.state.questions[1].dificuldade).toBe('fácil');
  });

  it('exporta e restaura um backup completo versionado', () => {
    const question = makeQuestion('backup-q');
    const attempt = makeAttempt(question, false, fixedNow);
    const original = {
      questions: [question],
      attempts: [attempt],
      sessions: [],
      marks: { [question.id]: { favorita: true, revisar: true, pegadinha: false, dificil: false } },
      settings: {
        theme: 'dark' as const,
        reviewInterval: 5,
        showDemoQuestions: true,
        dailyGoal: 30,
        simulado: { quantidade: 15, tempoMinutos: 60, penalidade: 0.5, incluirIneditas: true, disciplinas: [question.disciplina], assuntos: [], dificuldade: 'todas' as const },
      },
    };
    const backup = createExportPayload(original, 'backup', fixedNow);
    const emptyState = { ...original, questions: [], attempts: [], marks: {} };
    const restored = importStudyData(backup, emptyState);

    expect(backup).toMatchObject({ schemaVersion: 1, exportedAt: fixedNow.toISOString() });
    expect(restored.state.questions).toHaveLength(1);
    expect(restored.state.attempts).toHaveLength(1);
    expect(restored.state.marks[question.id].favorita).toBe(true);
    expect(restored.state.settings.simulado.penalidade).toBe(0.5);

    const backupPayload = createExportPayload(original, 'backup', fixedNow) as { questions: Question[]; attempts: unknown[]; marks: object; settings: object; schemaVersion: number; exportedAt: string };
    const withInvalidAttempt = importStudyData({ ...backupPayload, attempts: [...backupPayload.attempts, { id: 'invalid-attempt' }] }, emptyState);
    expect(withInvalidAttempt.attemptsAnalyzed).toBe(2);
    expect(withInvalidAttempt.attemptsImported).toBe(1);
    expect(withInvalidAttempt.attemptsInvalid).toBe(1);

    const canonicalAttempt = {
      id: 'canonical-attempt',
      questionId: question.id,
      answer: 'CERTO',
      isCorrect: true,
      startedAt: fixedNow.toISOString(),
      answeredAt: fixedNow.toISOString(),
      responseTimeSeconds: 3,
      disciplineId: question.disciplina,
      topicId: question.assunto,
      difficulty: 'MEDIA',
      mode: 'TREINO',
    };
    const canonicalRestore = importStudyData({ ...backupPayload, attempts: [canonicalAttempt] }, emptyState);
    expect(canonicalRestore.state.attempts[0].tempoGasto).toBe(3000);

    const historyExport = createExportPayload(original, 'history', fixedNow);
    const historyRestore = importStudyData(historyExport, { ...original, attempts: [] });
    expect(historyRestore.attemptsImported).toBe(1);
    expect(historyRestore.state.questions).toHaveLength(1);
    expect(historyRestore.state.settings.theme).toBe('dark');
  });
});

describe('pontuação CEBRASPE', () => {
  it('separa aproveitamento de pontuação líquida e permite ajustar a penalidade', () => {
    const defaultScore = calculateCebraspeScore([true, true, false, null]);
    const customScore = calculateCebraspeScore([true, true, false, null], 0.5);

    expect(defaultScore.accuracy).toBeCloseTo(2 / 3);
    expect(defaultScore.netScore).toBe(1);
    expect(defaultScore.blank).toBe(1);
    expect(customScore.netScore).toBe(1.5);
    expect(calculateCebraspeScore([], 1).accuracy).toBeNull();
  });
});

describe('Caderno Inteligente', () => {
  it('preenche categorias com erros recentes/recorrentes, vencimentos, marcas e questões não vistas', () => {
    const recentErrorOne = makeQuestion('notebook-error-1', 'Cronologia');
    const recentErrorTwo = makeQuestion('notebook-error-2', 'Cronologia');
    const marked = { ...makeQuestion('notebook-marked', 'Conceitos'), tags: ['pegadinha'] };
    const overdue = makeQuestion('notebook-overdue', 'Revisão');
    const questions = [recentErrorOne, recentErrorTwo, marked, overdue];
    const attempts = [
      makeAttempt(recentErrorOne, false, fixedNow),
      makeAttempt(recentErrorTwo, false, fixedNow, 1),
      makeAttempt(overdue, false, new Date(fixedNow.getTime() - 3 * dayInMs)),
    ];
    const marks = {
      [marked.id]: { favorita: true, revisar: false, pegadinha: false, dificil: true },
    };
    const progress = deriveProgressByQuestion(questions, attempts, fixedNow);
    const topics = calculateTopicProgress(questions, attempts, fixedNow, progress);
    const items = buildNotebookItems(questions, attempts, marks, progress, topics, fixedNow);
    const categoriesById = new Map(items.map((item) => [item.questionId, item.categorias]));

    expect(categoriesById.get(recentErrorOne.id)).toContain('ERROS_RECENTES');
    expect(categoriesById.get(recentErrorOne.id)).toContain('ERROS_RECORRENTES');
    expect(categoriesById.get(overdue.id)).toContain('REVISOES_VENCIDAS');
    expect(categoriesById.get(marked.id)).toEqual(expect.arrayContaining(['FAVORITAS', 'QUESTOES_DIFICEIS', 'PEGADINHAS', 'NAO_VISTAS']));
  });
});

it('calcula taxa de erro por tag sem contar respostas em branco', () => {
  const exceptionQuestion = { ...makeQuestion('tag-exception'), tags: ['exceção'] };
  const attempts = [
    makeAttempt(exceptionQuestion, false, fixedNow),
    makeAttempt(exceptionQuestion, true, new Date(fixedNow.getTime() + 1000), 1),
    { ...makeAttempt(exceptionQuestion, false, new Date(fixedNow.getTime() + 2000), 2), acertou: null, resposta: 'EM_BRANCO' as const },
  ];
  const performance = calculateTagPerformance([exceptionQuestion], attempts)[0];

  expect(performance.tag).toBe('EXCEÇÃO');
  expect(performance.attempts).toBe(2);
  expect(performance.errorRate).toBe(0.5);
});