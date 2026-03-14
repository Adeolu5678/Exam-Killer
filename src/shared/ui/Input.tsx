import * as React from 'react';

// =============================================================================
// Input
// Layer: shared/ui
// =============================================================================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  /** Full width container wrapper class override */
  wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftElement,
      rightElement,
      wrapperClassName = '',
      className = '',
      id,
      disabled,
      ...props
    },
    ref,
  ) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium leading-none text-text-secondary">
            {label}
          </label>
        )}

        <div
          className={[
            'relative flex items-center',
            'rounded-lg border bg-bg-surface',
            'transition-all duration-base ease-standard',
            error
              ? 'focus-within:ring-rose/30 border-rose focus-within:ring-2'
              : 'focus-within:ring-primary/20 border-border focus-within:border-border-focus focus-within:ring-2',
            disabled && 'cursor-not-allowed opacity-50',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {leftElement && (
            <span className="flex shrink-0 items-center pl-3 text-text-muted">{leftElement}</span>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            className={[
              'flex-1 bg-transparent py-2.5 text-sm text-text-primary',
              'placeholder:text-text-muted',
              'border-none outline-none ring-0',
              'disabled:cursor-not-allowed',
              leftElement ? 'pl-2' : 'pl-3',
              rightElement ? 'pr-2' : 'pr-3',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...props}
          />

          {rightElement && (
            <span className="flex shrink-0 items-center pr-3 text-text-muted">{rightElement}</span>
          )}
        </div>

        {error && (
          <p id={`${inputId}-error`} role="alert" className="text-xs leading-snug text-rose">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs leading-snug text-text-muted">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

// ---------------------------------------------------------------------------
// Textarea variant
// ---------------------------------------------------------------------------

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, wrapperClassName = '', className = '', id, ...props }, ref) => {
    const textareaId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium leading-none text-text-secondary"
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={!!error}
          className={[
            'rounded-lg border bg-bg-surface px-3 py-2.5',
            'text-sm text-text-primary placeholder:text-text-muted',
            'transition-all duration-base ease-standard',
            'resize-none outline-none',
            error
              ? 'focus:ring-rose/30 border-rose focus:ring-2'
              : 'focus:ring-primary/20 border-border focus:border-border-focus focus:ring-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />

        {error && (
          <p role="alert" className="text-xs leading-snug text-rose">
            {error}
          </p>
        )}
        {hint && !error && <p className="text-xs leading-snug text-text-muted">{hint}</p>}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
