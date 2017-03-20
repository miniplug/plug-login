'use strict'
const got = require('got')
const { parse, serialize } = require('cookie')
const props = require('promise-props')

const DEFAULT_HOST = 'https://plug.dj'

// Enhance a `got` options object to use a JSON body when sending data.
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
function error (status, message) {
  let e = new Error(`${status}: ${message}`)
  e.status = status
  return e
}

// Extract the session cookie value from an array of set-cookie headers.
function getSessionCookie (headers) {
  for (let i = 0, l = headers.length; i < l; i++) {
    const cookie = parse(headers[i])
    if (cookie.session) return cookie.session
  }
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

  return got(`${opts.host}/_/mobile/init`, { json: true })
    .then(({ body, headers }) => ({
      csrf: body.data[0].c,
      session: getSessionCookie(headers['set-cookie'])
    }))
}

// Log in to plug.dj with an email address and password.
// `opts` must contain headers with a session cookie.
function doLogin (opts, csrf, email, password) {
  return got.post(`${opts.host}/_/auth/login`, json({
    ...opts,
    json: true,
    body: { csrf, email, password }
  })).then((res) => ({
    session: getSessionCookie(res.headers['set-cookie']),
    body: res.body
  }))
}

function getAuthToken (opts) {
  opts = normalizeOptions(opts)

  return got(`${opts.host}/_/auth/token`, json({
    ...opts,
    json: true
  })).then(({ body }) => {
    if (body.status !== 'ok') {
      throw error(body.status, body.data[0])
    }
    return body.data[0]
  })
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

  return got(`${opts.host}/plug-socket-test`, opts).then((res) => {
    const session = getSessionCookie(res.headers['set-cookie'])
    opts = addCookieToHeaders(opts, session)
    return props({
      session,
      cookie: makeSessionCookieHeader(session),
      token: opts.authToken ? getAuthToken(opts) : null
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

function login (email, password, opts) {
  if (typeof email === 'string') {
    return user(email, password, opts)
  } else {
    return guest(email)
  }
}

// Attempting to offer good support for both `require('plug-login')` and
// `import { … } from 'plug-login'`:

// for `import { login } from 'plug-login'`
login.login = login
// `import { getAuthToken, guest, user }` from 'plug-login'
login.getAuthToken = getAuthToken
login.guest = guest
login.user = user

// `import login from 'plug-login'`
module.exports = login
