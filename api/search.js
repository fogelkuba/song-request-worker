import ytsr from 'ytsr'

const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
]

async function searchYtsr(q, limit) {
  const results = await ytsr(q + ' music', { limit, safeSearch: false })
  return results.items
    .filter(item => item.type === 'video')
    .slice(0, limit)
    .map(video => ({
      videoId: video.id,
      name: video.title,
      artist: video.author?.name || '',
      cover: video.bestThumbnail?.url || video.thumbnails?.[0]?.url || '',
      youtube_url: `https://youtube.com/watch?v=${video.id}`,
    }))
}

async function searchInvidious(q, limit, instance) {
  const url = `${instance}/api/v1/search?q=${encodeURIComponent(q + ' music')}&type=video&fields=videoId,title,author,videoThumbnails`
  const r = await fetch(url, { signal: AbortSignal.timeout(4000) })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const items = await r.json()
  return items.slice(0, limit).map(v => ({
    videoId: v.videoId,
    name: v.title,
    artist: v.author || '',
    cover: v.videoThumbnails?.find(t => t.quality === 'medium')?.url
        || v.videoThumbnails?.[0]?.url || '',
    youtube_url: `https://youtube.com/watch?v=${v.videoId}`,
  }))
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { q, limit = '10', provider = 'ytsr' } = req.query
  if (!q?.trim()) return res.status(400).json({ error: 'Missing query' })
  const lim = Math.min(parseInt(limit) || 10, 20)

  // Specific instance: provider is a hostname like "inv.nadeko.net"
  const specificInstance = !['ytsr', 'invidious'].includes(provider)
    ? INVIDIOUS_INSTANCES.find(i => i.includes(provider)) || `https://${provider}`
    : null

  if (specificInstance) {
    try {
      const results = await searchInvidious(q.trim(), lim, specificInstance)
      if (results.length) return res.json({ success: true, results, source: specificInstance })
      console.warn('[search] invidious 0 results:', specificInstance, q)
    } catch (e) {
      console.error('[search] invidious failed:', specificInstance, e.message)
    }
    return res.status(503).json({ success: false, error: 'Search unavailable' })
  }

  const skipYtsr = provider === 'invidious'

  // 1. ytsr (skip if provider=invidious)
  if (!skipYtsr) {
    try {
      const results = await searchYtsr(q.trim(), lim)
      if (results.length) return res.json({ success: true, results, source: 'ytsr' })
      console.warn('[search] ytsr: 0 results for:', q)
    } catch (e) {
      console.error('[search] ytsr failed:', e.message)
    }
  }

  // 2-3. Invidious fallbacks
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const results = await searchInvidious(q.trim(), lim, instance)
      if (results.length) return res.json({ success: true, results, source: 'invidious' })
      console.warn('[search] invidious 0 results:', instance, q)
    } catch (e) {
      console.error('[search] invidious failed:', instance, e.message)
    }
  }

  console.error('[search] ALL providers failed for:', q)
  res.status(503).json({ success: false, error: 'Search unavailable' })
}
