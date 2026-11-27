import { useId, type FormEvent } from 'react';
import { Send, Trash2 } from 'lucide-react';
import {
  QA_LIMITS,
  type AirQualityReading,
  getAqiCategory,
} from '../../shared/airQuality.ts';
import { useAirQualityQa } from '../hooks/useAirQualityQa.ts';

interface QaAssistantProps {
  reading: AirQualityReading;
}

const STARTER_QUESTIONS = [
  'Is it safe to jog outside right now?',
  'What mask should I wear for my commute?',
  'Should I keep windows closed tonight?',
  'How should a child with asthma plan today?',
] as const;

export function QaAssistant({ reading }: QaAssistantProps) {
  const {
    messages,
    questionInput,
    validationError,
    requestError,
    isAsking,
    setQuestionInput,
    submitQuestion,
    clearMessages,
  } = useAirQualityQa(reading);

  const inputId = useId();
  const category = getAqiCategory(reading.aqi);

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitQuestion(questionInput);
  }

  return (
    <section
      id="assistant"
      aria-labelledby="assistant-heading"
      className="scroll-mt-20 rounded-lg border border-slate-200 bg-white"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
        <div>
          <h2
            id="assistant-heading"
            className="font-display text-lg font-semibold text-slate-950"
          >
            Follow-Up Air Quality Assistant
          </h2>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span>Grounded in {reading.city}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              AQI {reading.aqi} ({category})
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">PM2.5 {reading.pm25} µg/m³</span>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearMessages}
            className="inline-flex min-h-[38px] shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Clear Chat
          </button>
        )}
      </div>

      <div className="p-6">
        <div>
          <p className="text-xs font-medium text-slate-700">Suggested questions</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {STARTER_QUESTIONS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={isAsking}
                onClick={() => void submitQuestion(prompt)}
                className="min-h-[38px] cursor-pointer rounded-md border border-slate-300 bg-slate-50 px-3.5 py-2 text-left text-xs font-medium text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div aria-live="polite" aria-relevant="additions" className="mt-5 space-y-4">
          {messages.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/70 px-5 py-6 text-sm text-slate-600">
              Ask a practical question about commuting, exercise timing, air purifiers, school
              play, or mask selection for {reading.city}. Answers are concise and tied directly to
              the active AQI reading.
            </div>
          ) : (
            <ul className="space-y-4" aria-label="Conversation history">
              {messages.map((message) => (
                <li
                  key={message.id}
                  className={
                    message.role === 'user'
                      ? 'ml-auto max-w-[85%] rounded-md bg-slate-900 px-4 py-3 text-sm text-white'
                      : 'max-w-[92%] rounded-md border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-800'
                  }
                >
                  <div
                    className={`text-xs font-medium ${
                      message.role === 'user' ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {message.role === 'user'
                      ? 'You'
                      : message.source === 'gemini'
                        ? 'Assistant · Gemini AI'
                        : 'Assistant · Fallback guidance'}
                  </div>
                  <p className="mt-1.5 whitespace-pre-line leading-relaxed">{message.content}</p>
                  {message.warning && (
                    <p className="mt-2 text-xs text-amber-900">{message.warning}</p>
                  )}
                </li>
              ))}
            </ul>
          )}

          {isAsking && (
            <div
              role="status"
              className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600"
            >
              Preparing a concise answer for {reading.city}…
            </div>
          )}

          {requestError && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-900"
            >
              {requestError}
            </div>
          )}
        </div>

        <form onSubmit={handleFormSubmit} noValidate className="mt-5 border-t border-slate-200 pt-5">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor={inputId} className="block text-xs font-medium text-slate-800">
              Ask a follow-up air quality question
            </label>
            <span className="font-mono text-[11px] tabular-nums text-slate-500">
              {questionInput.length}/{QA_LIMITS.questionMaxLength}
            </span>
          </div>

          <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
            <input
              id={inputId}
              type="text"
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              maxLength={QA_LIMITS.questionMaxLength}
              disabled={isAsking}
              placeholder={`Ask about ${reading.city}'s air quality, masks, or indoor air…`}
              aria-invalid={Boolean(validationError)}
              aria-describedby={validationError ? `${inputId}-error` : undefined}
              className={`min-h-[44px] flex-1 rounded-md border px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:bg-slate-50 ${
                validationError
                  ? 'border-red-600 focus:border-red-700 focus:ring-red-700/20'
                  : 'border-slate-300 focus:border-blue-700 focus:ring-blue-700/20'
              }`}
            />
            <button
              type="submit"
              disabled={isAsking}
              className="inline-flex min-h-[44px] shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md bg-blue-700 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
            >
              <Send className="h-4 w-4 shrink-0" aria-hidden="true" />
              {isAsking ? 'Asking…' : 'Ask'}
            </button>
          </div>

          {validationError && (
            <p
              id={`${inputId}-error`}
              role="alert"
              className="mt-1.5 text-xs font-medium text-red-700"
            >
              {validationError}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
