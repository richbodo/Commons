import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { PGlite } from '@electric-sql/pglite'
import { communityConfig } from './helpers/community.mjs'
import { database, asUser, alice, bob, post } from './helpers/database.mjs'

function load(file, deps) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, URL, Response, require: name => { if (name in deps) return deps[name]; throw Error(name) } })
  return exports
}
const topics = load('src/lib/topics.ts', { '@/config/community': communityConfig })
const feed = load('src/lib/public-feed.ts', { '@/config/community': communityConfig, '@/lib/topics': topics })
const route = posts => load('src/app/feed.xml/route.ts', { '@/lib/board-data': { loadPublicPosts: posts }, '@/lib/public-feed': feed, '@/lib/topics': topics })
const publicPost = (fields = {}) => ({ id: post, type: 'ask', title: 'Field research', description: 'Help test a pilot.', tags: [], topic: 'planet', created_at: '2026-10-01T09:30:00.000Z', fellow: { name: 'Alice' }, ...fields })

// PostgreSQL's XML parser checks well-formedness and decodes entities as a feed reader would.
async function parse(xml) {
  const db = new PGlite()
  try {
    assert.equal((await db.query('SELECT xml_is_well_formed_document($1) AS ok', [xml])).rows[0].ok, true)
    const channel = (await db.query(`SELECT * FROM XMLTABLE(XMLNAMESPACES('http://www.w3.org/2005/Atom' AS atom), '/rss/channel' PASSING CAST($1 AS xml) COLUMNS title text PATH 'title', link text PATH 'link', description text PATH 'description', self text PATH 'atom:link[@rel="self"]/@href')`, [xml])).rows[0]
    const items = (await db.query(`SELECT * FROM XMLTABLE(XMLNAMESPACES('http://purl.org/dc/elements/1.1/' AS dc), '/rss/channel/item' PASSING CAST($1 AS xml) COLUMNS title text PATH 'title', link text PATH 'link', guid text PATH 'guid', creator text PATH 'dc:creator', published text PATH 'pubDate', type text PATH 'category[@domain="type"]', topic text PATH 'category[@domain="topic"]', "topicId" text PATH 'category[@domain="topic-id"]', description text PATH 'description')`, [xml])).rows
    return { channel, items }
  } finally { await db.close() }
}

test('the public feed is well-formed RSS with text escaped for XML and for HTML-rendering readers', async () => {
  const tricky = publicPost({ title: 'Seeds & <soil> "tools"\u0001 for O\'Neil 🌱', description: 'Bring <script>alert(1)</script> & gloves.\n\nAll\twelcome\uD800.', fellow: { name: 'Mere & <Co>' } })
  const xml = feed.publicFeed([tricky])
  assert.doesNotMatch(xml, /<script|<soil>|\u0001|\uD800/)
  const { channel, items } = await parse(xml)
  assert.deepEqual({ ...channel }, { title: 'Commons', link: 'https://commons.example.org/', description: 'Public asks, offers and projects shared on Commons.', self: 'https://commons.example.org/feed.xml' })
  assert.deepEqual({ ...items[0] }, {
    title: 'Seeds & <soil> "tools" for O\'Neil 🌱',
    link: `https://commons.example.org/posts/${post}`,
    guid: `https://commons.example.org/posts/${post}`,
    creator: 'Mere & <Co>',
    published: 'Thu, 01 Oct 2026 09:30:00 GMT',
    type: 'Ask',
    topic: 'Planet & place',
    topicId: 'planet',
    description: 'Bring &lt;script&gt;alert(1)&lt;/script&gt; &amp; gloves. All welcome.',
  })
  const long = (await parse(feed.publicFeed([publicPost({ description: '🌱'.repeat(400), fellow: null, type: 'project', topic: null, tags: ['ai'] })]))).items[0]
  assert.equal(Array.from(long.description).length, 280)
  assert.ok(long.description.endsWith('…'))
  assert.equal(long.creator, 'A member')
  assert.equal(long.type, 'Project')
  assert.equal(long.topic, 'Tools & possibility')
  assert.equal(long.topicId, 'technology')
})

