import { useState } from 'react'
import { api } from '../api.js'
import { CATEGORIES, WALLETS, clean, useAction, useLoad } from '../lib.js'
import { ErrorBox, Field, Loading } from '../ui.jsx'
import { ShopFields } from './Shops.jsx'

// A field agent standing in the shop: the same form as an admin's "Nouveau
// commerce", with the owner's number required. The shop goes live at once and
// records which agent enrolled it (hossouko-BE app/api/onboarding.py).
export function AgentEnrol() {
  const [shop, setShop] = useState({ category: 'maquis', points_per_100: 1 })
  const [created, setCreated] = useState(null)
  const action = useAction()

  const submit = (e) => {
    e.preventDefault()
    action.run(async () => {
      setCreated(await api('/api/admin/venues', { method: 'POST', body: clean(shop) }))
      setShop({ category: 'maquis', points_per_100: 1 })
      window.scrollTo(0, 0)
    })
  }

  return (
    <section>
      <h1>Inscrire un commerce</h1>
      {created && (
        <div className="card">
          <h2>{created.name} est inscrit</h2>
          <p>
            Le gérant ({created.merchant_phone_masked}) a reçu un SMS. Il peut se connecter à Hossouko Pro avec son numéro, devant vous.
          </p>
          <p className="muted">
            {created.pay_code
              ? `QR de paiement ${WALLETS[created.payout_provider] || ''} créé (code ${created.pay_code}). Le gérant l’affiche depuis Hossouko Pro.`
              : 'Pas de portefeuille : pas de QR de paiement. Le commerce a la fidélité et apparaît dans l’app client.'}
          </p>
        </div>
      )}
      <form className="card" onSubmit={submit}>
        <p className="muted">Vous êtes dans le commerce : vérifiez le nom, l’adresse et le numéro du gérant avec lui.</p>
        <ShopFields value={shop} onChange={setShop} />
        <Field label="Numéro du gérant (connexion Hossouko Pro)" hint="Obligatoire. Un numéro ne gère qu’un commerce. Souvent le même que le portefeuille.">
          <input value={shop.merchant_phone || ''} onChange={(e) => setShop({ ...shop, merchant_phone: e.target.value })} inputMode="tel" required />
        </Field>
        <button disabled={action.busy}>Inscrire le commerce</button>
        <ErrorBox error={action.error} />
      </form>
    </section>
  )
}

export function AgentShops() {
  const shops = useLoad(() => api('/api/agent/venues'), [])
  return (
    <section>
      <h1>Mes commerces</h1>
      <Loading state={shops}>
        {shops.data?.length === 0 ? (
          <p className="muted">Vous n’avez encore inscrit aucun commerce.</p>
        ) : (
          <>
            <p className="muted">{shops.data?.length} commerce(s) inscrit(s) par vous.</p>
            <table>
              <thead>
                <tr>
                  <th>Commerce</th>
                  <th>Catégorie</th>
                  <th>Commune</th>
                  <th>Gérant</th>
                  <th>Paiement</th>
                </tr>
              </thead>
              <tbody>
                {shops.data?.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{CATEGORIES[s.category] || s.category}</td>
                    <td>{s.commune}</td>
                    <td>{s.merchant_phone_masked || <span className="warn">Aucun</span>}</td>
                    <td>{s.pay_code ? WALLETS[s.payout_provider] || s.payout_provider : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Loading>
    </section>
  )
}
