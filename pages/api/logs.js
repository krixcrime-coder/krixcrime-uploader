import path from 'path'
import fs from 'fs'
import { isAuthenticated } from './auth'

const LOG_PATH = path.join(process.cwd(), 'uploaded_log.json')
const USED_PATH = path.join(process.cwd(), 'used_video_ids.json')

function loadLogs() {
  try {
    const data = JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'))
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function loadUsedIds() {
  try {
    return JSON.parse(fs.readFileSync(USED_PATH, 'utf8'))
  } catch {
    return {}
  }
}

export default function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    const logs = loadLogs()
    const usedIds = loadUsedIds()
    const reversed = [...logs].reverse()

    const today = new Date().toISOString().split('T')[0]
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

    const stats = {
      total: logs.length,
      success: logs.filter(l => l.status === 'success').length,
      failed: logs.filter(l => l.status === 'failed').length,
      today_uploads: logs.filter(l => l.date === today && l.status === 'success').length,
      today_failed: logs.filter(l => l.date === today && l.status === 'failed').length,
      week_uploads: logs.filter(l => l.date >= weekAgo && l.status === 'success').length,
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