test('the feed lists the newest posts first, caps its length and can follow one topic', async () => {
  const posts = Array.from({ length: 60 }, (_, day) => publicPost({ id: `post-${String(day).padStart(2, '0')}`, created_at: new Date(Date.UTC(2026, 8, day + 1)).toISOString(), topic: day % 2 ? 'care' : 'planet' }))
  const all = (await parse(feed.publicFeed(posts))).items
  assert.equal(feed.FEED_ITEM_LIMIT, 50)
  assert.equal(all.length, 50)
  assert.equal(all[0].link, 'https://commons.example.org/posts/post-59')
  assert.equal(all[49].link, 'https://commons.example.org/posts/post-10')
  const care = await parse(feed.publicFeed(posts, topics.TOPICS.find(topic => topic.id === 'care')))
  assert.equal(care.items.length, 30)
  assert.ok(care.items.every(item => item.topic === 'Care & wellbeing' && item.topicId === 'care'))
  assert.equal(care.channel.title, 'Commons — Care & wellbeing')
  assert.equal(care.channel.self, 'https://commons.example.org/feed.xml?topic=care')
  assert.equal((await parse(feed.publicFeed([]))).items.length, 0)
})

test('the feed route serves public posts with shared caching and rejects unknown topics without caching failures', async () => {
  const response = await route(async () => [publicPost()]).GET(new Request('https://commons.example.org/feed.xml?topic=planet'))
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'application/rss+xml; charset=utf-8')
  assert.equal(response.headers.get('cache-control'), 'public, max-age=300')
  assert.equal((await parse(await response.text())).items[0].title, 'Field research')
  for (const topic of ['unknown', '']) assert.equal((await route(async () => assert.fail('unknown topics must not load posts')).GET(new Request(`https://commons.example.org/feed.xml?topic=${topic}`))).status, 404)
  const failed = await route(async () => { throw new Error('Unable to load the board.') }).GET(new Request('https://commons.example.org/feed.xml'))
  assert.equal(failed.status, 503)
  assert.equal(failed.headers.get('cache-control'), 'no-store')
})

test('only fields shown on public pages reach the feed, never emails, member ids, notes or directory data', async () => {
  const db = await database()
  try {
    await db.exec("UPDATE public.fellows SET bio='Private bio', location='Private location'")
    await db.exec("INSERT INTO public.directory_profiles(record_id,email,name,description) VALUES ('directory-1','directory@example.test','Directory Name','Directory description')")
    await asUser(db, alice, "INSERT INTO public.posts(id,user_id,type,title,description,topic) VALUES ($1,$2,'offer','Seed library','Free seeds for the season.','planet')", [post, alice])
    await asUser(db, bob, "INSERT INTO public.responses(post_id,user_id,note) VALUES ($1,$2,'Private note')", [post, bob])
    // Serve the board loader's public_posts query as an anonymous visitor, returning JSON like PostgREST.
    const anonymous = { from(view) {
      assert.equal(view, 'public_posts')
      let range = [0, 0]
      const query = { select: () => query, order: () => query, range(from, to) { range = [from, to]; return query },
        then: (resolve, reject) => db.transaction(async tx => {
          await tx.exec('SET LOCAL ROLE anon')
          const rows = (await tx.query('SELECT * FROM public.public_posts ORDER BY created_at DESC, id LIMIT $1 OFFSET $2', [range[1] - range[0] + 1, range[0]])).rows
          return { data: JSON.parse(JSON.stringify(rows)), error: null }
        }).then(resolve, reject) }
      return query
    } }
    const lib = file => load(file, {})
    const boardData = load('src/lib/board-data.ts', { 'server-only': {}, '@/lib/post-story': lib('src/lib/post-story.ts'), './post-activity': lib('src/lib/post-activity.ts'), '@/lib/preview': {}, '@/lib/runtime': { isPreviewMode: () => false, hasSupabaseConfiguration: () => true }, '@/lib/supabase/server': { getSupabaseServerClient: async () => anonymous } })
    const xml = await (await route(boardData.loadPublicPosts).GET(new Request('https://commons.example.org/feed.xml'))).text()
    const { items } = await parse(xml)
    assert.deepEqual(items.map(item => [item.title, item.creator, item.type, item.topic, item.description]), [['Seed library', 'Alice', 'Offer', 'Planet & place', 'Free seeds for the season.']])
    const authorKey = (await db.query('SELECT md5($1::text) AS key', [alice])).rows[0].key
    for (const secret of ['@example.test', alice, bob, authorKey, 'Private bio', 'Private location', 'Private note', 'Directory Name', 'Directory description', 'directory-1']) assert.equal(xml.includes(secret), false, secret)
  } finally { await db.close() }
})
