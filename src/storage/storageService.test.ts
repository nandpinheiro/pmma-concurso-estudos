import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import type { AppState, Question } from '../types';
import { IndexedDbStorageService } from './storageService';

const question: Question = {
  id: 'storage-q1',
  disciplina: 'Informática',
  assunto: 'Segurança',
  subassunto: 'Backup',
  enunciado: 'Uma questão demonstrativa.',
  respostaCorreta: 'CERTO',
  comentario: 'Explicação.',
  fundamento: 'Exemplo.',
  pontoChave: 'Persistência local.',
  dificuldade: 'média',
  fonte: 'Exemplo didático',
  tags: [],
};

const initialState: AppState = {
  questions: [question],
  attempts: [],
  marks: {},
  settings: {
    theme: 'light',
    reviewInterval: 3,
    showDemoQuestions: true,
    simulado: {
      quantidade: 10,
      tempoMinutos: 40,
      penalidade: 1,
      incluirIneditas: true,
      disciplinas: [],
    },
  },
};

it('persiste tentativas e marcas em IndexedDB e recupera o estado em outra instância', async () => {
  const firstService = new IndexedDbStorageService();
  await firstService.get('storage-test', initialState);
  const attempt = {
    id: 'storage-attempt-1',
    questionId: question.id,
    disciplina: question.disciplina,
    assunto: question.assunto,
    resposta: 'CERTO' as const,
    acertou: true,
    tempoGasto: 5000,
    data: '2026-09-28T12:00:00.000Z',
    dificuldade: question.dificuldade,
    tentativa: 1,
    revisada: false,
  };
  const updatedState: AppState = {
    ...initialState,
    attempts: [attempt],
    marks: { [question.id]: { favorita: true, revisar: false, pegadinha: false, dificil: false } },
  };

  await firstService.set('storage-test', updatedState);
  const restored = await new IndexedDbStorageService().get('storage-test', initialState);

  expect(restored.questions.map((item) => item.id)).toEqual([question.id]);
  expect(restored.attempts.map((item) => item.id)).toEqual([attempt.id]);
  expect(restored.marks[question.id].favorita).toBe(true);
});