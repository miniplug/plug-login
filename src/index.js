import fetch from 'node-fetch'
import { parse, serialize } from 'cookie'
import props from 'promise-props'

const DEFAULT_HOST = 'https://plug.dj'

// Enhance a `fetch` options object to use a JSON body when sending data.
function json (opts) {
  return {
    ...opts,
    headers: {
      ...opts.headers,
      'content-type': 'application/json'
    },
    body: JSON.stringify(opts.body)
  }
}

// Create an HTTP response error.
function error (response, status, message) {
  let e = new Error(`${status}: ${message}`)
  e.response = response
  e.status = status
  return e
}

// Get the JSON response from the plug.dj API, throwing if it is an error response.
function getJSON (response) {
  return response.json().then((body) => {
    if (body.status !== 'ok') {
      throw error(response, body.status, body.data[0])
    }
    return body
  })
}

// Extract the session cookie value from an array of set-cookie headers.
function getSessionCookie (headers) {
  if (!headers) return
  const cookie = parse(headers)
  if (cookie.session) return cookie.session
}

// Build a "Cookie:" header value with a session cookie.
function makeSessionCookieHeader (session) {
  return serialize('session', session, {
    // Should not URL-encode: plug.dj only accepts unencoded "|" characters.
    encode: value => value
  })
}

function addCookieToHeaders (opts, session) {
  if (!opts.headers || !opts.headers.cookie) {
    opts.headers = Object.assign(opts.headers || {}, {
      cookie: makeSessionCookieHeader(session)
    })
  }
  return opts
}

// Get a CSRF token and session cookie for logging into plug.dj from their main
// page.  Without the CSRF token, login requests will be rejected.
function getCsrf (opts) {
  // for testing
  if (opts._simulateMaintenance) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error('Could not find CSRF token'))
      }, 300)
    })
  }

  return fetch(`${opts.host}/_/mobile/init`, json(opts))
    .then((response) => props({
      csrf: getJSON(response).then((body) => body.data[0].c),
      session: getSessionCookie(response.headers.get('set-cookie'))
    }))
}

// Log in to plug.dj with an email address and password.
// `opts` must contain headers with a session cookie.
function doLogin (opts, csrf, email, password) {
  return fetch(`${opts.host}/_/auth/login`, json({
    ...opts,
    method: 'post',
    body: { csrf, email, password }
  })).then((response) => props({
    session: getSessionCookie(response.headers.get('set-cookie')),
    body: getJSON(response)
  }))
}

function getAuthToken (opts) {
  opts = normalizeOptions(opts)

  return fetch(`${opts.host}/_/auth/token`, json(opts))
    .then((response) => getJSON(response))
    .then((body) => body.data[0])
}

function normalizeOptions (maybeOpts = {}) {
  const opts = { ...maybeOpts }
  if (!opts.host) {
    opts.host = DEFAULT_HOST
  } else {
    // Trim slashes
    opts.host = opts.host.replace(/\/+$/, '')
  }
  return opts
}

function guest (opts) {
  opts = normalizeOptions(opts)

  return fetch(`${opts.host}/plug-socket-test`, opts).then((response) => {
    if (!response.ok) {
      throw error(response, response.status, response.statusText)
    }

    return response.text().then((body) => {
      if (/<title>maintenance mode/.test(body)) {
        throw error(response, 'maintenanceMode', 'The site is in maintenance mode')
      }

      const session = getSessionCookie(response.headers.get('set-cookie'))
      opts = addCookieToHeaders(opts, session)
      return props({
        session,
        cookie: makeSessionCookieHeader(session),
        token: opts.authToken ? getAuthToken(opts) : null
      })
    })
  })
}

function user (email, password, opts) {
  opts = normalizeOptions(opts)

  return getCsrf(opts)
    .then(({ csrf, session }) => {
      opts = addCookieToHeaders(opts, session)
      return doLogin(opts, csrf, email, password)
    })
    .then((result) => props({
      session: result.session,
      cookie: makeSessionCookieHeader(result.session),
      token: opts.authToken ? getAuthToken(opts) : null
    }))
}

export default function login (email, password, opts) {
  if (typeof email === 'string') {
    return user(email, password, opts)
  } else {
    return guest(email)
  }
}

login.user = user
login.guest = guest
login.getAuthToken = getAuthToken
