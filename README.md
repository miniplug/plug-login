plug-login
==========

[![Greenkeeper badge](https://badges.greenkeeper.io/goto-bus-stop/plug-login.svg)](https://greenkeeper.io/)

Logs into plug.dj using a email address and password.

[![Travis](https://img.shields.io/travis/goto-bus-stop/plug-login.svg?style=flat-square)](https://travis-ci.org/goto-bus-stop/plug-login) [![NPM](https://img.shields.io/npm/v/plug-login.svg?style=flat-square)](https://npmjs.com/package/plug-login)

## Usage

```javascript
const plugLogin = require('plug-login')

plugLogin('my-plug-email@example.com', 'hunter2')
  .then(rejoice)
  .catch(() => {
    // Login failed
  })
```

## API

<a id="pluglogin-user"></a>
### plugLogin(email, password, opts={})
### plugLogin.user(email, password, opts={})

Logs in to plug.dj using the given email address and password. You can
optionally pass options in the third parameter.

Pass `{ authToken: true }` in the options `opts` to also generate a WebSocket
authentication token. (See below.) Other properties are passed through to
[`got`](https://github.com/sindresorhus/got).

Returns a promise. The promise resolves with an object with the properties,
`{ body, session, cookie, token }`, where `body` is plug.dj's login response,
`session` is the session token, `cookie` is a cookie string with the session
token filled in, and `token` is the auth token (if you asked for one). You can
then use the cookie string for `Cookie:` headers in subsequent requests so
plug.dj will recognise you, and you can use the auth token to set up a
connection to the plug.dj WebSocket server.

Using the cookie string with the `got` library:

```javascript
const got = require('got')
plugLogin('got@example.com', 'got-is-small-and-good').then((result) => {
  return got('https://plug.dj/_/users/me', {
    json: true,
    headers: { cookie: result.cookie }
  })
}).then((response) => {
  console.log('logged in as', response.body.data[0])
})
```

Using the cookie string with the `request` library:

```javascript
const request = require('request')
let jar = request.jar()
plugLogin('admin@plug.dj', 'hunter3').then((result) => {
  // Store it in a jar for the correct domain.
  jar.setCookie(result.cookie, 'https://plug.dj/')
  request('https://plug.dj/_/users/me', { jar: jar, json: true }, (err, response) => {
    console.log('logged in as', response.body.data[0])
  })
})
```

<a id="pluglogin-guest"></a>
### plugLogin(opts={})
### plugLogin.guest(opts={})

Gets a plug.dj session cookie and, optionally, WebSocket authentication token
as a guest user.

`opts` takes the same options as user-style `plugLogin()`.

Returns a promise that resolves with an object with the properties,
`{ session, cookie, token }`. See [plugLogin.user](#pluglogin-user) for what
those properties mean.

```javascript
// "logging in" as a guest
plugLogin.guest({ authToken: true }).then((result) => {
  // result.token contains an authentication token for the plug.dj WebSocket.
  require('plug-socket')(result.token)
})
```

## License

[MIT](./LICENSE)
