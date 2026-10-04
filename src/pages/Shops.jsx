import { useState } from 'react'
import { api } from '../api.js'
import { CATEGORIES, WALLETS, useAction, useLoad } from '../lib.js'
import { ErrorBox, Field, Loading } from '../ui.jsx'

export default function Shops() {
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [samples, setSamples] = useState(true)
  const [creating, setCreating] = useState(false)
  const params = new URLSearchParams({ include_samples: samples })
  if (q) params.set('q', q)
  if (category) params.set('category', category)
  const shops = useLoad(() => api(`/api/admin/venues?${params}`), [q, category, samples])

  return (
    <section>
      <div className="title-row">
        <h1>Commerces</h1>
        <button onClick={() => setCreating((c) => !c)}>{creating ? 'Fermer' : 'Nouveau commerce'}</button>
      </div>
      {creating && <NewShop onCreated={(id) => (window.location.hash = `#/shops/${id}`)} />}
      <div className="filters">
        <input type="search" placeholder="Nom ou commune" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Toutes catégories</option>
          {Object.entries(CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <label className="check">
          <input type="checkbox" checked={samples} onChange={(e) => setSamples(e.target.checked)} /> Exemples
        </label>
      </div>
      <Loading state={shops}>
        <table>
          <thead>
            <tr>
              <th>Commerce</th>
              <th>Catégorie</th>
              <th>Commune</th>
              <th>Paiement</th>
              <th>Commerçant</th>
              <th>Inscrit par</th>
              <th>Médias</th>
            </tr>
          </thead>
          <tbody>
            {shops.data?.map((s) => (
              <tr key={s.id} onClick={() => (window.location.hash = `#/shops/${s.id}`)} className="link-row">
                <td>
                  <a href={`#/shops/${s.id}`}>{s.name}</a> {s.is_sample && <span className="tag">exemple</span>}
                </td>
                <td>{CATEGORIES[s.category] || s.category}</td>
                <td>{s.commune}</td>
                <td>{s.accepts_payment ? WALLETS[s.payout_provider] || s.payout_provider : '—'}</td>
                <td>{s.has_merchant ? 'Oui' : <span className="warn">Aucun</span>}</td>
                <td>{s.enrolled_by || '—'}</td>
                <td>
                  {s.images} 📷 · {s.videos} 🎬
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shops.data?.length === 0 && <p className="muted">Aucun commerce.</p>}
      </Loading>
    </section>
  )
}

export function ShopFields({ value, onChange }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value })
  return (
    <div className="grid">
      <Field label="Nom">
        <input value={value.name || ''} onChange={set('name')} required />
      </Field>
      <Field label="Catégorie">
        <select value={value.category || 'maquis'} onChange={set('category')}>
          {Object.entries(CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Commune">
        <input value={value.commune || ''} onChange={set('commune')} required />
      </Field>
      <Field label="Adresse ou repère">
        <input value={value.address || ''} onChange={set('address')} />
      </Field>
      <Field label="Téléphone public du commerce">
        <input value={value.phone || ''} onChange={set('phone')} />
      </Field>
      <Field label="Horaires">
        <input value={value.opening_hours || ''} onChange={set('opening_hours')} placeholder="11h - 23h" />
      </Field>
      <Field label="Spécialités">
        <input value={value.specialties || ''} onChange={set('specialties')} />
      </Field>
      <Field label="Points pour 100 F" hint="0 = hors programme fidélité">
        <input type="number" min="0" max="20" value={value.points_per_100 ?? 1} onChange={(e) => onChange({ ...value, points_per_100: Number(e.target.value) })} />
      </Field>
      <Field label="Portefeuille des clients">
        <select value={value.payout_provider || ''} onChange={set('payout_provider')}>
          <option value="">Aucun (pas de QR de paiement)</option>
          {Object.entries(WALLETS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Numéro du portefeuille">
        <input value={value.payout_account || ''} onChange={set('payout_account')} inputMode="tel" />
      </Field>
      <Field label="Description" hint="Visible par les clients">
        <textarea rows="3" value={value.description || ''} onChange={set('description')} />
      </Field>
    </div>
  )
}

function NewShop({ onCreated }) {
  const [shop, setShop] = useState({ category: 'maquis', points_per_100: 1 })
  const action = useAction()
  const submit = (e) => {
    e.preventDefault()
    action.run(async () => {
      const created = await api('/api/admin/venues', { method: 'POST', body: clean(shop) })
      onCreated(created.id)
    })
  }
  return (
    <form className="card" onSubmit={submit}>
      <h2>Nouveau commerce</h2>
      <ShopFields value={shop} onChange={setShop} />
      <Field label="Numéro du commerçant (connexion Djassa Pro)" hint="Un numéro ne gère qu’un commerce. Souvent le même que le portefeuille.">
        <input value={shop.merchant_phone || ''} onChange={(e) => setShop({ ...shop, merchant_phone: e.target.value })} inputMode="tel" />
      </Field>
      <button disabled={action.busy}>Créer le commerce</button>
      <ErrorBox error={action.error} />
    </form>
  )
}
