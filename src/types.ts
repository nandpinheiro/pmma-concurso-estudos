export type Difficulty = 'fácil' | 'média' | 'difícil';
export type AnswerValue = 'CERTO' | 'ERRADO';
export type ReviewPriority = 'alta' | 'média' | 'baixa';
export type ViewKey =
  | 'dashboard'
  | 'disciplinas'
  | 'train'
  | 'caderno'
  | 'review'
  | 'performance'
  | 'prioridades'
  | 'historico'
  | 'settings'
  | 'simulado';

export interface Question {
  id: string;
  disciplina: string;
  assunto: string;
  subassunto: string;
  enunciado: string;
  respostaCorreta: AnswerValue;
  comentario: string;
  fundamento: string;
  pontoChave: string;
  dificuldade: Difficulty;
  fonte: string;
  tags: string[];
  active?: boolean;
  pegadinha?: string;
  year?: number;
  organization?: string;
  isDemo?: boolean;
}

export interface AnswerRecord {
  id: string;
  questionId: string;
  disciplina: string;
  assunto: string;
  resposta: AnswerValue | 'EM_BRANCO' | null;
  acertou: boolean | null;
  tempoGasto: number;
  data: string;
  dificuldade: Difficulty;
  tentativa: number;
  revisada: boolean;
  startedAt?: string;
  answeredAt?: string;
  sessionId?: string;
  mode?: 'TREINO' | 'REVISAO' | 'SIMULADO' | 'ERROS' | 'NAO_VISTAS';
  confidence?: number;
}

export interface QuestionProgress {
  questionId: string;
  timesSeen: number;
  timesCorrect: number;
  timesWrong: number;
  lastSeenAt?: string;
  lastAnswer?: AnswerValue;
  currentLevel: number;
  nextReviewAt?: string;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  averageResponseTime?: number;
  lastWasCorrect?: boolean;
}

export interface TopicProgress {
  disciplina: string;
  assunto: string;
  questionCount: number;
  questionsSeen: number;
  correct: number;
  wrong: number;
  accuracy: number;
  recentAccuracy: number | null;
  confidence: number;
  repeatedErrors: number;
  recurringErrors: number;
  errorClassification: 'ERRO_ISOLADO' | 'ERRO_RECENTE' | 'ERRO_RECORRENTE' | 'ERRO_CRITICO' | null;
  unseenQuestions: number;
  overdueReviews: number;
  masteryScore: number;
  priorityScore: number;
  trend: 'up' | 'down' | 'stable' | 'insufficient';
}

export interface MarkState {
  favorita: boolean;
  revisar: boolean;
  pegadinha: boolean;
  dificil: boolean;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  reviewInterval: number;
  showDemoQuestions: boolean;
  simulado: {
    quantidade: number;
    tempoMinutos: number;
    penalidade: number;
    incluirIneditas: boolean;
    disciplinas: string[];
  };
}

export interface Recommendation {
  type: 'review' | 'practice' | 'mixed' | 'new';
  disciplina: string;
  assunto: string;
  quantidade: number;
  prioridade: ReviewPriority;
  motivo: string;
  mode?: 'TREINO' | 'REVISAO' | 'ERROS' | 'NAO_VISTAS';
}

export interface StudySession {
  questions: Question[];
  currentIndex: number;
  startedAt: string;
  finished: boolean;
}

export interface DisciplineSummary {
  name: string;
  count: number;
  totalAnswered: number;
  acertos: number;
  erros: number;
  percentual: number;
  prioridadeScore: number;
  trend: 'up' | 'down' | 'stable' | 'insufficient';
}

export interface ReviewItem {
  questionId: string;
  disciplina: string;
  assunto: string;
  data: string;
  erros: number;
  ultimaResposta: AnswerValue | null;
  proximaRevisao: string;
  prioridade: ReviewPriority;
  vencida?: boolean;
}

export type NotebookCategory =
  | 'ERROS_RECENTES'
  | 'ERROS_RECORRENTES'
  | 'REVISOES_VENCIDAS'
  | 'QUESTOES_DIFICEIS'
  | 'FAVORITAS'
  | 'PEGADINHAS'
  | 'NAO_VISTAS';

export interface NotebookItem extends ReviewItem {
  enunciado: string;
  categorias: NotebookCategory[];
}

export interface DashboardStats {
  respondidas: number;
  acertos: number;
  erros: number;
  emBranco: number;
  percentual: number;
  naoRespondidas: number;
  paraRevisao: number;
  errosRecentes: number;
  melhorDisciplina: string;
  piorDisciplina: string;
  sequenciaAtual: number;
  respondidasHoje: number;
  tempoMedio: number;
}

export interface AppState {
  questions: Question[];
  attempts: AnswerRecord[];
  marks: Record<string, MarkState>;
  settings: UserSettings;
}
