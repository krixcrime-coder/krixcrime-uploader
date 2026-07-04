import { isAuthenticated } from './auth'

const GITHUB_API = 'https://api.github.com'

function getGithubHeaders() {
  const token = process.env.GH_PAT
  if (!token) throw new Error('GH_PAT environment variable is not set')
  return {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  }
}

function getRepo() {
  const repo = process.env.GITHUB_REPOSITORY
  if (!repo) throw new Error('GITHUB_REPOSITORY environment variable is not set (e.g. username/reponame)')
  return repo
}

async function getFileFromGithub(repo, filePath) {
  const res = await fetch(`${GITHUB_API}/repos/${repo}/contents/${filePath}`, {
    headers: getGithubHeaders()
  })
  if (res.status === 404) return { content: null, sha: null }
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  const content = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'))
  return { content, sha: data.sha }
}

async function writeFileToGithub(repo, filePath, content, sha, message) {
  const encoded = Buffer.from(JSON.stringify(content, null, 2)).toString('base64')
  const body = { message, content: encoded }
  if (sha) body.sha = sha

  const res = await fetch(`${GITHUB_API}/repos/${repo}/contents/${filePath}`, {
    method: 'PUT',
    headers: getGithubHeaders(),
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(`GitHub write error: ${res.status} ${await res.text()}`)
  return res.json()
}

const DEFAULT_CONFIG = {
  upload_times: ['09:00', '13:00', '17:00', '20:00', '22:30'],
  title: '',
  description: '',
  tags: [],
  watermark: { x_percent: 75, y_percent: 85, width_percent: 15 },
  drive_folder_url: ''
}

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const repo = getRepo()

  if (req.method === 'GET') {
    try {
      const { content } = await getFileFromGithub(repo, 'config.json')
      return res.json(content || DEFAULT_CONFIG)
    } catch (err) {
      console.error('Config read error:', err.message)
      return res.json(DEFAULT_CONFIG)
    }
  }

  if (req.method === 'PUT') {
    try {
      const { content: current, sha } = await getFileFromGithub(repo, 'config.json')
      const updated = { ...(current || DEFAULT_CONFIG), ...req.body }
      await writeFileToGithub(repo, 'config.json', updated, sha, 'chore: update config via dashboard [skip ci]')
      return res.json({ ok: true, config: updated })
    } catch (err) {
      console.error('Config write error:', err.message)
      return res.status(500).json({ error: err.message })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
