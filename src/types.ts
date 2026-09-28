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
  isDemo?: boolean;
}

export interface AnswerRecord {
  id: string;
  questionId: string;
  disciplina: string;
  assunto: string;
  resposta: AnswerValue | null;
  acertou: boolean | null;
  tempoGasto: number;
  data: string;
  dificuldade: Difficulty;
  tentativa: number;
  revisada: boolean;
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
}

export interface DashboardStats {
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
}

export interface AppState {
  questions: Question[];
  attempts: AnswerRecord[];
  marks: Record<string, MarkState>;
  settings: UserSettings;
}
