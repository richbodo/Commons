import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
function load(file, dependencies = {}) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, URL, process, require: name => dependencies[name] })
  return exports
}
test('operator config supplies generic presentation and retains topic and cohort data contracts', () => {
  const { COMMUNITY } = load('src/config/community.ts')
  assert.equal(COMMUNITY.name, 'Commons')
  assert.equal(COMMUNITY.wordmark, 'commons')
  assert.equal(COMMUNITY.memberSingular, 'member')
  assert.equal(COMMUNITY.memberPlural, 'members')
  assert.equal(COMMUNITY.heroHeadline, 'Good things start with a connection.')
  assert.equal(COMMUNITY.directoryUrlPrefix, null)
  assert.equal(COMMUNITY.cohortsEnabled, false)
  const { TOPICS, topicFor } = load('src/lib/topics.ts', { '@/config/community': { COMMUNITY } })
  assert.deepEqual(Array.from(TOPICS, topic => topic.id), ['planet', 'enterprise', 'learning', 'care', 'technology', 'open'])
  assert.equal(topicFor(['climate']).id, 'planet')
  assert.equal(topicFor(['ai']).id, 'technology')
  assert.equal(topicFor([]).id, 'open')
  const customized = { ...COMMUNITY, topics: { ...COMMUNITY.topics, planet: { name: 'Our place', description: 'Local projects.' } } }
  const customTopics = load('src/lib/topics.ts', { '@/config/community': { COMMUNITY: customized } })
  assert.equal(customTopics.topicFor(['climate']).name, 'Our place')
  assert.equal(customTopics.topicFor(['climate']).description, 'Local projects.')
  const { normalizeCohort } = load('src/lib/cohorts.ts')
  assert.equal(normalizeCohort('2'), 'Cohort 2')
  assert.equal(normalizeCohort(''), null)
})
test('public support, sharing and metadata follow the configured operator and origin', () => {
  const { COMMUNITY } = load('src/config/community.ts')
  const config = { COMMUNITY: { ...COMMUNITY, name: 'Neighbourhood', canonicalOrigin: 'https://community.example.test', supportEmail: 'help@example.test' } }
  const support = new URL(load('src/lib/support.ts', { '@/config/community': config }).supportLink('public-id'))
  assert.equal(support.pathname, 'help@example.test')
  assert.equal(support.searchParams.get('subject'), 'Neighbourhood: correction or report')
  assert.match(support.searchParams.get('body'), /https:\/\/community.example.test\/posts\/public-id/)
  const fields = load('src/lib/post-fields.ts'), files = load('src/lib/attachment-fields.ts')
  const { shareDestination } = load('src/lib/share-destination.ts', { '@/config/community': config, './post-fields': fields, './attachment-fields': files })
  assert.equal(shareDestination({ id: 'public-id' }).url, 'https://community.example.test/posts/public-id')
  const { postMetadata } = load('src/lib/post-metadata.ts', { '@/config/community': config, '@/lib/website-preview': { readWebsitePreview: () => null } })
  const metadata = postMetadata({ id: 'public-id', title: 'A project', description: 'A description' })
  assert.equal(metadata.title, 'A project | Neighbourhood')
  assert.equal(metadata.alternates.canonical, 'https://community.example.test/posts/public-id')
  assert.equal(metadata.openGraph.siteName, 'Neighbourhood')
})
test('metadata, footer and policy templates render the configured identity and operator', async () => {
  const React = await import('react')
  const jsx = await import('react/jsx-runtime')
  const { renderToStaticMarkup } = await import('react-dom/server')
  const { COMMUNITY } = load('src/config/community.ts')
  const config = { COMMUNITY: { ...COMMUNITY, name: 'Neighbourhood', wordmark: 'neighbours', operatorName: 'Local association', supportEmail: 'help@example.test', canonicalOrigin: 'https://community.example.test' } }
  const link = { default: ({ children, ...props }) => React.createElement('a', props, children) }
  function page(file) {
    const exports = {}
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, URL, require: name => {
      if (name === '@/config/community') return config
      if (name === 'react/jsx-runtime') return jsx
      if (name === 'next/link') return link
      if (name === 'next/image') return { default: () => null }
      if (name === '@/lib/appearance') return { APPEARANCE_SCRIPT: '' }
      if (name === '@/components/AppearanceControl') return { AppearanceControl: () => null }
      if (name === './globals.css') return {}
      throw Error(name)
    } })
    return exports
  }
  const layout = page('src/app/layout.tsx')
  assert.equal(layout.metadata.metadataBase.href, 'https://community.example.test/')
  assert.equal(layout.metadata.openGraph.title, 'Neighbourhood — Good things start with a connection.')
  const html = renderToStaticMarkup(layout.default({ children: null }))
  assert.match(html, /Built on Commons by/)
  assert.match(html, /<link rel="alternate" type="application\/rss\+xml" title="Neighbourhood public posts" href="\/feed.xml"\/>/)
  assert.match(html, /https:\/\/github.com\/BigLeverVentures\/Commons/)
  assert.match(html, /mailto:help@example.test/)
  for (const route of ['privacy', 'terms']) {
    const html = renderToStaticMarkup(page(`src/app/${route}/page.tsx`).default())
    assert.match(html, /Operator review required/)
    assert.match(html, /Local association/)
    assert.match(html, /neighbours/)
    assert.doesNotMatch(html, /Big Lever Ventures/)
  }
})

