import path from 'path'
import fs from 'fs'
import { isAuthenticated } from './auth'

const CONFIG_PATH = path.join(process.cwd(), 'config.json')

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
  } catch {
    return {
      upload_times: ['09:00', '13:00', '17:00', '20:00', '22:30'],
      title: '',
      description: '',
      tags: [],
      watermark: { x_percent: 75, y_percent: 85, width_percent: 15 },
      drive_folder_url: ''
    }
  }
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2))

  const ghToken = process.env.GH_PAT
  const repo = process.env.GITHUB_REPOSITORY
  if (ghToken && repo) {
    commitViaGithubApi(ghToken, repo, cfg).catch(console.error)
  }
}

async function commitViaGithubApi(token, repo, cfg) {
  const content = Buffer.from(JSON.stringify(cfg, null, 2)).toString('base64')
  const apiUrl = `https://api.github.com/repos/${repo}/contents/config.json`

  const getRes = await fetch(apiUrl, {
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
  })
  const current = await getRes.json()
  const sha = current.sha

  await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: 'chore: update config via dashboard [skip ci]',
      content,
      sha
    })
  })
}

export default function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    return res.json(loadConfig())
  }

  if (req.method === 'PUT') {
    const current = loadConfig()
    const updated = { ...current, ...req.body }
    saveConfig(updated)
    return res.json({ ok: true, config: updated })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
