import { useCallback, useEffect, useRef, useState } from 'react';
import {
  QA_LIMITS,
  type AirQualityReading,
  type QaTurn,
  sanitizePlainText,
} from '../../shared/airQuality.ts';
import { askAirQualityQuestion, isAbortError } from '../lib/api.ts';

export interface QaMessage extends QaTurn {
  id: string;
  source?: 'gemini' | 'fallback';
  warning?: string;
}

export interface UseAirQualityQaResult {
  messages: QaMessage[];
  questionInput: string;
  validationError: string | null;
  requestError: string | null;
  isAsking: boolean;
  setQuestionInput: (value: string) => void;
  submitQuestion: (rawText: string) => Promise<void>;
  clearMessages: () => void;
}

/**
 * Manages grounded follow-up Q&A state for the active air quality reading,
 * resetting history automatically whenever the city or sensor values change.
 */
export function useAirQualityQa(reading: AirQualityReading): UseAirQualityQaResult {
  const [messages, setMessages] = useState<QaMessage[]>([]);
  const [questionInput, setQuestionInputState] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const readingKey = `${reading.city}|${reading.aqi}|${reading.pm25}|${reading.pm10}`;

  useEffect(() => {
    abortRef.current?.abort();
    setMessages([]);
    setRequestError(null);
    setValidationError(null);
    setIsAsking(false);
  }, [readingKey]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const setQuestionInput = useCallback((value: string) => {
    setQuestionInputState(value);
    setValidationError((prev) => (prev ? null : prev));
  }, []);

  const clearMessages = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setRequestError(null);
    setIsAsking(false);
  }, []);

  const submitQuestion = useCallback(
    async (rawText: string) => {
      const cleaned = sanitizePlainText(rawText, QA_LIMITS.questionMaxLength);
      if (cleaned.length < QA_LIMITS.questionMinLength) {
        setValidationError(
          `Please enter at least ${QA_LIMITS.questionMinLength} characters for your air-quality question.`
        );
        return;
      }

      setValidationError(null);
      setRequestError(null);

      const userTurn: QaMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: cleaned,
      };

      const historyForApi: QaTurn[] = messages
        .slice(-QA_LIMITS.maxHistoryTurns)
        .map(({ role, content }) => ({ role, content }));

      setMessages((prev) => [...prev, userTurn]);
      setQuestionInputState('');
      setIsAsking(true);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await askAirQualityQuestion(
          reading,
          cleaned,
          historyForApi,
          controller.signal
        );

        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: response.answer,
            source: response.source,
            warning: response.warning,
          },
        ]);
      } catch (err: unknown) {
        if (isAbortError(err)) {
          return;
        }
        setRequestError(
          err instanceof Error
            ? err.message
            : 'Unable to reach the assistant right now. Please try again.'
        );
      } finally {
        if (abortRef.current === controller) {
          setIsAsking(false);
        }
      }
    },
    [messages, reading]
  );

  return {
    messages,
    questionInput,
    validationError,
    requestError,
    isAsking,
    setQuestionInput,
    submitQuestion,
    clearMessages,
  };
}
