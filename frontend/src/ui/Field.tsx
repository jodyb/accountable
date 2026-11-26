// A labelled form field with a required marker and its message.
import type { ReactNode } from 'react'

type Props = {
  label: string
  htmlFor?: string
  required?: boolean
  error?: string
  children: ReactNode
}

export function Field({ label, htmlFor, required, error, children }: Props) {
  return (
    <div className="field">
      {htmlFor ? (
        <label htmlFor={htmlFor}>
          {label}{' '}
          {required && (
            <span className="req" aria-hidden>
              *
            </span>
          )}
        </label>
      ) : (
        <span className="flabel">
          {label}{' '}
          {required && (
            <span className="req" aria-hidden>
              *
            </span>
          )}
        </span>
      )}
      {children}
      {error && (
        <span className="err" role="alert" id={htmlFor ? `${htmlFor}-error` : undefined}>
          {error}
        </span>
      )}
    </div>
  )
}

/** Props for an input that reports its error to assistive tech and shows the red outline. */
export function invalid(id: string, error?: string) {
  return {
    id,
    className: `in${error ? ' bad' : ''}`,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : undefined,
  }
}

/** Copy field messages from a 422 onto the form. Returns any left over for a form-level message. */
export function applyServerErrors(
  errors: Record<string, string>,
  setError: (name: never, error: { message: string }) => void,
  fields: string[],
): string {
  const rest: string[] = []
  for (const [name, message] of Object.entries(errors)) {
    if (fields.includes(name)) setError(name as never, { message })
    else rest.push(message)
  }
  return rest.join(' ')
}
