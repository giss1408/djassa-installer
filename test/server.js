import { vi } from 'vitest'

// A stand-in for the Djassa API: routes keyed "METHOD /path" (query string
// ignored unless the key has one), each returning [status, body]. Every call
// is recorded with its parsed JSON body, so a test can assert what was sent.
export function fakeApi(routes) {
  const calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, { method = 'GET', body } = {}) => {
      const { pathname, search } = new URL(url)
      const sent = typeof body === 'string' ? JSON.parse(body) : body
      calls.push({ method, path: pathname, search, body: sent })
      const handler = routes[`${method} ${pathname}${search}`] || routes[`${method} ${pathname}`]
      const [status, json] = handler ? handler(sent) : [404, { detail: 'not found' }]
      return new Response(json === undefined ? '' : JSON.stringify(json), { status })
    }),
  )
  return calls
}

// A token pair as /api/auth/verify and /api/auth/refresh return it.
export const pair = (role) => ({ access_token: `access-${role}`, refresh_token: `refresh-${role}`, token_type: 'bearer', role })

// Signs in through the real api.js code path, with the session role given.
export async function signInAs(role, routes = {}) {
  fakeApi({ 'POST /api/auth/otp/verify': () => [200, pair(role)], ...routes })
  const { verifyCode } = await import('../src/api.js')
  await verifyCode('0700000009', '000000')
}
