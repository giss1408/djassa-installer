// The only way this app talks to the Fidelia API.
//
// Sign-in is the same phone + SMS code as the apps, with app "admin": a
// number holding the admin role gets an admin session, one holding the field
// agent role an agent session (enrol shops, see their own), anyone else none
// (fidelia-BE app/api/auth.py). `sessionRole()` says which.
// The access token lives in memory only. The refresh token lives in
// sessionStorage, so a reload keeps the session but closing the tab ends it.
// An admin session can approve shops and move accounts: it should not
// outlive the tab on a shared office computer.

export const API_BASE = (import.meta.env.VITE_FIDELIA_API_BASE || import.meta.env.VITE_HOSSOUKO_API_BASE || import.meta.env.VITE_DJASSA_API_BASE || 'http://localhost:8000').replace(/\/+$/, '')

const REFRESH_KEY = 'fidelia-installer-refresh'
let accessToken = null
let role = null
let renewing = null
const listeners = new Set()

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function readRefresh() {
  try {
    return sessionStorage.getItem(REFRESH_KEY)
  } catch {
    return null
  }
}

function storePair(pair) {
  accessToken = pair.access_token
  role = pair.role
  try {
    sessionStorage.setItem(REFRESH_KEY, pair.refresh_token)
  } catch {
    // Private mode: the session lasts until reload.
  }
  listeners.forEach((fn) => fn(true))
}

function clearSession() {
  accessToken = null
  role = null
  try {
    sessionStorage.removeItem(REFRESH_KEY)
  } catch {
    // nothing to clear
  }
  listeners.forEach((fn) => fn(false))
}

// "admin" or "agent". Decides what the screens offer; the server enforces it.
export const sessionRole = () => role

export function onSessionChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

async function decode(response) {
  const text = await response.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = null
  }
  if (response.ok) return body
  const detail = body && body.detail
  const message = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((d) => d.msg).join(' · ') : `Erreur ${response.status}`
  throw new ApiError(response.status, message)
}

// Refresh tokens are single use: concurrent renewals share one request, or
// the server would read the second as a stolen token and end the session.
export function renew() {
  if (!renewing) {
    renewing = (async () => {
      const refresh = readRefresh()
      if (!refresh) return false
      const response = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
      })
      if (response.status === 401) {
        clearSession()
        return false
      }
      storePair(await decode(response))
      return true
    })().finally(() => {
      renewing = null
    })
  }
  return renewing
}

export async function api(path, { method = 'GET', body, form, retry = true } = {}) {
  if (!accessToken && !(await renew())) throw new ApiError(401, 'Session expirée')
  const headers = { Authorization: `Bearer ${accessToken}` }
  let payload
  if (form) payload = form
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const response = await fetch(`${API_BASE}${path}`, { method, headers, body: payload })
  if (response.status === 401 && retry && (await renew())) return api(path, { method, body, form, retry: false })
  if (response.status === 401) clearSession()
  return decode(response)
}

// Uploads report progress, which fetch cannot: a 100 MB video over an office
// connection takes a while, and a bar is the difference between waiting and
// clicking again.
export async function upload(path, file, onProgress) {
  if (!accessToken && !(await renew())) throw new ApiError(401, 'Session expirée')
  const send = () =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${API_BASE}${path}`)
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total)
      xhr.onload = () => resolve(new Response(xhr.responseText, { status: xhr.status }))
      xhr.onerror = () => reject(new ApiError(0, 'Connexion impossible'))
      const form = new FormData()
      form.append('file', file)
      xhr.send(form)
    })
  let response = await send()
  if (response.status === 401 && (await renew())) response = await send()
  return decode(response)
}

async function publicPost(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return decode(response)
}

export const requestCode = (phone) => publicPost('/api/auth/otp/request', { phone, app: 'admin' })

export async function verifyCode(phone, code) {
  storePair(await publicPost('/api/auth/otp/verify', { phone, code, app: 'admin' }))
}

export async function signOut() {
  const refresh = readRefresh()
  if (refresh) await publicPost('/api/auth/logout', { refresh_token: refresh }).catch(() => {})
  clearSession()
}
