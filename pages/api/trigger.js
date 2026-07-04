import { isAuthenticated } from './auth'

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const ghToken = process.env.GH_PAT
  const repo = process.env.REPO_NAME

  if (!ghToken || !repo) {
    return res.status(400).json({ error: 'GH_PAT and REPO_NAME must be set to trigger uploads' })
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/upload.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `token ${ghToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ref: 'main' })
      }
    )

    if (response.status === 204) {
      return res.json({ ok: true, message: 'Upload triggered successfully on GitHub Actions' })
    } else {
      const data = await response.json()
      return res.status(response.status).json({ error: data.message || 'GitHub API error' })
    }
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
