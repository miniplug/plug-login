plug-login
==========

Logs into plug.dj using a email address and password.

## Usage

```javascript
const plugLogin = require('plug-login')

plugLogin('my-plug-email@example.com', 'hunter2', (err, result) => {
  if (err) throw up
  else     rejoice() // can now do things with result.jar
})

// with custom request options
let jar = request.jar()
plugLogin(
  'admin@plug.dj', 'hunter3',
  { jar: jar, headers: { 'user-agent': 'third party app™' } },
  (err, result) => {
    if (err) throw err
    console.log(result.body)
  }
)
```

## API

### plugLogin(email, password, opts={}, cb)

Logs in to plug.dj using the given email address and password. You can
optionally pass options in the third parameter.

`opts` can take some additional. Pass `{ authToken: true }` to also generate a
WebSocket authentication token. (See below.) Other properties are passed
straight to [`request`](https://github.com/request/request). A useful one is
`jar`, which will tell `request` to use an existing cookie jar instead of
creating a new one.

`cb` is a node-style `(err, result)` callback. `result` is an object with two
properties, `{ body, jar, token }`, where `body` is plug.dj's login response,
`jar` is the cookie jar used in the login process, and `token` is the auth token
(if you asked for one). You can then use the cookie jar in subsequent requests
so plug.dj will recognise you, and you can use the auth token to set up a
connection to the plug.dj WebSocket server.

```javascript
request('https://plug.dj/_/users/me', { json: true, jar: result.jar },
        (e, {}, body) => { /* `body` contains your user info! */ })

// Easy WebSocket connection setup using "plug-socket"
let socket = require('plug-socket')(result.token)
```

### plugLogin.guest(opts={}, cb)

Gets a plug.dj session cookie and, optionally, WebSocket authentication token
as a guest user.

`opts` takes the same options as `plugLogin()`.

`cb` is a node-style `(err, result)` callback. `result` is similar to what is
returned by `plugLogin()`, minus the `body` property.

### plugLogin.getAuthToken(jar, cb)

You can use the `getAuthToken` method separately, for example if you still have
the cookie jar used for the previous login lying around. Pass the cookie jar to
`getAuthToken(jar)` and you'll get a shiny new auth token for the plug.dj socket
server.

```javascript
function reconnectToSocketServer() {
  plugLogin.getAuthToken(jarUsedForPreviousLogin, (e, token) => {
    if (e) throw e
    socket = require('plug-socket')(token)
  })
}
```

## License

[MIT](./LICENSE)
