import { SignJWT, jwtVerify } from 'jose';

export interface TokenPayload {
  sub: number; // user id
  username: string;
  role: 'admin' | 'user';
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET nije postavljen. Proveri .env fajl.');
  }
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ username: payload.username, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(payload.sub))
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      sub: Number(payload.sub),
      username: payload.username as string,
      role: payload.role as 'admin' | 'user',
    };
  } catch {
    return null;
  }
}
