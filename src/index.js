import request from 'request'

function error(status, message) {
  return new Error(`${status}: ${message}`)
}

function getCsrf(opts, cb) {
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
  ], (e, [, token = undefined ]) => {
    if (e) cb(e)
    else   cb(null, { token, jar: opts.jar })
  })
}

login.getAuthToken = getAuthToken
login.guest = guest

export default function login(email, password, opts, cb = null) {
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
  ], (e, [, body, token = undefined ]) => {
    if (e) cb(e)
    else   cb(null, { body, token, jar: opts.jar })
  })

}