test('invitation headings and public post share images follow a renamed community', async () => {
  const React = await import('react')
  const jsx = await import('react/jsx-runtime')
  const { renderToStaticMarkup } = await import('react-dom/server')
  const { COMMUNITY } = load('src/config/community.ts')
  const config = { COMMUNITY: { ...COMMUNITY, name: 'Neighbourhood', memberSingular: 'neighbour' } }
  function renderModule(file, dependencies) {
    const exports = {}
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, Response, require: name => {
      if (name === '@/config/community') return config
      if (name === 'react/jsx-runtime') return jsx
      if (!(name in dependencies)) throw Error(name)
      return dependencies[name]
    } })
    return exports
  }
  const invitations = renderModule('src/app/invitations/page.tsx', {
    'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
    '@/lib/auth': { currentUser: async () => null },
    '@/lib/fellow-presence': {},
    '@/lib/invitation-data': { loadInvitationPage: async () => ({ invitations: [], more: false }) },
    '@/components/CommonsShell': { CommonsShell: ({ children }) => React.createElement('main', null, children) },
    '@/components/InvitationRow': {},
  })
  const html = renderToStaticMarkup(await invitations.default({ searchParams: Promise.resolve({}) }))
  assert.match(html, /Happening in Neighbourhood/)
  assert.doesNotMatch(html, /Happening in the Commons/)
  const image = renderModule('src/app/api/share-image/[id]/route.tsx', {
    'next/og': { ImageResponse: class { constructor(element) { this.html = renderToStaticMarkup(element) } } },
    '@/lib/board-data': { loadPublicPost: async () => ({ type: 'ask', title: 'A question', description: 'Details', tags: [] }) },
    '@/lib/topics': { topicFor: () => ({ name: 'Our place' }) },
  })
  const response = await image.GET(null, { params: Promise.resolve({ id: '10000000-0000-4000-8000-000000000001' }) })
  assert.match(response.html, /Neighbourhood/)
  assert.match(response.html, /A neighbour/)
})

test('auth template preserves token verification without claiming source-project administration', () => {
  const template = fs.readFileSync('supabase/templates/sign-in.html', 'utf8')
  assert.match(template, /\{\{ \.SiteURL \}\}\/auth\/confirm\?token_hash=\{\{ \.TokenHash \}\}&amp;type=email/)
  assert.match(template, /support@example\.org/)
  assert.match(template, /Built on Commons by/)
  assert.doesNotMatch(template, /built and administered|volunteer contribution|bigleverventures\.com/)
})
