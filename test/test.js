/* global describe, it, before */
import got from 'got'
import { strictEqual as eq, fail, ok } from 'assert'
import login from '../src'

const host = process.env.PLUG_LOGIN_HOST || 'https://plug.dj'

describe('plug-login', function () {
  this.timeout(30000)

  // Check that plug.dj is reachable.
  before(() =>
    got(host).then((res) => {
      if (res.body.indexOf('<title>maintenance') !== -1) {
        throw new Error('plug.dj is currently in maintenance mode.')
      }
    })
  )

  ok(process.env.PLUG_LOGIN_NAME, 'pass your test email in the PLUG_LOGIN_NAME env var')
  ok(process.env.PLUG_LOGIN_PASS, 'pass your test password in the PLUG_LOGIN_PASS env var')

  const args = {
    email: process.env.PLUG_LOGIN_NAME,
    password: process.env.PLUG_LOGIN_PASS
  }

  const INVALID_EMAIL = 'invalid-email@invalid-domain.com'
  const INVALID_PASSWORD = 'not_the_password'
  it('cannot login with invalid credentials', () =>
    login(INVALID_EMAIL, INVALID_PASSWORD, { host }).then(fail, (result) => {
      eq(result.response.body.status, 'badLogin')
    })
  )

  it('can login with valid credentials', () =>
    login(args.email, args.password, { host }).then((result) => {
      eq(result.body.status, 'ok')
    })
  )

  it('returns a cookie string that can be used for authenticated requests', () =>
    login(args.email, args.password, { host }).then((result) => {
      eq(result.body.status, 'ok')
      return got(`${host}/_/users/me`, {
        headers: { cookie: result.cookie },
        json: true
      })
    }).then(({ body }) => {
      ok(body.data[0].id)
    })
  )

  it('can optionally retrieve an auth token', () =>
    login(args.email, args.password, { host, authToken: true }).then((result) => {
      eq(result.body.status, 'ok')
      eq(typeof result.token, 'string')
    })
  )

  it('can retrieve auth tokens for guest users', () =>
    login.guest({ host, authToken: true }).then((result) => {
      eq(typeof result.token, 'string')
    })
  )

  // https://github.com/goto-bus-stop/plug-login/issues/1
  it('passes errors nicely instead of blowing up', () =>
    login.user(args.email, args.password, {
      host,
      _simulateMaintenance: true
    }).then(fail, ok)
  )
})
