const b64 = (s: string) => {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin)
}

/** Commit content.json to the repo through the GitHub Contents API. A push triggers the Pages deploy workflow. */
export async function publishContent(opts: {
  token: string
  repo: string
  branch: string
  path: string
  json: string
  message: string
}) {
  const api = `https://api.github.com/repos/${opts.repo}/contents/${opts.path}`
  const headers = { Authorization: `Bearer ${opts.token}`, Accept: 'application/vnd.github+json' }
  let sha: string | undefined
  const cur = await fetch(`${api}?ref=${encodeURIComponent(opts.branch)}`, { headers })
  if (cur.ok) sha = ((await cur.json()) as { sha: string }).sha
  else if (cur.status !== 404) throw new Error(`GitHub ${cur.status}: ${(await cur.text()).slice(0, 160)}`)
  const put = await fetch(api, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: opts.message, content: b64(opts.json), branch: opts.branch, sha }),
  })
  if (!put.ok) throw new Error(`GitHub ${put.status}: ${(await put.text()).slice(0, 160)}`)
  return ((await put.json()) as { commit: { html_url: string } }).commit.html_url
}
