import { useEffect, useState } from 'react'
import { onSessionChange, renew, sessionRole, signOut } from './api.js'
import SignIn from './pages/SignIn.jsx'
import Shops from './pages/Shops.jsx'
import ShopDetail from './pages/ShopDetail.jsx'
import PartnerRequests from './pages/PartnerRequests.jsx'
import Recovery from './pages/Recovery.jsx'
import Users from './pages/Users.jsx'
import AppErrors from './pages/AppErrors.jsx'
import { AgentEnrol, AgentShops } from './pages/Agent.jsx'

// Hash routes: a static site needs no server rewrite rules for them.
const NAV = [
  ['#/shops', 'Commerces'],
  ['#/partners', 'Inscriptions'],
  ['#/recovery', 'Récupérations'],
  ['#/users', 'Utilisateurs'],
  ['#/errors', 'Erreurs des apps'],
]

// A field agent enrols shops on site and sees their own; nothing else.
const AGENT_NAV = [
  ['#/enrol', 'Inscrire un commerce'],
  ['#/mine', 'Mes commerces'],
]

function useHash() {
  const [hash, setHash] = useState(window.location.hash || '')
  useEffect(() => {
    const on = () => setHash(window.location.hash || '')
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return hash
}

function AgentPage({ hash }) {
  if (hash.startsWith('#/mine')) return <AgentShops />
  return <AgentEnrol />
}

function Page({ hash }) {
  const shop = hash.match(/^#\/shops\/(\d+)/)
  if (shop) return <ShopDetail id={Number(shop[1])} />
  if (hash.startsWith('#/partners')) return <PartnerRequests />
  if (hash.startsWith('#/recovery')) return <Recovery />
  if (hash.startsWith('#/users')) return <Users />
  if (hash.startsWith('#/errors')) return <AppErrors />
  return <Shops />
}

export default function App() {
  const [session, setSession] = useState('checking')
  const hash = useHash()

  useEffect(() => {
    const off = onSessionChange((signedIn) => setSession(signedIn ? 'in' : 'out'))
    renew()
      .then((ok) => setSession(ok ? 'in' : 'out'))
      .catch(() => setSession('out'))
    return off
  }, [])

  if (session === 'checking') return <p className="center muted">Chargement…</p>
  if (session === 'out') return <SignIn />

  const agent = sessionRole() === 'agent'
  const nav = agent ? AGENT_NAV : NAV
  const current = hash || nav[0][0]
  return (
    <div className="shell">
      <header className="top">
        <a className="brand" href={nav[0][0]}>
          djassa <em>{agent ? 'agent' : 'admin'}</em>
        </a>
        <nav>
          {nav.map(([href, label]) => (
            <a key={href} href={href} className={current.startsWith(href) ? 'active' : ''}>
              {label}
            </a>
          ))}
        </nav>
        <button className="ghost" onClick={signOut}>
          Se déconnecter
        </button>
      </header>
      <main>{agent ? <AgentPage hash={hash} /> : <Page hash={hash} />}</main>
    </div>
  )
}
