import ytsr from 'ytsr'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { q, limit = '10' } = req.query
  if (!q?.trim()) return res.status(400).json({ error: 'Missing query' })
  const lim = Math.min(parseInt(limit) || 10, 20)

  try {
    const results = await ytsr(q.trim() + ' music', { limit: lim, safeSearch: false })
    const videos = results.items
      .filter(i => i.type === 'video')
      .slice(0, lim)
      .map(v => ({
        videoId: v.id,
        name: v.title,
        artist: v.author?.name || '',
        cover: v.bestThumbnail?.url || v.thumbnails?.[0]?.url || '',
        youtube_url: `https://youtube.com/watch?v=${v.id}`,
      }))

    if (videos.length) return res.json({ success: true, results: videos, source: 'ytsr' })
    console.warn('[search] ytsr: 0 results for:', q)
    return res.status(503).json({ success: false, error: 'No results' })
  } catch (e) {
    console.error('[search] ytsr failed:', e.message)
    return res.status(503).json({ success: false, error: 'Search unavailable' })
  }
}
