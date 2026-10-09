import { useState } from 'react'
import { api } from '../api.js'
import { formatDate, useLoad } from '../lib.js'
import { Loading } from '../ui.jsx'

const APPS = { '': 'Toutes', user: 'App client', retailer: 'Fidelia Pro', web: 'Site web' }

export default function AppErrors() {
  const [app, setApp] = useState('')
  const [days, setDays] = useState(7)
  const groups = useLoad(() => api(`/api/admin/client-events?days=${days}${app ? `&app=${app}` : ''}`), [app, days])
  return (
    <section>
      <h1>Erreurs des apps</h1>
      <p className="muted">
        Une ligne par bug, la plus fréquente en premier. Les traces des versions publiées sont obfusquées : décodez-les avec <code>flutter symbolize</code> et
        les symboles de cette version.
      </p>
      <div className="filters">
        <select value={app} onChange={(e) => setApp(e.target.value)}>
          {Object.entries(APPS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[1, 7, 30, 90].map((d) => (
            <option key={d} value={d}>
              {d} jour{d > 1 ? 's' : ''}
            </option>
          ))}
        </select>
      </div>
      <Loading state={groups}>
        {groups.data?.length === 0 && <p className="muted">Aucune erreur sur la période.</p>}
        {groups.data?.map((g) => (
          <details key={g.fingerprint} className="card">
            <summary>
              <strong>{g.occurrences}×</strong> {g.kind === 'crash' && <span className="warn">plantage</span>} <span className="tag">{APPS[g.app] || g.app}</span>{' '}
              {g.message} <span className="muted">· {g.latest_version} · vu le {formatDate(g.last_seen)}</span>
            </summary>
            <p className="muted">
              {g.reports} rapports · premier le {formatDate(g.first_seen)}
            </p>
            {g.stack && <pre>{g.stack}</pre>}
          </details>
        ))}
      </Loading>
    </section>
  )
}
