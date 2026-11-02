import { useState } from 'react';
import { diffWords, type WordDiff } from '@shared/wordDiff';
import type { Evaluation } from '@shared/types/tutor';
import { errorMessage } from '@/lib/utils';
import { useConfigStore } from '@/stores/config';
import { useHistoryStore } from '@/stores/history';
import { useLessonsStore } from '@/stores/lessons';

export interface AttemptResult {
  heard: string;
  unsure: string[];
  /** The accepted answer closest to what was heard. */
  expected: string;
  diff: WordDiff;
  evaluation: Evaluation | null;
  /** What was recorded as progress. */
  score: number;
}

interface Options {
  lessonId: string;
  /** English cue: the teacher judges the meaning, so other correct answers count too. */
  cue?: string;
  /** Also log the attempt in History (sentences, not single words). */
  history?: boolean;
}

/** One learner attempt at a lesson item: transcribe, compare with the accepted answers, record progress. */
export function useAttempt(key: string, answers: string[], { lessonId, cue, history }: Options) {
  const [busy, setBusy] = useState<'listening' | 'checking' | null>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assess = async (samples: Float32Array) => {
    setBusy('listening');
    setError(null);
    setResult(null);
    try {
      const { text: heard, unsure } = await window.tutor.speech.transcribe(samples);
      if (!heard) {
        setError("I didn't catch anything — try again a bit louder.");
        return;
      }
      const best = answers
        .map((expected) => ({ expected, diff: diffWords(expected, heard) }))
        .reduce((a, b) => (b.diff.score > a.diff.score ? b : a));
      let evaluation: Evaluation | null = null;
      if (cue) {
        setBusy('checking');
        setResult({ heard, unsure, ...best, evaluation: null, score: best.diff.score });
        evaluation = await window.tutor.tutor.evaluate(best.expected, heard, unsure, best.diff.score, cue);
      }
      // A correct answer in other words still counts as mastered.
      const score = evaluation?.verdict === 'correct' ? 100 : best.diff.score;
      setResult({ heard, unsure, ...best, evaluation, score });
      await useLessonsStore.getState().record(key, score);
      if (history) {
        void useHistoryStore.getState().add({
          targetLanguage: useConfigStore.getState().config.general.targetLanguage,
          target: best.expected,
          source: cue,
          heard,
          score: best.diff.score,
          verdict: evaluation?.verdict ?? (best.diff.score >= 90 ? 'correct' : best.diff.score >= 60 ? 'almost' : 'incorrect'),
          lessonId,
        });
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return { busy, result, error, assess, reset: () => setResult(null) };
}
