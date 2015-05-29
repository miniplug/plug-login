import request from 'request'

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

export default function login(email, password, rqOpts, cb = null) {
  if (!cb) {
    [ cb, rqOpts ] = [ rqOpts, {} ]
  }
  if (!rqOpts.jar) {
    rqOpts.jar = request.jar()
  }

  getCsrf(rqOpts, (e, csrf) => {
    if (e) cb(e)
    else {
      doLogin(rqOpts, csrf, email, password, (e, body) => {
        if (e) cb(e)
        else   cb(null, { body, jar: rqOpts.jar })
      })
    }
  })
}
