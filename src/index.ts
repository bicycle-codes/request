import { Implementation } from '@oddjs/odd/components/crypto/implementation'
import {
    SignedRequest as SignedMsg,
    create as createMsg,
    verify as msgVerify
} from '@ssc-half-light/message'
import { KyInstance } from 'ky/distribution/types/ky'
import { parseHeader } from './parse.js'
export { parseHeader } from './parse.js'

/**
 * Create a `ky` that will add a signed Bearer token to each request.
 * @param ky Ky library
 * @param {Implementation} crypto The crypto object from odd
 * @param startingSeq The number to start from, or a localstorage instance
 * @returns {KyInstance}
 */
export function SignedRequest (
    ky:KyInstance,
    crypto:Implementation,
    startingSeq:number|Storage,
    opts?:Record<string, any>
):KyInstance {
    let seq:number = 0

    if (typeof startingSeq !== 'number') {  // is local storage
        const n = startingSeq.getItem('__seq')
        if (n) {
            try {
                seq = parseInt(n)
            } catch (err) {
                seq = 0
            }
        }
    }

    return ky.create({
        hooks: {
            beforeRequest: [
                async req => {
                    // increment seq
                    // and save it in localstorage
                    seq++
                    if (
                        (typeof Storage !== 'undefined') &&
                        (startingSeq instanceof Storage)
                    ) {
                        startingSeq.setItem('__seq', String(seq))
                    }

                    req.headers.set('Authorization',
                        await createHeader(crypto, seq, opts))
                }
            ]
        }
    })
}

export function HeaderFactory (
    crypto:Implementation,
    opts?:Record<string, any>,
    ls?:Storage
):()=>Promise<`Bearer ${string}`> {
    return function getHeader ():Promise<`Bearer ${string}`> {
        let seq = 0
        const storage = ls ?? window.localStorage
        const n = storage.getItem('__seq')

        if (n) {
            try {
                seq = parseInt(n)
            } catch (err) {
                seq = 0
            }
        }

        seq++
        storage.setItem('__seq', String(seq))
        const header = createHeader(crypto, seq, opts)
        return header
    }
}

export async function createHeader (
    crypto:Implementation,
    seq:number,
    opts?:Record<string, any>,
):Promise<`Bearer ${string}`> {
    return encodeToken(await createToken(crypto, seq, opts))
}

export type Token<T> = SignedMsg<{
    seq:number,
} & {
    [K in keyof T]: T[K]
}>

export function encodeToken<T> (token:Token<T>):`Bearer ${string}` {
    const encoded = btoa(JSON.stringify(token))
    return `Bearer ${encoded}`
}

export function createToken (
    crypto:Implementation,
    seq:number,
    opts?:Record<string, any>
):Promise<Token<typeof opts>> {
    if (!opts) return createMsg(crypto, { seq })
    return createMsg(crypto, { seq, ...opts })
}

export function verify (header:string, seq?:number):Promise<boolean> {
    try {
        const value = parseHeader(header)

        if (seq && seq <= value.seq) {
            return Promise.resolve(false)
        }

        return msgVerify(value)
    } catch (err) {
        return Promise.resolve(false)
    }
}

export function verifyParsed (
    obj:SignedMsg<{ seq:number }>,
    seq?:number
):Promise<boolean> {
    if (seq && seq <= obj.seq) return Promise.resolve(false)
    return msgVerify(obj)
}
