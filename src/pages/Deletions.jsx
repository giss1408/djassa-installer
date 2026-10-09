import { useState } from 'react'
import { api } from '../api.js'
import { formatDate, useAction, useLoad } from '../lib.js'
import { ErrorBox, Loading, Status } from '../ui.jsx'
import { Tabs } from './PartnerRequests.jsx'

const ROLES = { merchant: 'Gérant', cashier: 'Caissier', agent: 'Agent terrain', admin: 'Admin', customer: 'Client' }

// Merchants, cashiers and field agents ask from Fidelia Pro; customers delete
// their own account in the app and never appear here (fidelia-BE
// app/services/account_delete.py). Google Play expects it done within 30 days.
export default function Deletions() {
  const [status, setStatus] = useState('pending')
  const requests = useLoad(() => api(`/api/admin/deletion-requests?status=${status}`), [status])
  return (
    <section>
      <div className="title-row">
        <h1>Suppressions de compte</h1>
        <Tabs value={status} onChange={setStatus} values={['pending', 'done', 'rejected']} />
      </div>
      <p className="muted">
        Un commerçant, un caissier ou un agent demande la suppression de son compte. Appelez-le. Pour un gérant, fermez le commerce ou donnez-le à
        un autre gérant d’abord : la suppression est refusée tant que le numéro possède un commerce. Le numéro, les points et les sessions sont
        effacés ; les ventes du commerce restent, sans le nom. À traiter sous 30 jours.
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
    if (verb === 'done' && !window.confirm(`Supprimer définitivement le compte ${r.phone} ?`)) return
    const note = window.prompt(verb === 'done' ? 'Note (facultative) :' : 'Motif du refus :', '')
    if (note === null) return
    action.run(async () => {
      await api(`/api/admin/deletion-requests/${r.id}/${verb}`, { method: 'POST', body: { note: note || null } })
      onDone()
    })
  }
  return (
    <article className="card">
      <div className="title-row">
        <h2>
          <a href={`tel:${r.phone}`}>{r.phone}</a> · {ROLES[r.role] || r.role}
        </h2>
        <Status value={r.status} />
      </div>
      <dl className="facts">
        <dt>Commerce</dt>
        <dd>{r.venue_id ? <a href={`#/shops/${r.venue_id}`}>{r.venue_name}</a> : '—'}</dd>
        <dt>Motif donné</dt>
        <dd>{r.reason || '—'}</dd>
        <dt>Reçue</dt>
        <dd>{formatDate(r.created_at)}</dd>
        {r.decided_at && (
          <>
            <dt>Décision</dt>
            <dd>
              {formatDate(r.decided_at)} {r.decision_note && `— ${r.decision_note}`}
            </dd>
          </>
        )}
      </dl>
      {r.status === 'pending' && (
        <div className="row">
          <button className="danger" onClick={() => decide('done')} disabled={action.busy}>
            Supprimer le compte
          </button>
          <button className="ghost" onClick={() => decide('reject')} disabled={action.busy}>
            Refuser
          </button>
        </div>
      )}
      <ErrorBox error={action.error} />
    </article>
  )
}
