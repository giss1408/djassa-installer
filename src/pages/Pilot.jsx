import { useState } from 'react'
import { api } from '../api.js'
import { CATEGORIES, formatDate, useAction, useLoad } from '../lib.js'
import { ErrorBox, Field, Loading } from '../ui.jsx'

const GENDERS = { woman: 'Femme', man: 'Homme', undisclosed: 'Préfère ne pas répondre' }
const COMMITMENTS = { undecided: 'Réfléchit', committed: 'Engagé', declined: 'Refuse' }
const PLANS = { starter: 'Starter', growth: 'Growth', network: 'Réseau' }

const NUMBERS = ['baseline_tickets_per_day', 'baseline_average_basket', 'baseline_mobile_money_pct', 'baseline_repeat_pct', 'commitment_price']
const TEXTS = ['owner_gender', 'commitment', 'commitment_plan', 'notes']

// What the team records by hand on a pilot merchant: the "before Fidelia"
// baseline, the owner's self-declared gender, and the day-45 answer to the
// paid-plan offer. Everything is sent on save; an empty field clears it.
export function PilotCard({ shopId }) {
  const record = useLoad(() => api(`/api/admin/venues/${shopId}/pilot`), [shopId])
  return (
    <div className="card">
      <h2>Pilote</h2>
      <Loading state={record}>{record.data && <PilotForm shopId={shopId} record={record.data} reload={record.reload} />}</Loading>
    </div>
  )
}

