import React from 'react';
import type { AnswerValue, Question, ReviewPriority, ViewKey } from '../types';

interface StatCardProps {
  label: string;
  value: string | number;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
  helper?: string;
}

export function StatCard({ label, value, tone = 'primary', helper }: StatCardProps) {
  const tones = {
    primary: 'bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-brand-100',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200',
    danger: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200',
  };

  return (
    <div className="card flex h-full flex-col justify-between gap-3">
      <div className={`rounded-xl px-3 py-2 text-sm font-medium ${tones[tone]}`}>{label}</div>
      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
      {helper ? <p className="text-xs text-slate-500 dark:text-slate-400">{helper}</p> : null}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  right?: React.ReactNode;
}

export function SectionHeader({ title, right }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="section-title">{title}</h2>
      {right}
    </div>
  );
}

interface QuestionCardProps {
  question: Question;
  index?: number;
  total?: number;
  selectedAnswer?: AnswerValue | null;
  answerConfirmed?: boolean;
  disabled?: boolean;
  onAnswer?: (answer: AnswerValue) => void;
  onToggleMark?: (mark: 'favorita' | 'revisar' | 'pegadinha' | 'dificil') => void;
  currentMark?: { favorita?: boolean; revisar?: boolean; pegadinha?: boolean; dificil?: boolean };
}

export function QuestionCard({
  question,
  index,
  total,
  selectedAnswer,
  answerConfirmed,
  disabled = false,
  onAnswer,
  onToggleMark,
  currentMark,
}: QuestionCardProps) {
  const buttons = [
    { label: 'CERTO', value: 'CERTO' as const, tone: 'success' },
    { label: 'ERRADO', value: 'ERRADO' as const, tone: 'danger' },
  ];

  return (
    <div className="card flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{question.disciplina}</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">{question.assunto}</p>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {index !== undefined && total ? `Questão ${index} de ${total}` : 'Questão'}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
        <p className="text-base font-medium text-slate-800 dark:text-slate-100">{question.enunciado}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {buttons.map((button) => (
          <button
            key={button.value}
            aria-label={`Marcar resposta como ${button.label}`}
            disabled={disabled}
            onClick={() => onAnswer?.(button.value)}
            className={`rounded-2xl border px-5 py-4 text-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              selectedAnswer === button.value
                ? button.tone === 'success'
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-rose-500 bg-rose-500 text-white'
                : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
            }`}
          >
            {button.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'favorita', label: 'Favorita' },
          { key: 'revisar', label: 'Revisar' },
          { key: 'pegadinha', label: 'Pegadinha' },
          { key: 'dificil', label: 'Difícil' },
        ].map((tag) => {
          const active = currentMark?.[tag.key as keyof typeof currentMark];
          return (
            <button
              key={tag.key}
              type="button"
              aria-label={`Marcar como ${tag.label}`}
              onClick={() => onToggleMark?.(tag.key as 'favorita' | 'revisar' | 'pegadinha' | 'dificil')}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                active ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {tag.label}
            </button>
          );
        })}
      </div>

      {answerConfirmed ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="font-semibold text-slate-700 dark:text-slate-200">GABARITO: {question.respostaCorreta}</p>
          <p className="mt-2 text-slate-700 dark:text-slate-200"><span className="font-semibold">COMENTÁRIO:</span> {question.comentario}</p>
          <p className="mt-2 text-slate-700 dark:text-slate-200"><span className="font-semibold">FUNDAMENTO:</span> {question.fundamento}</p>
          <p className="mt-2 text-slate-700 dark:text-slate-200"><span className="font-semibold">PONTO-CHAVE:</span> {question.pontoChave}</p>
        </div>
      ) : null}
    </div>
  );
}

interface PriorityBadgeProps {
  priority: ReviewPriority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const palette: Record<ReviewPriority, string> = {
    alta: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200',
    média: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200',
    baixa: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
  };

  return <span className={`pill ${palette[priority]}`}>{priority.toUpperCase()}</span>;
}
