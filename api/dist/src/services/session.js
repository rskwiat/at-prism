import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { db } from '../db/index';
import { sessions, users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
const SESSION_COOKIE = 'session';
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000;
export function getSessionId(c) {
    return getCookie(c, SESSION_COOKIE);
}
export function setSession(c, sessionId) {
    setCookie(c, SESSION_COOKIE, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        maxAge: SESSION_DURATION / 1000,
        path: '/',
    });
}
export function clearSession(c) {
    deleteCookie(c, SESSION_COOKIE, { path: '/' });
}
export function generateSessionId() {
    return randomBytes(32).toString('hex');
}
export async function getCurrentUser(sessionId) {
    if (!sessionId)
        return null;
    const session = await db.query.sessions.findFirst({
        where: eq(sessions.id, sessionId),
    });
    if (!session)
        return null;
    if (new Date(session.expiresAt) < new Date()) {
        await db.delete(sessions).where(eq(sessions.id, sessionId));
        return null;
    }
    const user = await db.query.users.findFirst({
        where: eq(users.did, session.userDid),
    });
    if (!user)
        return null;
    return {
        did: user.did,
        handle: user.handle,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
    };
}
export async function getUserAccessToken(sessionId) {
    const session = await db.query.sessions.findFirst({
        where: eq(sessions.id, sessionId),
    });
    if (!session)
        return null;
    if (new Date(session.expiresAt) < new Date()) {
        return null;
    }
    const user = await db.query.users.findFirst({
        where: eq(users.did, session.userDid),
    });
    if (!user)
        return null;
    return {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        did: session.userDid,
        handle: user.handle,
    };
}
export async function createSession(c, userDid, handle, accessToken, refreshToken, expiresAt, displayName, avatarUrl) {
    const existingUser = await db.query.users.findFirst({ where: eq(users.did, userDid) });
    if (existingUser) {
        await db.update(users).set({ handle, displayName: displayName ?? null, avatarUrl: avatarUrl ?? null }).where(eq(users.did, userDid));
    }
    else {
        await db.insert(users).values({ did: userDid, handle, displayName: displayName ?? null, avatarUrl: avatarUrl ?? null });
    }
    const sessionId = generateSessionId();
    await db.insert(sessions).values({
        id: sessionId,
        userDid,
        accessToken,
        refreshToken,
        expiresAt,
    });
    setSession(c, sessionId);
    return sessionId;
}
