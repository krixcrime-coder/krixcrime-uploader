import { isAuthenticated } from './auth'

const GITHUB_API = 'https://api.github.com'

function getGithubHeaders() {
  const token = process.env.GH_PAT
  if (!token) throw new Error('GH_PAT environment variable is not set')
  return {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json'
  }
}

function getRepo() {
  const repo = process.env.GITHUB_REPOSITORY
  if (!repo) throw new Error('GITHUB_REPOSITORY is not set')
  return repo
}

async function getJsonFromGithub(repo, filePath, fallback) {
  const res = await fetch(`${GITHUB_API}/repos/${repo}/contents/${filePath}`, {
    headers: getGithubHeaders()
  })
  if (res.status === 404) return fallback
  if (!res.ok) return fallback
  const data = await res.json()
  try {
    return JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'))
  } catch {
    return fallback
  }
}

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    const repo = getRepo()

    const [logs, usedIds] = await Promise.all([
      getJsonFromGithub(repo, 'uploaded_log.json', []),
      getJsonFromGithub(repo, 'used_video_ids.json', {})
    ])

    const safeLog = Array.isArray(logs) ? logs : []
    const reversed = [...safeLog].reverse()

    const today = new Date().toISOString().split('T')[0]
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

    const stats = {
      total: safeLog.length,
      success: safeLog.filter(l => l.status === 'success').length,
      failed: safeLog.filter(l => l.status === 'failed').length,
      today_uploads: safeLog.filter(l => l.date === today && l.status === 'success').length,
      today_failed: safeLog.filter(l => l.date === today && l.status === 'failed').length,
      week_uploads: safeLog.filter(l => l.date >= weekAgo && l.status === 'success').length,
      total_videos_used: Object.keys(usedIds).length,
      in_progress: Object.values(usedIds).filter(v => v.status === 'in_progress').length
    }

    const { status, folder, search, limit = 100, offset = 0 } = req.query
    let filtered = reversed
    if (status) filtered = filtered.filter(l => l.status === status)
    if (folder) filtered = filtered.filter(l => l.folder_name?.toLowerCase().includes(folder.toLowerCase()))
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(l =>
        l.file_name?.toLowerCase().includes(q) ||
        l.drive_file_id?.toLowerCase().includes(q) ||
        l.youtube_video_id?.toLowerCase().includes(q)
      )
    }

    const paginated = filtered.slice(Number(offset), Number(offset) + Number(limit))
    return res.json({ logs: paginated, total_filtered: filtered.length, stats })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
