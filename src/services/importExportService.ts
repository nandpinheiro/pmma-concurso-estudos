import type { AnswerRecord, AppState, Difficulty, MarkState, Question, UserSettings } from '../types';
import { deriveProgressByQuestion } from '../algorithms/reviewAlgorithm';

export type ExportKind = 'backup' | 'questions' | 'history' | 'progress';

export interface ImportReport {
  state: AppState;
  analyzed: number;
  imported: number;
  duplicates: number;
  invalid: number;
  attemptsAnalyzed: number;
  attemptsImported: number;
  attemptsDuplicates: number;
  attemptsInvalid: number;
  changed: boolean;
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeDifficulty(value: unknown): Difficulty | undefined {
  if (value === 'fácil' || value === 'FACIL' || value === 'FÁCIL') return 'fácil';
  if (value === 'média' || value === 'MEDIA' || value === 'MÉDIA') return 'média';
  if (value === 'difícil' || value === 'DIFICIL' || value === 'DIFÍCIL') return 'difícil';
  return undefined;
}

function normalizeQuestion(value: unknown): Question | undefined {
  if (!isRecord(value)) return undefined;
  const id = text(value.id);
  const disciplina = text(value.disciplina) ?? text(value.disciplineId);
  const assunto = text(value.assunto) ?? text(value.topicId);
  const enunciado = text(value.enunciado) ?? text(value.statement);
  const respostaCorreta = value.respostaCorreta ?? value.correctAnswer;
  const dificuldade = normalizeDifficulty(value.dificuldade ?? value.difficulty);
  if (!id || !disciplina || !assunto || !enunciado || !dificuldade) return undefined;
  if (respostaCorreta !== 'CERTO' && respostaCorreta !== 'ERRADO') return undefined;
  if (!Array.isArray(value.tags) || !value.tags.every((tag) => typeof tag === 'string')) return undefined;
  if (value.active !== undefined && typeof value.active !== 'boolean') return undefined;
  if (value.year !== undefined && (typeof value.year !== 'number' || !Number.isInteger(value.year))) return undefined;
  if (value.organization !== undefined && typeof value.organization !== 'string') return undefined;

  return {
    id,
    disciplina,
    assunto,
    subassunto: text(value.subassunto) ?? text(value.subtopicId) ?? '',
    enunciado,
    respostaCorreta,
    comentario: text(value.comentario) ?? text(value.explanation) ?? '',
    fundamento: text(value.fundamento) ?? text(value.legalBasis) ?? '',
    pontoChave: text(value.pontoChave) ?? text(value.keyPoint) ?? '',
    dificuldade,
    fonte: text(value.fonte) ?? text(value.source) ?? '',
    tags: value.tags.map((tag) => (tag as string).trim()).filter(Boolean),
    active: value.active as boolean | undefined ?? true,
    pegadinha: text(value.pegadinha) ?? text(value.trap),
    year: value.year as number | undefined,
    organization: text(value.organization),
    isDemo: value.isDemo === true,
  };
}

function normalizeAttempts(value: unknown, questions: Question[]): { attempts: AnswerRecord[]; analyzed: number; duplicates: number; invalid: number } {
  if (!Array.isArray(value)) return { attempts: [], analyzed: value === undefined ? 0 : 1, duplicates: 0, invalid: value === undefined ? 0 : 1 };
  const questionIds = new Set(questions.map((question) => question.id));
  const seenIds = new Set<string>();
  const attempts: AnswerRecord[] = [];
  let duplicates = 0;
  let invalid = 0;

  for (const item of value) {
    if (!isRecord(item)) {
      invalid += 1;
      continue;
    }
    const id = text(item.id);
    const questionId = text(item.questionId);
    const disciplina = text(item.disciplina) ?? text(item.disciplineId);
    const assunto = text(item.assunto) ?? text(item.topicId);
    const data = text(item.data) ?? text(item.answeredAt);
    const dificuldade = normalizeDifficulty(item.dificuldade ?? item.difficulty);
    const resposta = item.resposta ?? item.answer;
    const acertou = item.acertou ?? item.isCorrect;
    const tempoGasto = typeof item.tempoGasto === 'number'
      ? item.tempoGasto
      : typeof item.responseTimeSeconds === 'number'
        ? item.responseTimeSeconds * 1000
        : undefined;
    if (id && seenIds.has(id)) {
      duplicates += 1;
      continue;
    }
    if (!id || !questionId || !questionIds.has(questionId) || !disciplina || !assunto || !data || Number.isNaN(Date.parse(data)) || !dificuldade) {
      invalid += 1;
      continue;
    }
    if (resposta !== 'CERTO' && resposta !== 'ERRADO' && resposta !== 'EM_BRANCO' && resposta !== null) {
      invalid += 1;
      continue;
    }
    if (acertou !== true && acertou !== false && acertou !== null) {
      invalid += 1;
      continue;
    }
    if ((resposta === 'EM_BRANCO' || resposta === null) !== (acertou === null) || tempoGasto === undefined || tempoGasto < 0) {
      invalid += 1;
      continue;
    }

    seenIds.add(id);
    attempts.push({
      id,
      questionId,
      disciplina,
      assunto,
      resposta,
      acertou,
      tempoGasto,
      data,
      startedAt: text(item.startedAt),
      answeredAt: text(item.answeredAt),
      sessionId: text(item.sessionId),
      mode: item.mode === 'REVISAO' || item.mode === 'SIMULADO' || item.mode === 'ERROS' || item.mode === 'NAO_VISTAS' ? item.mode : 'TREINO',
      confidence: typeof item.confidence === 'number' && item.confidence >= 1 && item.confidence <= 5 ? item.confidence : undefined,
      dificuldade,
      tentativa: typeof item.tentativa === 'number' && item.tentativa > 0 ? item.tentativa : 1,
      revisada: item.revisada === true,
    });
  }

  return { attempts, analyzed: value.length, duplicates, invalid };
}

function normalizeMarks(value: unknown, questions: Question[]): Record<string, MarkState> {
  if (!isRecord(value)) return {};
  const questionIds = new Set(questions.map((question) => question.id));
  const marks: Record<string, MarkState> = {};
  for (const [questionId, item] of Object.entries(value)) {
    if (!questionIds.has(questionId) || !isRecord(item)) continue;
    marks[questionId] = {
      favorita: item.favorita === true,
      revisar: item.revisar === true,
      pegadinha: item.pegadinha === true,
      dificil: item.dificil === true,
    };
  }
  return marks;
}

function normalizeSettings(value: unknown, fallback: UserSettings): UserSettings {
  if (!isRecord(value)) return fallback;
  const simulado = isRecord(value.simulado) ? value.simulado : {};
  return {
    theme: value.theme === 'dark' ? 'dark' : value.theme === 'light' ? 'light' : fallback.theme,
    reviewInterval: typeof value.reviewInterval === 'number' && value.reviewInterval > 0 ? value.reviewInterval : fallback.reviewInterval,
    showDemoQuestions: typeof value.showDemoQuestions === 'boolean' ? value.showDemoQuestions : fallback.showDemoQuestions,
    simulado: {
      ...fallback.simulado,
      quantidade: typeof simulado.quantidade === 'number' && simulado.quantidade > 0 ? simulado.quantidade : fallback.simulado.quantidade,
      tempoMinutos: typeof simulado.tempoMinutos === 'number' && simulado.tempoMinutos > 0 ? simulado.tempoMinutos : fallback.simulado.tempoMinutos,
      penalidade: typeof simulado.penalidade === 'number' && simulado.penalidade >= 0 ? simulado.penalidade : fallback.simulado.penalidade,
      disciplinas: Array.isArray(simulado.disciplinas) && simulado.disciplinas.every((item) => typeof item === 'string') ? simulado.disciplinas : fallback.simulado.disciplinas,
    },
  };
}

export function importStudyData(raw: unknown, current: AppState): ImportReport {
  const payload = isRecord(raw) ? raw : undefined;
  const version = payload?.schemaVersion;
  if (typeof version === 'number' && version > 1) throw new Error(`Versão de backup ${version} não é compatível com esta versão do aplicativo.`);
  const isHistoryOnly = Boolean(payload && !Array.isArray(payload.questions) && Array.isArray(payload.attempts));
  if (isHistoryOnly && payload) {
    const attemptReport = normalizeAttempts(payload.attempts, current.questions);
    const currentIds = new Set(current.attempts.map((attempt) => attempt.id));
    const newAttempts = attemptReport.attempts.filter((attempt) => !currentIds.has(attempt.id));
    const duplicateCount = attemptReport.duplicates + attemptReport.attempts.length - newAttempts.length;
    return {
      state: { ...current, attempts: [...current.attempts, ...newAttempts] },
      analyzed: 0,
      imported: 0,
      duplicates: 0,
      invalid: 0,
      attemptsAnalyzed: attemptReport.analyzed,
      attemptsImported: newAttempts.length,
      attemptsDuplicates: duplicateCount,
      attemptsInvalid: attemptReport.invalid,
      changed: newAttempts.length > 0,
    };
  }
  const questionValues = Array.isArray(raw) ? raw : payload?.questions;
  if (!Array.isArray(questionValues)) throw new Error('O arquivo deve conter uma lista questions ou ser uma lista de questões.');

  const isFullBackup = Boolean(payload && ('attempts' in payload || 'marks' in payload || 'settings' in payload));
  const questions: Question[] = [];
  const knownIds = new Set(isFullBackup ? [] : current.questions.map((question) => question.id));
  let duplicates = 0;
  let invalid = 0;
  for (const value of questionValues) {
    const question = normalizeQuestion(value);
    if (!question) {
      invalid += 1;
    } else if (knownIds.has(question.id)) {
      duplicates += 1;
    } else {
      questions.push(question);
      knownIds.add(question.id);
    }
  }

  if (isFullBackup && questions.length === 0 && questionValues.length > 0) {
    return { state: current, analyzed: questionValues.length, imported: 0, duplicates, invalid, attemptsAnalyzed: 0, attemptsImported: 0, attemptsDuplicates: 0, attemptsInvalid: 0, changed: false };
  }

  const allQuestions = isFullBackup ? questions : [...current.questions, ...questions];
  const attemptReport = isFullBackup ? normalizeAttempts(payload?.attempts, allQuestions) : { attempts: current.attempts, analyzed: 0, duplicates: 0, invalid: 0 };
  const state: AppState = isFullBackup
    ? {
        questions: allQuestions,
        attempts: attemptReport.attempts,
        marks: normalizeMarks(payload?.marks, allQuestions),
        settings: normalizeSettings(payload?.settings, current.settings),
      }
    : { ...current, questions: allQuestions };

  return {
    state,
    analyzed: questionValues.length,
    imported: questions.length,
    duplicates,
    invalid,
    attemptsAnalyzed: attemptReport.analyzed,
    attemptsImported: isFullBackup ? attemptReport.attempts.length : 0,
    attemptsDuplicates: attemptReport.duplicates,
    attemptsInvalid: attemptReport.invalid,
    changed: questions.length > 0 || isFullBackup,
  };
}

export function createExportPayload(state: AppState, kind: ExportKind, exportedAt = new Date()): unknown {
  const metadata = { schemaVersion: 1, exportedAt: exportedAt.toISOString() };
  if (kind === 'questions') return { ...metadata, questions: state.questions };
  if (kind === 'history') return { ...metadata, attempts: state.attempts };
  if (kind === 'progress') return { ...metadata, progress: [...deriveProgressByQuestion(state.questions, state.attempts).values()] };
  return {
    ...metadata,
    questions: state.questions,
    attempts: state.attempts,
    marks: state.marks,
    settings: state.settings,
  };
}