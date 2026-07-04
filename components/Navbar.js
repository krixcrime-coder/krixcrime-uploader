import { useRouter } from 'next/router'

export default function Navbar({ activeTab, setActiveTab }) {
  const router = useRouter()
  const tabs = [
    { id: 'logs', label: '📊 Logs' },
    { id: 'settings', label: '⚙️ Settings' },
    { id: 'watermark', label: '🎨 Watermark' }
  ]

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
  }

  return (
    <nav style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 56,
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'white', letterSpacing: '-0.3px' }}>
          <span style={{ color: 'var(--accent)' }}>K</span>rixCrime
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? 'var(--accent)' : 'transparent',
                color: activeTab === tab.id ? 'white' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 6,
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <button onClick={handleLogout} className="btn btn-secondary" style={{ fontSize: 13, padding: '6px 14px' }}>
        Sign Out
      </button>
    </nav>
  )
}
