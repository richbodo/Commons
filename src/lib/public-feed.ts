import { COMMUNITY } from '@/config/community'
import { topicFor } from '@/lib/topics'
import type { PostWithFellow } from '@/types'

export const FEED_ITEM_LIMIT = 50
const SUMMARY_LENGTH = 280
const TYPE_LABELS: Record<string, string> = { project: 'Project', ask: 'Ask', offer: 'Offer' }
const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }

type Topic = ReturnType<typeof topicFor>

// XML 1.0 rejects most control characters and lone surrogates even when escaped.
export function escapeXml(value: string) {
  return value.replace(/[^\t\n\r\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, '').replace(/[&<>"']/g, char => ENTITIES[char])
}

function summary(text: string) {
  const points = Array.from(text.replace(/\s+/g, ' ').trim())
  return points.length > SUMMARY_LENGTH ? `${points.slice(0, SUMMARY_LENGTH - 1).join('').trimEnd()}…` : points.join('')
}

// Items use only what the public post page shows: no emails, member ids or directory data.
function item(post: PostWithFellow) {
  const url = escapeXml(`${COMMUNITY.canonicalOrigin}/posts/${post.id}`)
  const topic = topicFor(post.tags, post.topic)
  return [
    '<item>',
    `<title>${escapeXml(post.title)}</title>`,
    `<link>${url}</link>`,
    `<guid isPermaLink="true">${url}</guid>`,
    `<dc:creator>${escapeXml(post.fellow?.name || `A ${COMMUNITY.memberSingular}`)}</dc:creator>`,
    `<pubDate>${new Date(post.created_at).toUTCString()}</pubDate>`,
    `<category domain="type">${escapeXml(TYPE_LABELS[post.type] ?? post.type)}</category>`,
    // Labels are configurable, so readers that sort by topic should key on the stored ID.
    `<category domain="topic">${escapeXml(topic.name)}</category>`,
    `<category domain="topic-id">${escapeXml(topic.id)}</category>`,
    // Readers render description as HTML, so the plain-text summary is escaped for HTML first.
    `<description>${escapeXml(escapeXml(summary(post.description)))}</description>`,
    '</item>',
  ].join('')
}

export function publicFeed(posts: PostWithFellow[], topic: Topic | null = null) {
  const self = `${COMMUNITY.canonicalOrigin}/feed.xml${topic ? `?topic=${topic.id}` : ''}`
  const items = posts
    .filter(post => !topic || topicFor(post.tags, post.topic).id === topic.id)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || a.id.localeCompare(b.id))
    .slice(0, FEED_ITEM_LIMIT)
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '<channel>',
    `<title>${escapeXml(topic ? `${COMMUNITY.name} — ${topic.name}` : COMMUNITY.name)}</title>`,
    `<link>${escapeXml(`${COMMUNITY.canonicalOrigin}/`)}</link>`,
    `<description>${escapeXml(topic ? topic.description : `Public asks, offers and projects shared on ${COMMUNITY.name}.`)}</description>`,
    '<language>en</language>',
    `<atom:link href="${escapeXml(self)}" rel="self" type="application/rss+xml"/>`,
    ...items.map(item),
    '</channel>',
    '</rss>',
    '',
  ].join('\n')
}
