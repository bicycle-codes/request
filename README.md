# request ![tests](https://github.com/ssc-hermes/request/actions/workflows/nodejs.yml/badge.svg)

Use a `Bearer` token in the request to authenticate. This will sign an intenger with the given [odd instance](https://github.com/oddsdk/ts-odd/blob/main/src/components/crypto/implementation.ts#L14). This is suitable for an access-control type of auth.

The sequence number is an always incrementing integer. It is expected that a server would check that the sequence is larger than the previous sequence, and also check that the signature is valid.

You can pass in either an integer or a localstorage instance. If you pass a localstorage instance, it will read the index `'__seq'`, which should be a number. If there is not a number stored there, we will start at `0`.

This library will increment the sequence number for each request, and if a Storage instance was passed in, it will re-save the sequence number on every request.

## dependencies
This should be ergonomic to use with the existing [odd crypto library](https://github.com/oddsdk/ts-odd).

We also depend the library [ky](https://github.com/sindresorhus/ky) for requests, which you will need to install.

## example

### create an instance
In a web browser, pass an instance of [ky](https://github.com/sindresorhus/ky), and return an extended instance of `ky` that will automatically add a signature to the header as a `Bearer` token.


```ts
import { test } from '@socketsupply/tapzero'
import { AuthRequest, parseHeader, verify } from '@ssc-hermes/request'
import ky from 'ky-universal'

let header:string
// header is like `Bearer ${base64string}`

test('create instance', async t => {
    // `crypto` here is from `odd` -- `program.components.crypto`
    const req = AuthRequest(ky, crypto, 0)

    await req.get('https://example.com/', {
        hooks: {
            afterResponse: [
                (request:Request) => {
                    header = request.headers.get('Authorization')
                    const obj = parseHeader(
                        request.headers.get('Authorization') as string
                    )
                    t.ok(obj, 'should have an Authorization header in request')
                    t.equal(obj.seq, 1, 'should have the right sequence')
                }
            ]
        }
    })
})

test('parse header', t => {
    const obj = parseHeader(header)
    // {
    //      seq: 1,
    //      author: 'did:key:...',
    //      signature: '123abc'
    //}
    t.equal(obj.seq, 1, 'should have the right sequence number')
})

test('verify the header', async t => {
    t.equal(await verify(header), true, 'should validate a valid token')
    // also make sure that the sequence number is greater than the previous
})
```