function PilotForm({ shopId, record, reload }) {
  const [form, setForm] = useState(() => Object.fromEntries([...NUMBERS, ...TEXTS].map((k) => [k, record[k] ?? ''])))
  const save = useAction()
  const [saved, setSaved] = useState(false)
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const submit = (e) => {
    e.preventDefault()
    setSaved(false)
    const body = {}
    for (const k of NUMBERS) body[k] = form[k] === '' ? null : Number(form[k])
    for (const k of TEXTS) body[k] = form[k] === '' ? null : form[k]
    save.run(async () => {
      await api(`/api/admin/venues/${shopId}/pilot`, { method: 'PUT', body })
      setSaved(true)
      reload()
    })
  }

  return (
    <form onSubmit={submit}>
      {!record.in_pilot && <p className="muted">Ce commerce n’est pas encore dans le pilote : enregistrer cette fiche l’y ajoute.</p>}

      <h3>Avant Fidelia (entretien de la phase 0)</h3>
      <p className="muted">
        Les chiffres du gérant, à relever <strong>avant sa première vente</strong> dans Fidelia : c’est la base qui prouve, ou non, que la
        fidélité fait revenir les clients.
        {record.baseline_recorded_at && <> Relevée le {formatDate(record.baseline_recorded_at)}.</>}
      </p>
      {record.baseline_before_first_sale === false && (
        <p className="warn" role="status">
          Base relevée après la première vente : l’écart de fidélisation de ce commerce sera moins fiable.
        </p>
      )}
      <div className="grid">
        <Field label="Tickets par jour">
          <input type="number" min="0" value={form.baseline_tickets_per_day} onChange={set('baseline_tickets_per_day')} />
        </Field>
        <Field label="Panier moyen (F)">
          <input type="number" min="0" value={form.baseline_average_basket} onChange={set('baseline_average_basket')} />
        </Field>
        <Field label="Part payée en mobile money (%)">
          <input type="number" min="0" max="100" value={form.baseline_mobile_money_pct} onChange={set('baseline_mobile_money_pct')} />
        </Field>
        <Field label="Clients qui reviennent sous 30 jours (%)" hint="Estimation du gérant.">
          <input type="number" min="0" max="100" value={form.baseline_repeat_pct} onChange={set('baseline_repeat_pct')} />
        </Field>
        <Field label="Genre du gérant" hint="Déclaré par le gérant, facultatif. Compté au total, jamais utilisé pour évaluer le commerce.">
          <select value={form.owner_gender} onChange={set('owner_gender')}>
            <option value="">Non demandé</option>
            {Object.entries(GENDERS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <h3>Engagement au jour 45</h3>
      <p className="muted">
        Vers le jour 45, proposer la formule payante qui démarre à la fin du pilote. Le pilote reste gratuit : aucun paiement n’est demandé
        maintenant.
        {record.commitment_at && <> Réponse du {formatDate(record.commitment_at)}.</>}
      </p>
      <div className="grid">
        <Field label="Réponse">
          <select value={form.commitment} onChange={set('commitment')}>
            <option value="">Pas encore proposé</option>
            {Object.entries(COMMITMENTS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Formule">
          <select value={form.commitment_plan} onChange={set('commitment_plan')}>
            <option value="">—</option>
            {Object.entries(PLANS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Prix accepté (F / mois)">
          <input type="number" min="0" value={form.commitment_price} onChange={set('commitment_price')} />
        </Field>
      </div>
      <Field label="Notes">
        <textarea rows="2" value={form.notes} onChange={set('notes')} />
      </Field>
      <button disabled={save.busy}>Enregistrer la fiche pilote</button>
      {saved && <span className="ok"> Enregistré</span>}
      <ErrorBox error={save.error} />
    </form>
  )
}

const pct = (value) => (value == null ? '—' : `${Math.round(value * 100)} %`)

// One line per pilot merchant, with the counts next to every rate: with 5 to
// 10 merchants, one merchant moves a percentage by 10 to 20 points.
export default function PilotScorecard() {
  const [days, setDays] = useState(30)
  const card = useLoad(() => api(`/api/admin/pilot/scorecard?days=${days}`), [days])
  return (
    <section>
      <div className="title-row">
        <h1>Pilote</h1>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Période">
          {[30, 60, 90].map((d) => (
            <option key={d} value={d}>
              {d} derniers jours
            </option>
          ))}
        </select>
      </div>
      <p className="muted">
        Lisez les nombres, pas seulement les pourcentages : avec 5 à 10 commerçants, un seul commerçant fait varier un pourcentage de 10 à 20
        points. Un commerce entre dans le pilote quand sa fiche pilote est enregistrée.
      </p>
      <Loading state={card}>{card.data && <Scorecard card={card.data} />}</Loading>
    </section>
  )
}

function Scorecard({ card }) {
  const n = card.merchants
  if (!n) return <p className="muted">Aucun commerce dans le pilote pour l’instant.</p>
  return (
    <>
      <ul className="totals">
        <li>
          <strong>{n}</strong> commerçants, dont {card.women} femmes
        </li>
        <li>
          Base relevée : {card.with_baseline}/{n}
        </li>
        <li>
          Ventes enregistrées ≥ 70 % : {card.recording_70}/{n} · ≥ 85 % : {card.recording_85}/{n}
        </li>
        <li>
          Nouveaux clients amenés par les offres : {card.with_new_customers}/{n}
        </li>
        <li>
          Engagés pour la formule payante : {card.committed}/{n} (refus : {card.declined})
        </li>
      </ul>
      <table>
        <thead>
          <tr>
            <th>Commerce</th>
            <th>Ventes enregistrées</th>
            <th>Clients revenus</th>
            <th>Offres</th>
            <th>Engagement</th>
            <th>Genre</th>
          </tr>
        </thead>
        <tbody>
          {card.rows.map((r) => (
            <tr key={r.venue_id}>
              <td>
                <a href={`#/shops/${r.venue_id}`}>{r.venue_name}</a>
                <br />
                <small className="muted">
                  {CATEGORIES[r.category] || r.category} · {r.commune}
                  {r.days_since_first_sale != null && ` · J${r.days_since_first_sale}`}
                </small>
              </td>
              <td>
                {pct(r.recorded_share)}
                <br />
                <small className="muted">{r.daily_reports} jours déclarés</small>
              </td>
              <td>
                {r.returning_customers}/{r.identified_customers}
                {r.repeat_pct != null && ` (${r.repeat_pct} %)`}
                <br />
                <small className="muted">
                  base {r.baseline_repeat_pct == null ? '—' : `${r.baseline_repeat_pct} %`}
                  {r.repeat_lift_pts != null && ` · écart ${r.repeat_lift_pts > 0 ? '+' : ''}${r.repeat_lift_pts} pts`}
                </small>
                {r.baseline_before_first_sale === false && (
                  <small className="warn" title="Base relevée après la première vente">
                    {' '}
                    ⚠
                  </small>
                )}
              </td>
              <td>
                {r.new_customers_from_offers} nouveaux / {r.offer_uses}
              </td>
              <td>
                {COMMITMENTS[r.commitment] || '—'}
                {r.commitment === 'committed' && (
                  <>
                    <br />
                    <small className="muted">
                      {PLANS[r.commitment_plan] || r.commitment_plan} · {r.commitment_price} F
                    </small>
                  </>
                )}
              </td>
              <td>{GENDERS[r.owner_gender] || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
