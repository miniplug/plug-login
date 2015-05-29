import request from 'request'
import { strictEqual as eq, ok } from 'assert'
import { statSync as exists } from 'fs'
import { join as joinPath } from 'path'
import login from '../src'

describe('plug.dj', function () {

  it('is reachable', done => {
    request('https://plug.dj/', (e, {}, body) => {
      if (e)
        throw e
      if (body.indexOf('<title>Maintenance') !== -1)
        throw new Error('plug.dj is currently in maintenance mode.')
      done()
    })
  })

})

describe('plug-login', function () {
  this.timeout(5000)

  const INVALID_EMAIL = 'invalid-email@invalid-domain.com'
  const INVALID_PASSWORD = 'not_the_password'
  it('cannot login with invalid credentials', done => {
    login(INVALID_EMAIL, INVALID_PASSWORD, (e, result) => {
      if (e) throw e
      eq(result.body.status, 'badLogin')
      done()
    })
  })

  it('can login with valid credentials', done => {
    ok(exists(joinPath(__dirname, '../test.json')))
    const args = require('../test.json')
    login(args.email, args.password, (e, result) => {
      if (e) throw e
      eq(result.body.status, 'ok')
      done()
    })
  })

})
