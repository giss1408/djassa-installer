import { useCallback, useEffect, useState } from 'react'

// Loads once on mount and on demand; the page decides when to reload.
export function useLoad(load, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      setState({ data: await load(), error: null, loading: false })
    } catch (error) {
      setState({ data: null, error, loading: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => {
    run()
  }, [run])
  return { ...state, reload: run }
}

// Runs an action, exposing busy and error for the button that started it.
export function useAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const run = async (fn) => {
    setBusy(true)
    setError(null)
    try {
      return await fn()
    } catch (e) {
      setError(e.message || String(e))
      return undefined
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, run, setError }
}

export const CATEGORIES = {
  maquis: 'Maquis',
  restaurant: 'Restaurant',
  superette: 'Supérette',
  pharmacy: 'Pharmacie',
  mode: 'Mode',
  beaute: 'Beauté',
  telephonie: 'Téléphonie',
}

export const WALLETS = { wave: 'Wave', orange: 'Orange Money', mtn: 'MTN MoMo', moov: 'Moov Money' }

export const formatDate = (value) =>
  value ? new Date(value.endsWith('Z') || value.includes('+') ? value : `${value}Z`).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'

export const formatBytes = (n) => (n == null ? '—' : n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} Mo` : `${Math.round(n / 1024)} Ko`)

// Only filled fields are sent: empty strings would erase values.
export function clean(value) {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== '' && v !== undefined))
}
