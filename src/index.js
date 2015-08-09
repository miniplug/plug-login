import request from 'request'

function error(status, message) {
  let e = new Error(`${status}: ${message}`)
  e.status = status
  return e
}

function getCsrf(opts, cb) {
  // for testing
  if (opts._simulateMaintenance) {
    setTimeout(() => {
      cb(new Error('Could not find CSRF token'))
    }, 300)
    return
  }
  request('https://plug.dj/', opts, function (e, res, body) {
    if (e) cb(e)
    else {
      let match = /csrf\s?=\s?"(.*?)"/.exec(body)
      if (match[1]) cb(null, match[1])
      else          cb(new Error('Could not find CSRF token'))
    }
  })
}

function doLogin(opts, csrf, email, password, cb) {
  request.post(
    'https://plug.dj/_/auth/login'
  , { ...opts
    , json: true
    , body: { csrf, email, password } }
  , (e, {}, body) => {
    if (e) cb(e)
    else   cb(null, body)
  })
}

function getAuthToken(jar, cb) {
  request(
    'https://plug.dj/_/auth/token'
  , { jar, json: true }
  , (e, {}, body) => {
    if (e)                         cb(e)
    else if (body.status !== 'ok') cb(error(body.status, body.data[0]))
    else                           cb(null, body.data[0])
  })
}

// calls node-style async functions in sequence, passing
// the results of all previous functions to every next one
function sequence(functions, cb, values = []) {
  if (functions.length === 0) return cb(null, values)
  functions.shift()((e, value) => {
    if (e) cb(e)
    else   sequence(functions, cb, values.concat([ value ]))
  }, values)
}

function guest(opts, cb = null) {
  if (!cb) {
    [ cb, opts ] = [ opts, {} ]
  }
  if (!opts.jar) {
    opts.jar = request.jar()
  }

  sequence([
    cb => request('https://plug.dj/plug-socket-test', opts, cb),
    cb => opts.authToken ? getAuthToken(opts.jar, cb) : cb(null)
  ], (e, results) => {
    if (e) cb(e)
    else   cb(null, { token: results[1], jar: opts.jar })
  })
}

function user(email, password, opts, cb = null) {
  if (!cb) {
    [ cb, opts ] = [ opts, {} ]
  }
  if (!opts.jar) {
    opts.jar = request.jar()
  }

  sequence([
    cb             => getCsrf(opts, cb),
    (cb, [ csrf ]) => doLogin(opts, csrf, email, password, cb),
    cb             => opts.authToken ? getAuthToken(opts.jar, cb) : cb(null)
  ], (e, results) => {
    if (e) cb(e)
    else   cb(null, { body: results[1], token: results[2], jar: opts.jar })
  })
}

login.getAuthToken = getAuthToken
login.guest = guest
login.user = user

export default function login(email, password, opts, cb = null) {
  if (typeof email === 'string') {
    return user(email, password, opts, cb)
  }
  else {
    [ opts, cb ] = [ email, password ]
    return guest(opts, cb)
  }
}
