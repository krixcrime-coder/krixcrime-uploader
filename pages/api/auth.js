import bcrypt from 'bcryptjs'
import { serialize, parse } from 'cookie'

const SESSION_SECRET = process.env.SESSION_SECRET || 'krixcrime-secret-key-change-me'
const SESSION_COOKIE = 'kc_session'
const SESSION_VALUE = 'authenticated'

function signSession(value) {
  const crypto = require('crypto')
  const hmac = crypto.createHmac('sha256', SESSION_SECRET)
  hmac.update(value)
  return `${value}.${hmac.digest('hex')}`
}

function verifySession(signed) {
  if (!signed) return false
  const [value, sig] = signed.split('.')
  const expected = signSession(value)
  return signed === expected && value === SESSION_VALUE
}

export function isAuthenticated(req) {
  const cookies = parse(req.headers.cookie || '')
  return verifySession(cookies[SESSION_COOKIE])
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { password } = req.body
    if (!password) {
      return res.status(400).json({ error: 'Password required' })
    }

    const passwordHash = process.env.DASHBOARD_PASSWORD_HASH
    let valid = false

    if (passwordHash) {
      valid = await bcrypt.compare(password, passwordHash)
    } else {
      valid = password === (process.env.DASHBOARD_PASSWORD || 'krixcrime2024')
    }

    if (!valid) {
      return res.status(401).json({ error: 'Incorrect password' })
    }

    const signed = signSession(SESSION_VALUE)
    res.setHeader('Set-Cookie', serialize(SESSION_COOKIE, signed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    }))
    return res.json({ ok: true })
  }

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', serialize(SESSION_COOKIE, '', {
      httpOnly: true,
      maxAge: 0,
      path: '/'
    }))
    return res.json({ ok: true })
  }

  if (req.method === 'GET') {
    return res.json({ authenticated: isAuthenticated(req) })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
