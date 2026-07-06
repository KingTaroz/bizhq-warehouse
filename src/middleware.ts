import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const role = request.cookies.get('auth_role')?.value
  const isLoginPage = request.nextUrl.pathname.startsWith('/login')

  if (!role && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (role && isLoginPage) {
    return NextResponse.redirect(new URL(role === 'warehouse' ? '/warehouse' : '/', request.url))
  }

  // Warehouse cannot access dashboard (/) and users management (/users)
  if (role === 'warehouse' && (request.nextUrl.pathname === '/' || request.nextUrl.pathname.startsWith('/users'))) {
    return NextResponse.redirect(new URL('/warehouse', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo.png).*)'],
}
