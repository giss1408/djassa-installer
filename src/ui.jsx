export function ErrorBox({ error }) {
  if (!error) return null
  return (
    <p className="error" role="alert">
      {typeof error === 'string' ? error : error.message}
    </p>
  )
}

export function Loading({ state, children }) {
  if (state.loading && !state.data) return <p className="muted">Chargement…</p>
  if (state.error) return <ErrorBox error={state.error} />
  return children
}

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small className="muted">{hint}</small>}
    </label>
  )
}

export function Status({ value }) {
  return <span className={`status status-${value}`}>{STATUS_LABELS[value] || value}</span>
}

const STATUS_LABELS = {
  pending: 'En attente',
  approved: 'Approuvée',
  rejected: 'Refusée',
  done: 'Traitée',
  ready: 'Prêt',
  processing: 'En traitement',
  failed: 'Échec',
}
