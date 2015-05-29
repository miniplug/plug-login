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

### plugLogin(email, password, rqOpts={}, cb)

Logs in to plug.dj using the given email address and password. You can
optionally pass options to [`request`](https://github.com/request/request) in
the third parameter.

`cb` is a node-style `(err, result)` callback. `result` is an object with two
properties, `{ body, jar }`, where `body` is plug.dj's login response, and `jar`
is the cookie jar used in the login process. You can then use that cookie jar in
subsequent requests, and plug.dj will recognise you.

```javascript
request('https://plug.dj/_/users/me', { json: true, jar: result.jar },
        (e, {}, body) => { /* `body` contains your user info! */ })
```

## License

[MIT](./LICENSE)
