import { useState } from 'react'
import { api } from '../api.js'
import { formatDate, useLoad } from '../lib.js'
import { Loading } from '../ui.jsx'

const APPS = { user: 'App client', retailer: 'Fidelia Pro' }

const percent = (share) => (share == null ? '—' : `${Math.round(share * 100)} %`)
const kb = (value) => (value == null ? '—' : `${value} Ko`)

// How the two apps are used (fidelia-BE app/api/usage_events.py): installs,
// active installs, screens, content seen and, for Fidelia Pro, each shop's
// recorded share, the pilot's master metric. Counts are per install: the
// apps report no account, so one phone is one install.
export default function Usage() {
  const [app, setApp] = useState('user')
  const [days, setDays] = useState(30)
  const usage = useLoad(() => api(`/api/admin/usage?app=${app}&days=${days}`), [app, days])
  const u = usage.data
  return (
    <section>
      <h1>Utilisation</h1>
      <div className="filters">
        <select value={app} onChange={(e) => setApp(e.target.value)}>
          {Object.entries(APPS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[7, 30, 90].map((d) => (
            <option key={d} value={d}>
              {d} jours
            </option>
          ))}
        </select>
      </div>
      <Loading state={usage}>
        {u && (
          <>
            <table>
              <tbody>
                <Row label="Installations (total)" value={u.installs_total} />
                <Row label={`Nouvelles installations (${u.days} j)`} value={u.installs_in_period} />
                <Row label="Actives aujourd’hui (24 h)" value={u.active_installs_1d} />
                <Row label="Actives sur 7 jours" value={u.active_installs_7d} />
                <Row label="Actives sur 30 jours" value={u.active_installs_30d} />
                <Row label="Données par installation active et par jour" value={kb(u.data_kb_per_active_install_day)} />
              </tbody>
            </table>

            {app === 'retailer' && (
              <>
                <h2>Commerces</h2>
                {u.merchants.length === 0 ? (
                  <p className="muted">Aucun commerce actif sur la période.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Commerce</th>
                        <th>Part des ventes enregistrées</th>
                        <th>Jours actifs</th>
                        <th>Ventes dans l’app</th>
                        <th>Abandonnées</th>
                        <th>Temps médian d’une vente</th>
                        <th>Bilans du soir</th>
                        <th>Version · vu le</th>
                      </tr>
                    </thead>
                    <tbody>
                      {u.merchants.map((m) => (
                        <tr key={m.venue_id}>
                          <td>
                            <a href={`#/shops/${m.venue_id}`}>{m.venue_name || `#${m.venue_id}`}</a>
                          </td>
                          <td>
                            <strong>{percent(m.recorded_share)}</strong>
                          </td>
                          <td>{m.active_days}</td>
                          <td>
                            {m.sales_recorded_in_app} / {m.sale_forms_opened}
                          </td>
                          <td>{m.sales_abandoned}</td>
                          <td>{m.median_sale_seconds == null ? '—' : `${Math.round(m.median_sale_seconds)} s`}</td>
                          <td>{m.daily_reports}</td>
                          <td className="muted">
                            {m.app_version} · {formatDate(m.last_seen)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}

            <Counts title="Écrans" rows={u.screens} />
            <Counts title="Événements" rows={u.events} />
            {app === 'user' && <Content title="Commerces consultés" rows={u.venues_viewed} link />}
            {app === 'user' && <Content title="Offres ouvertes" rows={u.deals_opened} />}
          </>
        )}
      </Loading>
    </section>
  )
}

function Row({ label, value }) {
  return (
    <tr>
      <th>{label}</th>
      <td>
        <strong>{value}</strong>
      </td>
    </tr>
  )
}

function Counts({ title, rows }) {
  return (
    <>
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className="muted">Rien sur la période.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Fois</th>
              <th>Installations</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>
                  <code>{r.key}</code>
                </td>
                <td>{r.count}</td>
                <td>{r.installs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}

function Content({ title, rows, link }) {
  return (
    <>
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className="muted">Rien sur la période.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Vues</th>
              <th>Installations</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{link ? <a href={`#/shops/${r.id}`}>{r.name || `#${r.id}`}</a> : r.name || `#${r.id}`}</td>
                <td>{r.views}</td>
                <td>{r.installs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
