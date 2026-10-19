import { loadPublicPosts } from '@/lib/board-data'
import { publicFeed } from '@/lib/public-feed'
import { TOPICS } from '@/lib/topics'

// Readers fetch on demand; a short shared cache matches public share images.
const cache = 'public, max-age=300'

export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get('topic')
  const topic = requested === null ? null : TOPICS.find(t => t.id === requested)
  if (topic === undefined) return new Response('Unknown topic.', { status: 404, headers: { 'Cache-Control': cache } })
  const posts = await loadPublicPosts().catch(() => null)
  if (!posts) return new Response('The feed is temporarily unavailable.', { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '300' } })
  return new Response(publicFeed(posts, topic), { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': cache } })
}
