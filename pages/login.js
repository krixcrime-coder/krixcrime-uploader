import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import styles from '../styles/Login.module.css'

export default function Login() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        router.push('/dashboard')
      } else {
        setError(data.error || 'Incorrect password')
      }
    } catch {
      setError('Connection error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>KrixCrime — Login</title>
      </Head>
      <div className={styles.container}>
        <div className={styles.box}>
          <div className={styles.logo}>
            <span className={styles.k}>K</span>rixCrime
          </div>
          <h1 className={styles.title}>Upload Dashboard</h1>
          <p className={styles.sub}>Enter your password to continue</p>
          <form onSubmit={handleSubmit} className={styles.form}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              required
              style={{ width: '100%' }}
            />
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={loading}>
              {loading ? <span className="spinner" /> : null}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
