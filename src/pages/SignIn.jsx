import { useState } from 'react'
import { replaceTemporaryPassword, requestPassword, signIn, signOut } from '../api.js'
import { useAction } from '../lib.js'
import { ErrorBox, Field } from '../ui.jsx'

// At least 8 characters and not only digits. The server stays the authority.
const acceptable = (value) => value.length >= 8 && !/^\d+$/.test(value)

export default function SignIn() {
  const [phone, setPhone] = useState(import.meta.env.DEV ? '0700000009' : '')
  const [password, setPassword] = useState('')
  const [asked, setAsked] = useState(null)
  const action = useAction()

  const submit = (e) => {
    e.preventDefault()
    action.run(() => signIn(phone, password))
  }

  const forgot = () => action.run(async () => setAsked((await requestPassword(phone)).message))

  return (
    <div className="signin">
      <h1>
        Fidelia <em>installateur</em>
      </h1>
      <p className="muted">Réservé à l’équipe Fidelia. Connexion par numéro de téléphone et mot de passe.</p>
      <form onSubmit={submit}>
        <Field label="Numéro de téléphone">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="username" autoFocus placeholder="07 12 34 56 78" />
        </Field>
        <Field label="Mot de passe">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </Field>
        <button disabled={action.busy || phone.length < 8 || !password}>Se connecter</button>
        <button type="button" className="ghost" disabled={action.busy || phone.length < 8} onClick={forgot}>
          Mot de passe oublié ?
        </button>
      </form>
      {asked && <p>{asked}</p>}
      <ErrorBox error={action.error === 'password_not_set' ? 'Ce compte n’a pas encore de mot de passe. Demandez-en un avec « Mot de passe oublié ? ».' : action.error} />
    </div>
  )
}

// After a temporary password the team sent: choose one before anything else.
export function ChoosePassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const action = useAction()
  const problem = !acceptable(password) ? '8 caractères minimum, pas seulement des chiffres' : password !== confirm ? 'Les deux mots de passe sont différents' : null

  const submit = (e) => {
    e.preventDefault()
    action.run(() => replaceTemporaryPassword(password))
  }

  return (
    <div className="signin">
      <h1>Choisissez votre mot de passe</h1>
      <p className="muted">Votre mot de passe était temporaire. Choisissez-en un qui n’est qu’à vous.</p>
      <form onSubmit={submit}>
        <Field label="Nouveau mot de passe" hint="8 caractères minimum, pas seulement des chiffres">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus />
        </Field>
        <Field label="Confirmez le mot de passe">
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </Field>
        {password && confirm && problem && <p className="muted">{problem}</p>}
        <button disabled={action.busy || problem !== null}>Enregistrer</button>
        <button type="button" className="ghost" onClick={signOut}>
          Se déconnecter
        </button>
      </form>
      <ErrorBox error={action.error} />
    </div>
  )
}
