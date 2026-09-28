import type { AnswerRecord, Question, Recommendation, ReviewPriority } from '../types';

export function getNextRecommendation(attempts: AnswerRecord[], questions: Question[]): Recommendation {
  const recent = attempts.filter((attempt) => {
    const date = new Date(attempt.data);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return date >= cutoff;
  });

  const byDiscipline = new Map<string, { total: number; acertos: number; erros: number; answered: number }>();

  for (const attempt of attempts) {
    const current = byDiscipline.get(attempt.disciplina) ?? { total: 0, acertos: 0, erros: 0, answered: 0 };
    current.answered += 1;
    if (attempt.acertou) current.acertos += 1;
    else current.erros += 1;
    byDiscipline.set(attempt.disciplina, current);
  }

  let bestKey = 'História do Maranhão';
  let bestValue = -Infinity;

  for (const [discipline, stats] of byDiscipline.entries()) {
    const ratio = stats.answered > 0 ? stats.acertos / stats.answered : 0;
    const value = ratio * 100 - stats.erros * 4;
    if (value > bestValue) {
      bestValue = value;
      bestKey = discipline;
    }
  }

  const recentErrors = recent.filter((attempt) => !attempt.acertou).length;
  const overdue = attempts.filter((attempt) => !attempt.acertou && attempt.tempoGasto > 20_000).length;

  if (recentErrors >= 3 || overdue >= 2) {
    return {
      type: 'review',
      disciplina: 'História do Maranhão',
      assunto: 'França Equinocial',
      quantidade: 10,
      prioridade: 'alta',
      motivo: 'Baixo aproveitamento e erros recentes em conteúdos sensíveis.',
    };
  }

  if (byDiscipline.size > 0) {
    const lowDiscipline = [...byDiscipline.entries()].sort((a, b) => {
      const aPercent = a[1].answered ? (a[1].acertos / a[1].answered) * 100 : 100;
      const bPercent = b[1].answered ? (b[1].acertos / b[1].answered) * 100 : 100;
      return aPercent - bPercent;
    })[0];

    if (lowDiscipline && lowDiscipline[1].answered >= 4) {
      return {
        type: 'practice',
        disciplina: lowDiscipline[0],
        assunto: 'Revisão de conteúdo com menor rendimento',
        quantidade: 15,
        prioridade: 'média',
        motivo: `Recomendado porque você apresentou baixo rendimento recente em ${lowDiscipline[0]}.`,
      };
    }
  }

  const unanswered = questions.length - new Set(attempts.map((item) => item.questionId)).size;
  if (unanswered > 10) {
    return {
      type: 'new',
      disciplina: bestKey,
      assunto: 'Questões inéditas',
      quantidade: 15,
      prioridade: 'média',
      motivo: 'Há muitas questões não vistas em seu banco atual.',
    };
  }

  return {
    type: 'mixed',
    disciplina: bestKey,
    assunto: 'Treino misto',
    quantidade: 10,
    prioridade: 'baixa',
    motivo: 'Seu desempenho está estável. Vale misturar revisão e novos exercícios.',
  };
}

export function getPriorityLabel(value: number): ReviewPriority {
  if (value >= 0.75) return 'alta';
  if (value >= 0.45) return 'média';
  return 'baixa';
}
