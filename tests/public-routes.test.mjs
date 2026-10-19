import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { NextRequest, NextResponse } from 'next/server.js'

function loadProxy(configured = true, user = null, cookies = []) {
  const js = ts.transpileModule(fs.readFileSync('src/proxy.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const exports = {}
  vm.runInNewContext(js, { exports, process, URL, require(name) {
    if (name === 'next/server') return { NextResponse }
    if (name === '@/lib/runtime') return { isPreviewMode: () => false, hasSupabaseConfiguration: () => configured }
    if (name === '@supabase/ssr') return { createServerClient: (_url,_key,options) => ({ auth: { getUser: async () => { options.cookies.setAll(cookies);return { data: { user } } } } }) }
    throw new Error(`Unexpected dependency: ${name}`)
  } })
  return exports.proxy
}

test('public browsing is available to guests while write and account routes require sign-in', async () => {
  for (const configured of [true, false]) {
    const proxy = loadProxy(configured)
    for (const path of ['/faq', '/privacy', '/terms', '/', '/board', '/feed.xml', '/feed.xml?topic=planet','/invitations','/api/share-image/20000000-0000-4000-8000-000000000001', '/fellows/0123456789abcdef0123456789abcdef', '/built', '/posts/example-id', '/projects', '/projects/example-id']) {
      const response = await proxy(new NextRequest('http://localhost' + path))
      assert.equal(response.headers.get('location'), null, path)
    }
    for (const path of ['/posts/new', '/posts/example-id/edit', '/profile', '/dashboard']) {
      const response = await proxy(new NextRequest('http://localhost' + path))
      assert.equal(response.headers.get('location'), 'http://localhost/login', path)
    }
  }
  const signedIn = loadProxy(true, { id: 'a-fellow' })
  assert.equal((await signedIn(new NextRequest('http://localhost/posts/new'))).headers.get('location'), null)
})

test('preview API reaches its JSON authentication guard without a login redirect', async () => {
  for(const configured of [true,false]) {
    for(const path of ['/api/website-preview?url=example.org','/api/fellows/search?q=Deb']) {
    const response=await loadProxy(configured)(new NextRequest('http://localhost'+path))
    assert.equal(response.headers.get('location'),null)
    }
  }
})


test('the public feed skips session handling, so its cacheable responses never set a cookie', async () => {
  const response = await loadProxy(true, { id: 'a-fellow' }, [{ name: 'sb-session', value: 'fresh', options: { path: '/' } }])(new NextRequest('https://example.test/feed.xml?topic=planet'))
  assert.equal(response.headers.get('location'), null)
  assert.equal(response.headers.get('set-cookie'), null)
})

test('auth refresh and deletion cookies retain options on both redirect paths', async () => {
  const cookies=[{name:'sb-session',value:'fresh',options:{httpOnly:true,secure:true,path:'/',sameSite:'lax'}},{name:'sb-old',value:'',options:{path:'/',maxAge:0}}]
  for(const [path,user,destination] of [['/login',{id:'fellow'},'/board'],['/profile',null,'/login']]){
    const response=await loadProxy(true,user,cookies)(new NextRequest('https://example.test'+path))
    assert.equal(response.headers.get('location'),'https://example.test'+destination)
    assert.equal(response.cookies.get('sb-session').value,'fresh')
    assert.equal(response.cookies.get('sb-session').httpOnly,true)
    assert.equal(response.cookies.get('sb-session').secure,true)
    assert.equal(response.cookies.get('sb-session').sameSite,'lax')
    assert.equal(response.cookies.get('sb-session').path,'/')
    assert.equal(response.cookies.get('sb-old').maxAge,0)
    assert.equal(response.cookies.get('sb-old').value,'')
  }
})


test('an already signed-in auth redirect discards one-time tokens and error parameters',async()=>{
  for(const path of ['/auth/confirm?token_hash=private-token&type=email','/login?error=expired']){
    const response=await loadProxy(true,{id:'fellow'})(new NextRequest('https://example.test'+path))
    assert.equal(response.headers.get('location'),'https://example.test/board')
  }
})

 test('cleanup jobs reach their own secret guard without session refresh',async()=>{
  for(const configured of [true,false])assert.equal((await loadProxy(configured)(new NextRequest('http://localhost/api/jobs/storage-cleanup'))).headers.get('location'),null)
})
