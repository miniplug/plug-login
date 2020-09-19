/* global describe, it, before */
import fetch from 'node-fetch'
import assert from 'assert'
import * as login from 'plug-login'

const host = process.env.PLUG_LOGIN_HOST || 'https://plug.dj'

describe('plug-login', function () {
  this.timeout(30000)

  // Check that plug.dj is reachable.
  before(() =>
    fetch(host)
      .then((response) => response.text())
      .then((body) => {
        if (body.indexOf('<title>maintenance') !== -1) {
          throw new Error('plug.dj is currently in maintenance mode.')
        }
      })
  )

  assert.ok(process.env.PLUG_LOGIN_NAME, 'pass your test email in the PLUG_LOGIN_NAME env var')
  assert.ok(process.env.PLUG_LOGIN_PASS, 'pass your test password in the PLUG_LOGIN_PASS env var')

  const args = {
    email: process.env.PLUG_LOGIN_NAME,
    password: process.env.PLUG_LOGIN_PASS
  }

  const INVALID_EMAIL = 'invalid-email@invalid-domain.com'
  const INVALID_PASSWORD = 'not_the_password'
  it('cannot login with invalid credentials', () =>
    login.user(INVALID_EMAIL, INVALID_PASSWORD, { host }).then(assert.fail, (result) => {
      assert.ok(result)
    })
  )

  it('can login with valid credentials', () =>
    login.user(args.email, args.password, { host }).then((result) => {
      assert.ok(result.session)
    })
  )

  it('returns a cookie string that can be used for authenticated requests', () =>
    login.user(args.email, args.password, { host }).then((result) => {
      assert.ok(result.session)
      return fetch(`${host}/_/users/me`, {
        headers: { cookie: result.cookie }
      }).then((response) => response.json()).then((body) => {
        assert.ok(body.data[0].id)
      })
    })
  )

  it('can optionally retrieve an auth token', () =>
    login.user(args.email, args.password, { host, authToken: true }).then((result) => {
      assert.ok(result.session)
      assert.strictEqual(typeof result.token, 'string')
    })
  )

  it('can retrieve auth tokens for guest users', () =>
    login.guest({ host, authToken: true }).then((result) => {
      assert.strictEqual(typeof result.token, 'string')
    })
  )

  // https://github.com/miniplug/plug-login/issues/1
  it('passes errors nicely instead of blowing up', () =>
    login.user(args.email, args.password, {
      host,
      _simulateMaintenance: true
    }).then(assert.fail, assert.ok)
  )
})
