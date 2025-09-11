import crypto from 'crypto';
function base64UrlEncode(str) {
    return Buffer.from(str)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    // delete paddings, + -> -, / -> _
}

function base64UrlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return Buffer.from(str, 'base64').toString();
}



const SECRET = process.env.JWT_SECRET || 'my_super_secret';

export function signJwt(payload, expiresInSec = 900) { // default 15 min
    const header = { alg: 'HS256', typ: 'JWT' };
    const exp = Math.floor(Date.now() / 1000) + expiresInSec;
    const payloadWithExp = { ...payload, exp };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payloadWithExp));

    const signature = crypto
        .createHmac('sha256', SECRET)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyJwt(token) {
    const [encodedHeader, encodedPayload, signature] = token.split('.');
    if (!encodedHeader || !encodedPayload || !signature) return null;

    const expectedSig = crypto
        .createHmac('sha256', SECRET)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    if (signature !== expectedSig) return null;

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;

    return payload;
}

export function createTokens(user_id, role) {
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const accessToken = signJwt({ user_id, role }, 3600) // 1 hr

    return { refreshToken, accessToken }
}