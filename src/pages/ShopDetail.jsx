import { useEffect, useRef, useState } from 'react'
import { api, upload } from '../api.js'
import { CATEGORIES, WALLETS, clean, formatBytes, useAction, useLoad } from '../lib.js'
import { ErrorBox, Field, Loading, Status } from '../ui.jsx'
import { ShopFields } from './Shops.jsx'

const EDITABLE = ['name', 'category', 'commune', 'address', 'phone', 'opening_hours', 'specialties', 'description', 'points_per_100', 'payout_provider', 'payout_account']

export default function ShopDetail({ id }) {
  const shop = useLoad(() => api(`/api/admin/venues/${id}`), [id])
  return (
    <section>
      <a href="#/shops" className="back">
        ← Commerces
      </a>
      <Loading state={shop}>{shop.data && <Detail shop={shop.data} reload={shop.reload} />}</Loading>
    </section>
  )
}

function Detail({ shop, reload }) {
  const [form, setForm] = useState(() => Object.fromEntries(EDITABLE.map((k) => [k, shop[k] ?? ''])))
  const [merchant, setMerchant] = useState('')
  const save = useAction()
  const qr = useAction()
  const [saved, setSaved] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    setSaved(false)
    save.run(async () => {
      const body = clean(form)
      if (merchant) body.merchant_phone = merchant
      await api(`/api/admin/venues/${shop.id}`, { method: 'PATCH', body })
      setMerchant('')
      setSaved(true)
      reload()
    })
  }

  const rotate = () => {
    if (!window.confirm('Le QR actuel cessera de fonctionner immédiatement. Continuer ?')) return
    qr.run(async () => {
      await api(`/api/admin/venues/${shop.id}/pay-code`, { method: 'POST' })
      reload()
    })
  }

  return (
    <>
      <div className="title-row">
        <h1>{shop.name}</h1>
        {shop.is_sample && <span className="tag">exemple</span>}
      </div>
      <p className="muted">
        {CATEGORIES[shop.category]} · {shop.commune} · Commerçant : {shop.merchant_phone || <span className="warn">aucun</span>}
        {shop.latitude != null && (
          <>
            {' · '}
            <a href={`https://www.openstreetmap.org/?mlat=${shop.latitude}&mlon=${shop.longitude}#map=18/${shop.latitude}/${shop.longitude}`} target="_blank" rel="noreferrer">
              position
            </a>
          </>
        )}
      </p>

      <Media shopId={shop.id} />

      <form className="card" onSubmit={submit}>
        <h2>Informations</h2>
        <ShopFields value={form} onChange={setForm} />
        <Field label={shop.merchant_phone ? 'Changer le numéro du commerçant' : 'Lier un commerçant (numéro)'} hint="Ce numéro se connectera à Hossouko Pro pour ce commerce.">
          <input value={merchant} onChange={(e) => setMerchant(e.target.value)} inputMode="tel" />
        </Field>
        <button disabled={save.busy}>Enregistrer</button>
        {saved && <span className="ok"> Enregistré</span>}
        <ErrorBox error={save.error} />
      </form>

      <div className="card">
        <h2>QR de paiement</h2>
        {shop.pay_code ? (
          <>
            <p>
              Code <code>{shop.pay_code}</code> — contenu du QR : <code>hossouko://pay/{shop.pay_code}</code>
            </p>
            <p className="muted">Portefeuille : {WALLETS[shop.payout_provider] || shop.payout_provider} {shop.payout_account}</p>
            <button className="danger" onClick={rotate} disabled={qr.busy}>
              Remplacer le QR (autocollant perdu ou falsifié)
            </button>
          </>
        ) : (
          <p className="muted">Pas de QR : ajoutez un portefeuille ci-dessus.</p>
        )}
        <ErrorBox error={qr.error} />
      </div>
    </>
  )
}

