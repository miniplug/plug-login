/* global describe, it */
import request from 'request'
import { strictEqual as eq, ok } from 'assert'
import login from '../src'

const host = process.env.PLUG_LOGIN_HOST || 'https://plug.dj'

describe('plug.dj', function () {
  this.timeout(30000)

  it('is reachable', (done) => {
    request(host, (e, _, body) => {
      if (e) {
        throw e
      }
      if (body.indexOf('<title>maintenance') !== -1) {
        throw new Error('plug.dj is currently in maintenance mode.')
      }
      done()
    })
  })
})

describe('plug-login', function () {
  this.timeout(30000)

  ok(process.env.PLUG_LOGIN_NAME, 'pass your test email in the PLUG_LOGIN_NAME env var')
  ok(process.env.PLUG_LOGIN_PASS, 'pass your test password in the PLUG_LOGIN_PASS env var')

  const args = {
    email: process.env.PLUG_LOGIN_NAME,
    password: process.env.PLUG_LOGIN_PASS
  }

  const INVALID_EMAIL = 'invalid-email@invalid-domain.com'
  const INVALID_PASSWORD = 'not_the_password'
  it('cannot login with invalid credentials', done => {
    login(INVALID_EMAIL, INVALID_PASSWORD, { host }, (e, result) => {
      if (e) throw e
      eq(result.body.status, 'badLogin')
      done()
    })
  })

  it('can login with valid credentials', done => {
    login(args.email, args.password, { host }, (e, result) => {
      if (e) throw e
      eq(result.body.status, 'ok')
      done()
    })
  })

  it('returns a usable cookie jar', function (done) {
    login(args.email, args.password, { host }, (e, result) => {
      if (e) throw e
      eq(result.body.status, 'ok')
      request(`${host}/_/users/me`, {
        json: true,
        jar: result.jar
      }, (e, _, body) => {
        if (e) throw e
        ok(body.data[0].id)
        done()
      })
    })
  })

  it('can optionally retrieve an auth token', function (done) {
    login(args.email, args.password, { host, authToken: true }, (e, result) => {
      if (e) throw e
      eq(result.body.status, 'ok')
      eq(typeof result.token, 'string')
      done()
    })
  })

  it('can retrieve auth tokens for guest users', function (done) {
    login.guest({ host, authToken: true }, (e, result) => {
      if (e) throw e
      eq(typeof result.token, 'string')
      done()
    })
  })

  // https://github.com/goto-bus-stop/plug-login/issues/1
  it('passes errors nicely instead of blowing up', function (done) {
    login.user(args.email, args.password, {
      host,
      _simulateMaintenance: true
    }, (e, result) => {
      ok(e)
      done()
    })
  })
})
