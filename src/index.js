import request from 'request'

const DEFAULT_HOST = 'https://plug.dj'

function error (status, message) {
  let e = new Error(`${status}: ${message}`)
  e.status = status
  return e
}

function getCsrf (opts, cb) {
  // for testing
  if (opts._simulateMaintenance) {
    setTimeout(() => {
      cb(new Error('Could not find CSRF token'))
    }, 300)
    return
  }
  request(opts.host, opts, (e, res, body) => {
    if (e) {
      cb(e)
    } else {
      let match = /csrf\s?=\s?"(.*?)"/.exec(body)
      if (match[1]) {
        cb(null, match[1])
      } else {
        cb(new Error('Could not find CSRF token'))
      }
    }
  })
}

function doLogin (opts, csrf, email, password, cb) {
  request.post(`${opts.host}/_/auth/login`, {
    ...opts,
    json: true,
    body: { csrf, email, password }
  }, (e, _, body) => {
    if (e) {
      cb(e)
    } else {
      cb(null, body)
    }
  })
}

function getAuthToken (opts, cb) {
  if (!opts.jar) {
    opts = normalizeOptions({ jar: opts })
  } else {
    opts = normalizeOptions(opts)
  }

  request(`${opts.host}/_/auth/token`, {
    ...opts,
    json: true
  }, (e, _, body) => {
    if (e) {
      cb(e)
    } else if (body.status !== 'ok') {
      cb(error(body.status, body.data[0]))
    } else {
      cb(null, body.data[0])
    }
  })
}

// calls node-style async functions in sequence, passing
// the results of all previous functions to every next one
function sequence (functions, cb, values = []) {
  if (functions.length === 0) return cb(null, values)
  functions.shift()((e, value) => {
    if (e) {
      cb(e)
    } else {
      sequence(functions, cb, values.concat([ value ]))
    }
  }, values)
}

function normalizeOptions (maybeOpts = {}) {
  const opts = { ...maybeOpts }
  if (!opts.jar) {
    opts.jar = request.jar()
  }
  if (!opts.host) {
    opts.host = DEFAULT_HOST
  } else {
    // Trim slashes
    opts.host = opts.host.replace(/\/+$/, '')
  }
  return opts
}

function guest (opts, cb = null) {
  if (!cb) {
    [ cb, opts ] = [ opts, {} ]
  }

  opts = normalizeOptions(opts)

  sequence([
    cb => request(`${opts.host}/plug-socket-test`, opts, cb),
    cb => opts.authToken ? getAuthToken(opts, cb) : cb(null)
  ], (e, results) => {
    if (e) {
      cb(e)
    } else {
      cb(null, { token: results[1], jar: opts.jar })
    }
  })
}

function user (email, password, opts, cb = null) {
  if (!cb) {
    [ cb, opts ] = [ opts, {} ]
  }

  opts = normalizeOptions(opts)

  sequence([
    (cb) => getCsrf(opts, cb),
    (cb, [ csrf ]) => doLogin(opts, csrf, email, password, cb),
    (cb) => opts.authToken ? getAuthToken(opts, cb) : cb(null)
  ], (e, results) => {
    if (e) {
      cb(e)
    } else {
      cb(null, { body: results[1], token: results[2], jar: opts.jar })
    }
  })
}

function login (email, password, opts, cb = null) {
  if (typeof email === 'string') {
    return user(email, password, opts, cb)
  } else {
    [ opts, cb ] = [ email, password ]
    return guest(opts, cb)
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