function Media({ shopId }) {
  const media = useLoad(() => api(`/api/admin/venues/${shopId}/media`), [shopId])
  const [progress, setProgress] = useState(null)
  const action = useAction()
  const input = useRef(null)
  const items = media.data || []
  const processing = items.some((m) => m.status === 'processing')

  // A video converts after the upload; look again until it is done.
  useEffect(() => {
    if (!processing) return undefined
    const t = setTimeout(media.reload, 4000)
    return () => clearTimeout(t)
  }, [processing, media.reload, media.data])

  const add = async (files) => {
    for (const file of files) {
      await action.run(async () => {
        setProgress({ name: file.name, ratio: 0 })
        await upload(`/api/admin/venues/${shopId}/media`, file, (ratio) => setProgress({ name: file.name, ratio }))
      })
    }
    setProgress(null)
    if (input.current) input.current.value = ''
    media.reload()
  }

  const remove = (m) =>
    window.confirm('Supprimer ce média ? Les clients ne le verront plus.') &&
    action.run(async () => {
      await api(`/api/admin/venues/${shopId}/media/${m.id}`, { method: 'DELETE' })
      media.reload()
    })

  const move = (index, delta) =>
    action.run(async () => {
      const ids = items.map((m) => m.id)
      const [moved] = ids.splice(index, 1)
      ids.splice(index + delta, 0, moved)
      await api(`/api/admin/venues/${shopId}/media/order`, { method: 'PUT', body: { ids } })
      media.reload()
    })

  const images = items.filter((m) => m.kind === 'image' && m.status !== 'failed').length
  const videos = items.filter((m) => m.kind === 'video' && m.status !== 'failed').length

  return (
    <div className="card">
      <div className="title-row">
        <h2>Photos et vidéos</h2>
        <span className="muted">
          {images}/10 photos · {videos}/3 vidéos (60 s max)
        </span>
      </div>
      <p className="muted">
        Chaque fichier est allégé avant d’être montré aux clients : photos en WebP (320, 720 et 1280 px, sans données GPS), vidéos en MP4 480p
        (~4,5 Mo par minute) avec une image d’aperçu.
      </p>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/3gpp,video/webm" multiple onChange={(e) => add([...e.target.files])} disabled={action.busy} />
      {progress && (
        <p>
          Envoi de {progress.name} : <progress value={progress.ratio} max="1" /> {Math.round(progress.ratio * 100)} %
        </p>
      )}
      <ErrorBox error={action.error} />
      <Loading state={media}>
        <div className="media-grid">
          {items.map((m, i) => (
            <figure key={m.id} className="media">
              {m.status === 'ready' ? (
                m.kind === 'video' ? (
                  <a href={m.video_url} target="_blank" rel="noreferrer" className="poster">
                    <img src={m.poster_url} alt="" loading="lazy" />
                    <span className="play">▶</span>
                  </a>
                ) : (
                  <a href={m.large_url} target="_blank" rel="noreferrer">
                    <img src={m.thumb_url} alt="" loading="lazy" />
                  </a>
                )
              ) : (
                <div className="placeholder">
                  <Status value={m.status} />
                  {m.error && <small>{m.error}</small>}
                </div>
              )}
              <figcaption>
                <span>
                  {m.kind === 'video' ? `🎬 ${m.duration_s ?? '?'} s · ${formatBytes(m.video_bytes)}` : '📷'}
                  {m.width && ` · ${m.width}×${m.height}`}
                </span>
                <span className="actions">
                  <button className="ghost" title="Avancer" disabled={i === 0 || action.busy} onClick={() => move(i, -1)}>
                    ←
                  </button>
                  <button className="ghost" title="Reculer" disabled={i === items.length - 1 || action.busy} onClick={() => move(i, 1)}>
                    →
                  </button>
                  <button className="ghost danger" title="Supprimer" disabled={action.busy} onClick={() => remove(m)}>
                    ✕
                  </button>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
        {items.length === 0 && <p className="muted">Aucun média pour l’instant.</p>}
      </Loading>
    </div>
  )
}
