import { useState } from 'react'
import { requestCode, verifyCode } from '../api.js'
import { useAction } from '../lib.js'
import { ErrorBox, Field } from '../ui.jsx'

export default function SignIn() {
  const [phone, setPhone] = useState(import.meta.env.DEV ? '0700000009' : '')
  const [code, setCode] = useState('')
  const [sentTo, setSentTo] = useState(null)
  const action = useAction()

  const send = (e) => {
    e.preventDefault()
    action.run(async () => {
      const sent = await requestCode(phone)
      setSentTo(sent.phone_masked)
      // Only a local backend with OTP_DEV_ECHO=1 returns the code.
      if (sent.dev_code) setCode(sent.dev_code)
    })
  }

  const verify = (e) => {
    e.preventDefault()
    action.run(() => verifyCode(phone, code))
  }

  return (
    <div className="signin">
      <h1>
        Fidelia <em>installateur</em>
      </h1>
      <p className="muted">Réservé à l’équipe Fidelia. Connexion par numéro de téléphone et code SMS.</p>
      {!sentTo ? (
        <form onSubmit={send}>
          <Field label="Numéro de téléphone">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoFocus placeholder="07 12 34 56 78" />
          </Field>
          <button disabled={action.busy || phone.length < 8}>Recevoir le code</button>
        </form>
      ) : (
        <form onSubmit={verify}>
          <p>Code envoyé au {sentTo}.</p>
          <Field label="Code à 6 chiffres">
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" autoFocus />
          </Field>
          <button disabled={action.busy || code.length !== 6}>Se connecter</button>
          <button type="button" className="ghost" onClick={() => setSentTo(null)}>
            Changer de numéro
          </button>
        </form>
      )}
      <ErrorBox error={action.error} />
    </div>
  )
}
