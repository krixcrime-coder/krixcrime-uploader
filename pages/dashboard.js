import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Navbar from '../components/Navbar'
import WatermarkEditor from '../components/WatermarkEditor'
import Toast from '../components/Toast'

export default function Dashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('logs')
  const [toast, setToast] = useState(null)

  function showToast(message, type = 'success') {
    setToast({ message, type })
  }

  useEffect(() => {
    fetch('/api/auth').then(r => r.json()).then(d => {
      if (!d.authenticated) router.replace('/login')
    })
  }, [])

  return (
    <>
      <Head><title>KrixCrime — Dashboard</title></Head>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>
        {activeTab === 'logs' && <LogsTab showToast={showToast} />}
        {activeTab === 'settings' && <SettingsTab showToast={showToast} />}
        {activeTab === 'watermark' && <WatermarkTab showToast={showToast} />}
      </main>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 120, padding: '16px 20px' }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || 'var(--text)' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
    </div>
  )
}

function LogsTab({ showToast }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [filters, setFilters] = useState({ status: '', folder: '', search: '' })
  const [expandedRow, setExpandedRow] = useState(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      if (filters.folder) params.set('folder', filters.folder)
      if (filters.search) params.set('search', filters.search)
      params.set('limit', '200')
      const res = await fetch(`/api/logs?${params}`)
      if (res.status === 401) { window.location.href = '/login'; return }
      const d = await res.json()
      if (d.logs) setData(d)
    } catch {
      showToast('Failed to load logs', 'error')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  async function triggerUpload() {
    setTriggering(true)
    try {
      const res = await fetch('/api/trigger', { method: 'POST' })
      const d = await res.json()
      if (d.ok) {
        showToast('Upload triggered on GitHub Actions!')
      } else {
        showToast(d.error || 'Trigger failed', 'error')
      }
    } catch {
      showToast('Connection error', 'error')
    } finally {
      setTriggering(false)
    }
  }

  const stats = data?.stats

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Upload Logs</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Complete history of all upload attempts</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={fetchLogs}>↻ Refresh</button>
          <button className="btn btn-primary" onClick={triggerUpload} disabled={triggering}>
            {triggering ? <span className="spinner" /> : '▶'} Trigger Upload
          </button>
        </div>
      </div>

      {stats && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <StatCard label="Total Uploads" value={stats.total} />
          <StatCard label="Successful" value={stats.success} color="var(--success)" />
          <StatCard label="Failed" value={stats.failed} color="var(--fail)" />
          <StatCard label="Today" value={stats.today_uploads} color="var(--accent)" />
          <StatCard label="This Week" value={stats.week_uploads} />
          <StatCard label="Videos Used" value={stats.total_videos_used} />
        </div>
      )}

      <div className="card" style={{ marginBottom: 16, padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label>Status</label>
            <select
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            >
              <option value="">All</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label>Folder</label>
            <input
              type="text"
              placeholder="Filter by folder…"
              value={filters.folder}
              onChange={e => setFilters(f => ({ ...f, folder: e.target.value }))}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: 2, minWidth: 200 }}>
            <label>Search</label>
            <input
              type="text"
              placeholder="Filename, Drive ID, YouTube ID…"
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              style={{ width: '100%' }}
            />
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => setFilters({ status: '', folder: '', search: '' })}
          >Clear</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <span className="spinner" /> Loading…
          </div>
        ) : !data?.logs?.length ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            No upload logs yet. Run the uploader to see results here.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Date / Time</th>
                  <th>Folder</th>
                  <th>Filename</th>
                  <th>Status</th>
                  <th>YouTube Link</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map((log, i) => (
                  <>
                    <tr key={i} style={{ cursor: 'pointer' }} onClick={() => setExpandedRow(expandedRow === i ? null : i)}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                        <div>{log.date}</div>
                        <div style={{ color: 'var(--text-muted)' }}>{log.time}</div>
                      </td>
                      <td style={{ fontSize: 12, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.folder_name || '—'}
                      </td>
                      <td style={{ fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.file_name || '—'}
                      </td>
                      <td>
                        <span className={`badge badge-${log.status === 'success' ? 'success' : 'fail'}`}>
                          {log.status === 'success' ? '✓ Success' : '✗ Failed'}
                        </span>
                      </td>
                      <td>
                        {log.youtube_url ? (
                          <a href={log.youtube_url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}
                            onClick={e => e.stopPropagation()}>
                            {log.youtube_video_id}
                          </a>
                        ) : '—'}
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={e => { e.stopPropagation(); setExpandedRow(expandedRow === i ? null : i) }}
                        >
                          {expandedRow === i ? '▲' : '▼'}
                        </button>
                      </td>
                    </tr>
                    {expandedRow === i && (
                      <tr key={`${i}-detail`}>
                        <td colSpan={6} style={{ background: 'var(--surface2)', padding: 16 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, fontSize: 12 }}>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Drive File ID</span>
                              <div style={{ fontFamily: 'monospace', marginTop: 2 }}>{log.drive_file_id || '—'}</div>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>YouTube ID</span>
                              <div style={{ fontFamily: 'monospace', marginTop: 2 }}>{log.youtube_video_id || '—'}</div>
                            </div>
                            {log.error && (
                              <div style={{ gridColumn: '1/-1' }}>
                                <span style={{ color: 'var(--fail)' }}>Error</span>
                                <div style={{ fontFamily: 'monospace', background: '#1a0000', padding: 8, borderRadius: 4, marginTop: 2, color: 'var(--fail)', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                  {log.error}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data?.logs && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, textAlign: 'right' }}>
          Showing {data.logs.length} of {data.total_filtered} entries
        </p>
      )}
    </div>
  )
}

function SettingsTab({ showToast }) {
  const [config, setConfig] = useState(null)
  const [saving, setSaving] = useState(false)
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(d => {
        setConfig(d)
        setTagInput((d.tags || []).join(', '))
      })
  }, [])

  async function save() {
    setSaving(true)
    try {
      const updated = { ...config, tags: tagInput.split(',').map(t => t.trim()).filter(Boolean) }
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      })
      const d = await res.json()
      if (d.ok) {
        setConfig(d.config)
        showToast('Settings saved!')
      } else {
        showToast('Save failed', 'error')
      }
    } catch {
      showToast('Connection error', 'error')
    } finally {
      setSaving(false)
    }
  }

  function setTime(index, value) {
    const times = [...(config.upload_times || [])]
    times[index] = value
    setConfig(c => ({ ...c, upload_times: times }))
  }

  function addTime() {
    if ((config.upload_times || []).length >= 5) return
    setConfig(c => ({ ...c, upload_times: [...(c.upload_times || []), '12:00'] }))
  }

  function removeTime(index) {
    const times = [...(config.upload_times || [])]
    times.splice(index, 1)
    setConfig(c => ({ ...c, upload_times: times }))
  }

  if (!config) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <span className="spinner" /> Loading settings…
    </div>
  )

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Settings</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Configure upload schedule, title, description, and tags</p>
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? <span className="spinner" /> : null}
          {saving ? 'Saving…' : '💾 Save Changes'}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>📅 Upload Schedule (UTC)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(config.upload_times || []).map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', width: 80 }}>Slot {i + 1}</span>
              <input
                type="time"
                value={t}
                onChange={e => setTime(i, e.target.value)}
                style={{ width: 140 }}
              />
              <button
                className="btn btn-danger"
                style={{ padding: '6px 12px', fontSize: 13 }}
                onClick={() => removeTime(i)}
                disabled={(config.upload_times || []).length <= 1}
              >✕</button>
            </div>
          ))}
          {(config.upload_times || []).length < 5 && (
            <button className="btn btn-secondary" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={addTime}>
              + Add Time Slot
            </button>
          )}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
          Times are in UTC. GitHub Actions checks within ±30 minutes of each slot. Max 5 slots.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>📝 Video Metadata</h3>

        <div className="form-group">
          <label>Title (applied to every upload)</label>
          <input
            type="text"
            value={config.title || ''}
            onChange={e => setConfig(c => ({ ...c, title: e.target.value }))}
            style={{ width: '100%' }}
            placeholder="Your YouTube video title"
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={config.description || ''}
            onChange={e => setConfig(c => ({ ...c, description: e.target.value }))}
            style={{ width: '100%', minHeight: 120, resize: 'vertical' }}
            placeholder="Your video description…"
          />
        </div>

        <div className="form-group">
          <label>Tags (comma-separated)</label>
          <input
            type="text"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            style={{ width: '100%' }}
            placeholder="anime, krixcrime, clips"
          />
          {tagInput && (
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {tagInput.split(',').map(t => t.trim()).filter(Boolean).map((tag, i) => (
                <span key={i} className="tag">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>📁 Google Drive Source</h3>
        <div className="form-group">
          <label>Main Drive Folder URL</label>
          <input
            type="text"
            value={config.drive_folder_url || ''}
            onChange={e => setConfig(c => ({ ...c, drive_folder_url: e.target.value }))}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: 13 }}
            placeholder="https://drive.google.com/drive/folders/…"
          />
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          This must be the top-level folder. The script will randomly pick sub-folders (ERideBay 1-500, etc.) and videos inside them.
        </p>
      </div>
    </div>
  )
}

function WatermarkTab({ showToast }) {
  const [config, setConfig] = useState(null)
  const [watermark, setWatermark] = useState({ x_percent: 75, y_percent: 85, width_percent: 15 })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(d => {
        setConfig(d)
        setWatermark(d.watermark || { x_percent: 75, y_percent: 85, width_percent: 15 })
      })
  }, [])

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, watermark })
      })
      const d = await res.json()
      if (d.ok) {
        setConfig(d.config)
        showToast('Watermark position saved!')
      } else {
        showToast('Save failed', 'error')
      }
    } catch {
      showToast('Connection error', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!config) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <span className="spinner" /> Loading…
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Watermark Position</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Drag and resize the watermark on the 9:16 preview canvas</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setWatermark({ x_percent: 75, y_percent: 85, width_percent: 15 })}>
            Reset
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <span className="spinner" /> : null}
            {saving ? 'Saving…' : '💾 Save Position'}
          </button>
        </div>
      </div>

      <div className="card">
        <WatermarkEditor watermark={watermark} onChange={setWatermark} />
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>How it works</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Position and size are saved as <strong style={{ color: 'var(--text)' }}>relative percentages</strong>, not pixels.
          When a video is processed, FFmpeg reads the actual video resolution and calculates exact pixel positions from these percentages.
          This means the watermark always appears in exactly the right spot, regardless of video resolution.
          <br /><br />
          The preview canvas represents a <strong style={{ color: 'var(--text)' }}>9:16 vertical video</strong> (e.g., 1080×1920 or 720×1280).
          Position your watermark accordingly.
        </p>
      </div>
    </div>
  )
}
