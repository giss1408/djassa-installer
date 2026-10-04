import { useState } from 'react'
import { api } from '../api.js'
import { formatDate, useAction, useLoad } from '../lib.js'
import { ErrorBox, Loading, Status } from '../ui.jsx'
import { Tabs } from './PartnerRequests.jsx'

export default function Recovery() {
  const [status, setStatus] = useState('pending')
  const requests = useLoad(() => api(`/api/admin/recovery-requests?status=${status}`), [status])
  return (
    <section>
      <div className="title-row">
        <h1>Récupérations de compte</h1>
        <Tabs value={status} onChange={setStatus} />
      </div>
      <p className="muted">
        Quelqu’un a perdu son numéro et demande son compte sur un nouveau. Le nouveau numéro est vérifié par SMS ; l’ancien a reçu un SMS d’alerte.
        Appelez le nouveau numéro et posez des questions sur le compte ci-dessous avant d’approuver : tout le compte (points, commerce) part sur le
        nouveau numéro.
      </p>
      <Loading state={requests}>
        {requests.data?.length === 0 && <p className="muted">Aucune demande.</p>}
        {requests.data?.map((r) => (
          <Request key={r.id} request={r} onDone={requests.reload} />
        ))}
      </Loading>
    </section>
  )
}

function Request({ request: r, onDone }) {
  const action = useAction()
  const decide = (verb) => {
    const note = window.prompt(verb === 'approve' ? 'Comment l’identité a été vérifiée :' : 'Motif du refus :', '')
    if (note === null) return
    action.run(async () => {
      await api(`/api/admin/recovery-requests/${r.id}/${verb}`, { method: 'POST', body: { note: note || null } })
      onDone()
    })
  }
  const a = r.old_account
  return (
    <article className="card">
      <div className="title-row">
        <h2>
          {r.old_phone} → <a href={`tel:${r.new_phone}`}>{r.new_phone}</a>
        </h2>
        <Status value={r.status} />
      </div>
      {r.requests_for_old_number > 1 && <p className="warn">{r.requests_for_old_number} demandes pour cet ancien numéro : soyez prudent.</p>}
      <dl className="facts">
        <dt>Ce que dit la personne</dt>
        <dd>{r.details}</dd>
        <dt>Reçue</dt>
        <dd>{formatDate(r.created_at)}</dd>
        <dt>Compte de l’ancien numéro</dt>
        <dd>
          {a ? (
            <>
              Rôles : {a.roles.join(', ')} · créé le {formatDate(a.created_at)} · dernière connexion {formatDate(a.last_login_at)}
              <br />
              Commerce : {a.venues_owned.join(', ') || '—'} · Points chez : {a.loyalty_venues.join(', ') || '—'} · Dernier paiement : {formatDate(a.last_payment_at)}
            </>
          ) : (
            <span className="warn">Aucun compte sur ce numéro : rien à transférer, refusez.</span>
          )}
        </dd>
        {r.decided_at && (
          <>
            <dt>Décision</dt>
            <dd>
              {formatDate(r.decided_at)} par {r.decided_by} {r.decision_note && `— ${r.decision_note}`}
            </dd>
          </>
        )}
      </dl>
      {r.status === 'pending' && (
        <div className="row">
          <button onClick={() => decide('approve')} disabled={action.busy || !a}>
            Approuver le transfert
          </button>
          <button className="danger" onClick={() => decide('reject')} disabled={action.busy}>
            Refuser
          </button>
        </div>
      )}
      <ErrorBox error={action.error} />
    </article>
  )
}
