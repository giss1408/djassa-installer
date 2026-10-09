import { useState } from 'react'
import { api } from '../api.js'
import { CATEGORIES, WALLETS, formatDate, useAction, useLoad } from '../lib.js'
import { ErrorBox, Field, Loading, Status } from '../ui.jsx'

export default function PartnerRequests() {
  const [status, setStatus] = useState('pending')
  const requests = useLoad(() => api(`/api/admin/partner-requests?status=${status}`), [status])
  return (
    <section>
      <div className="title-row">
        <h1>Demandes d’inscription</h1>
        <Tabs value={status} onChange={setStatus} />
      </div>
      <p className="muted">Trois vérifications avant d’approuver : l’approbation crée le commerce et donne à ce numéro l’accès à Fidelia Pro.</p>
      <Loading state={requests}>
        {requests.data?.length === 0 && <p className="muted">Aucune demande.</p>}
        {requests.data?.map((r) => (
          <Request key={r.id} request={r} onDone={requests.reload} />
        ))}
      </Loading>
    </section>
  )
}

export function Tabs({ value, onChange, values = ['pending', 'approved', 'rejected'] }) {
  return (
    <div className="tabs">
      {values.map((s) => (
        <button key={s} className={value === s ? '' : 'ghost'} onClick={() => onChange(s)}>
          <Status value={s} />
        </button>
      ))}
    </div>
  )
}

// What the admin confirms before approving; the server refuses without them
// (fidelia-BE APPROVAL_CHECKS). The wallet check applies only to a request
// that names a wallet.
const CHECKS = {
  called: 'J’ai appelé ce numéro et parlé au gérant',
  wallet_name_matches: 'Le titulaire du compte mobile money porte le nom du contact',
  shop_seen: 'Le commerce existe à cette adresse (photo, position GPS ou visite)',
}

function Request({ request: r, onDone }) {
  const [form, setForm] = useState({ name: r.shop_name, commune: r.commune, address: r.address || '', opening_hours: '', specialties: '', points_per_100: 1, note: '' })
  const [checks, setChecks] = useState([])
  const action = useAction()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const required = Object.keys(CHECKS).filter((k) => k !== 'wallet_name_matches' || r.wallet_number)
  const toggle = (k) => setChecks((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]))

  const approve = () =>
    action.run(async () => {
      const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''))
      body.points_per_100 = Number(form.points_per_100)
      body.checks = checks
      const venue = await api(`/api/admin/partner-requests/${r.id}/approve`, { method: 'POST', body })
      window.location.hash = `#/shops/${venue.id}`
    })
  const reject = () => {
    const note = window.prompt('Motif du refus (envoyé au dossier, pas au commerçant) :', '')
    if (note === null) return
    action.run(async () => {
      await api(`/api/admin/partner-requests/${r.id}/reject`, { method: 'POST', body: { note: note || null } })
      onDone()
    })
  }

  return (
    <article className="card">
      <div className="title-row">
        <h2>
          {r.shop_name} <span className="muted">· {CATEGORIES[r.category] || r.category}</span>
        </h2>
        <Status value={r.status} />
      </div>
      <dl className="facts">
        <dt>Contact</dt>
        <dd>
          {r.contact_name} — <a href={`tel:${r.phone}`}>{r.phone}</a>
        </dd>
        <dt>Lieu</dt>
        <dd>
          {r.commune}
          {r.address && `, ${r.address}`}
        </dd>
        <dt>Paiement</dt>
        <dd>{r.wallet_provider ? `${WALLETS[r.wallet_provider]} ${r.wallet_number}` : 'Pas de mobile money'}</dd>
        {r.notes && (
          <>
            <dt>Notes</dt>
            <dd>{r.notes}</dd>
          </>
        )}
        <dt>Reçue</dt>
        <dd>{formatDate(r.created_at)}</dd>
        {r.decided_at && (
          <>
            <dt>Décision</dt>
            <dd>
              {formatDate(r.decided_at)} par {r.decided_by} {r.decision_note && `— ${r.decision_note}`}
              {r.review_checks?.length > 0 && ` · vérifié : ${r.review_checks.map((k) => CHECKS[k] || k).join(' ; ')}`}
              {r.venue_id && (
                <>
                  {' · '}
                  <a href={`#/shops/${r.venue_id}`}>voir le commerce</a>
                </>
              )}
            </dd>
          </>
        )}
      </dl>
      {r.status === 'pending' && (
        <>
          <div className="grid">
            <Field label="Nom du commerce">
              <input value={form.name} onChange={set('name')} />
            </Field>
            <Field label="Commune">
              <input value={form.commune} onChange={set('commune')} />
            </Field>
            <Field label="Adresse">
              <input value={form.address} onChange={set('address')} />
            </Field>
            <Field label="Horaires">
              <input value={form.opening_hours} onChange={set('opening_hours')} />
            </Field>
            <Field label="Spécialités">
              <input value={form.specialties} onChange={set('specialties')} />
            </Field>
            <Field label="Points pour 100 F">
              <input type="number" min="0" max="20" value={form.points_per_100} onChange={set('points_per_100')} />
            </Field>
            <Field label="Note interne">
              <input value={form.note} onChange={set('note')} placeholder="Appelé le…, vérifié sur place…" />
            </Field>
          </div>
          <fieldset className="checks">
            <legend>Vérifications</legend>
            {required.map((k) => (
              <label key={k} className="check">
                <input type="checkbox" checked={checks.includes(k)} onChange={() => toggle(k)} /> {CHECKS[k]}
              </label>
            ))}
          </fieldset>
          <div className="row">
            <button onClick={approve} disabled={action.busy || required.some((k) => !checks.includes(k))}>
              Approuver et créer le commerce
            </button>
            <button className="danger" onClick={reject} disabled={action.busy}>
              Refuser
            </button>
          </div>
        </>
      )}
      <ErrorBox error={action.error} />
    </article>
  )
}
