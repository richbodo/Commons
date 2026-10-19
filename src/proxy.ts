import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isPreviewMode, hasSupabaseConfiguration } from '@/lib/runtime'

export async function proxy(request: NextRequest) {
  if (['/api/jobs/notifications', '/api/jobs/storage-cleanup'].includes(request.nextUrl.pathname)) return NextResponse.next()
  // The public feed needs no session, so its shared-cacheable responses never carry a refreshed session cookie.
  if (request.nextUrl.pathname === '/feed.xml') return NextResponse.next()
  const path = request.nextUrl.pathname
  const previewApi = path === '/api/website-preview' || path === '/api/fellows/search'
  const publicPage = path === '/faq' || path === '/privacy' || path === '/terms' || path === '/' || path === '/board' || path === '/invitations' || /^\/api\/share-image\/[0-9a-f-]{36}$/.test(path) || /^\/fellows\/[a-f0-9]{32}$/.test(path) || path === '/built' || path === '/projects' || path.startsWith('/projects/') || (path !== '/posts/new' && /^\/posts\/[^/]+$/.test(path))
  if (isPreviewMode()) return NextResponse.next()
  if (!hasSupabaseConfiguration()) {
    if (previewApi || publicPage || request.nextUrl.pathname === '/login') return NextResponse.next()
    return NextResponse.redirect(new URL('/login', request.url))
  }
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Refresh and deletion cookies must survive replacement redirect responses.
  const redirectWithSession = (url: URL) => {
    const response = NextResponse.redirect(url)
    for (const cookie of supabaseResponse.cookies.getAll()) response.cookies.set(cookie)
    return response
  }

  const { pathname } = request.nextUrl

  // Allow unauthenticated access to login and auth routes
  if (pathname === '/login' || pathname.startsWith('/auth/')) {
    // If already logged in, redirect to board
    if (user) {
      const url = request.nextUrl.clone()
      url.pathname = '/board'
      url.search = ''
      return redirectWithSession(url)
    }
    return supabaseResponse
  }

  // Creating posts, editing, and account pages require authentication
  if (!user && !publicPage && !previewApi) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return redirectWithSession(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
