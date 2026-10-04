import { useState } from 'react'
import { api } from '../api.js'
import { formatDate, useAction } from '../lib.js'
import { ErrorBox, Field } from '../ui.jsx'

export default function Users() {
  const [phone, setPhone] = useState('')
  const [user, setUser] = useState(null)
  const [venueId, setVenueId] = useState('')
  const action = useAction()

  const find = (e) => {
    e?.preventDefault()
    action.run(async () => {
      setUser(null)
      setUser(await api(`/api/admin/users?phone=${encodeURIComponent(phone)}`))
    })
  }
  const act = (path, body, confirm) => {
    if (confirm && !window.confirm(confirm)) return
    action.run(async () => {
      const result = await api(path, { method: 'POST', body: { phone, ...body } })
      setUser(result && result.phone ? result : await api(`/api/admin/users?phone=${encodeURIComponent(phone)}`))
    })
  }

  return (
    <section>
      <h1>Utilisateurs</h1>
      <form className="filters" onSubmit={find}>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Numéro, ex. 07 12 34 56 78" inputMode="tel" />
        <button disabled={action.busy || phone.length < 8}>Chercher</button>
      </form>
      <ErrorBox error={action.error} />
      {user && (
        <div className="card">
          <h2>{user.phone}</h2>
          <dl className="facts">
            <dt>Rôles</dt>
            <dd>{user.roles.join(', ')}</dd>
            <dt>État</dt>
            <dd>{user.disabled ? <span className="warn">Suspendu</span> : 'Actif'}</dd>
            <dt>Commerce</dt>
            <dd>{user.venues_owned.join(', ') || '—'}</dd>
            <dt>Sessions ouvertes</dt>
            <dd>{user.active_sessions}</dd>
            <dt>Créé</dt>
            <dd>{formatDate(user.created_at)}</dd>
            <dt>Dernière connexion</dt>
            <dd>{formatDate(user.last_login_at)}</dd>
          </dl>
          <div className="row">
            <button className="ghost" onClick={() => act('/api/admin/users/revoke-sessions', {}, 'Déconnecter tous les appareils de ce compte ?')} disabled={action.busy}>
              Déconnecter partout
            </button>
            <button
              className={user.disabled ? '' : 'danger'}
              onClick={() => act('/api/admin/users/disable', { disabled: !user.disabled }, user.disabled ? null : 'Suspendre ce compte ? Il ne pourra plus se connecter.')}
              disabled={action.busy}
            >
              {user.disabled ? 'Réactiver' : 'Suspendre'}
            </button>
          </div>
          <h3>Accès</h3>
          <div className="row">
            <Field label="Lier comme commerçant au commerce n°" hint="Voir l’identifiant dans l’adresse de la fiche commerce.">
              <input value={venueId} onChange={(e) => setVenueId(e.target.value.replace(/\D/g, ''))} inputMode="numeric" />
            </Field>
            <button onClick={() => act('/api/admin/users/roles', { role: 'merchant', venue_id: Number(venueId) })} disabled={action.busy || !venueId}>
              Donner l’accès commerçant
            </button>
            {user.roles.includes('merchant') && (
              <button className="danger" onClick={() => act('/api/admin/users/roles/revoke', { role: 'merchant' }, 'Retirer l’accès commerçant ?')} disabled={action.busy}>
                Retirer l’accès commerçant
              </button>
            )}
          </div>
          <div className="row">
            {user.roles.includes('agent') ? (
              <button className="danger" onClick={() => act('/api/admin/users/roles/revoke', { role: 'agent' }, 'Retirer l’accès agent terrain ? Ses commerces restent inscrits.')} disabled={action.busy}>
                Retirer l’accès agent terrain
              </button>
            ) : (
              <button className="ghost" onClick={() => act('/api/admin/users/roles', { role: 'agent' }, 'Faire de ce numéro un agent terrain ? Il pourra inscrire des commerces et voir ceux qu’il a inscrits.')} disabled={action.busy}>
                Donner l’accès agent terrain
              </button>
            )}
          </div>
          <div className="row">
            {user.roles.includes('admin') ? (
              <button className="danger" onClick={() => act('/api/admin/users/roles/revoke', { role: 'admin' }, 'Retirer l’accès administrateur ?')} disabled={action.busy}>
                Retirer l’accès administrateur
              </button>
            ) : (
              <button className="ghost" onClick={() => act('/api/admin/users/roles', { role: 'admin' }, 'Donner l’accès administrateur à ce numéro ? Il pourra tout gérer ici.')} disabled={action.busy}>
                Donner l’accès administrateur
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
