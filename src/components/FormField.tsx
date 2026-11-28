/**
 * @module src/components/FormField
 * Reusable, accessible labeled input primitive with inline validation messaging.
 */
import type { InputHTMLAttributes, ReactNode, RefObject } from 'react';

interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'> {
  id: string;
  label: string;
  error?: string;
  labelAdornment?: ReactNode;
  monospace?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
}

/** Accessible form input paired with explicit label, focus ring, and alert error message. */
export function FormField({
  id,
  label,
  error,
  labelAdornment,
  monospace = false,
  inputRef,
  ...inputProps
}: FormFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="block text-xs font-medium text-slate-800">
          {label}
        </label>
        {labelAdornment}
      </div>

      <input
        ref={inputRef}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`mt-1.5 min-h-[40px] w-full rounded-md border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
          monospace ? 'font-mono tabular-nums' : ''
        } ${
          error
            ? 'border-red-600 focus:border-red-700 focus:ring-red-700/20'
            : 'border-slate-300 focus:border-blue-700 focus:ring-blue-700/20'
        }`}
        {...inputProps}
      />

      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
