'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword, signToken } from '@/lib/auth'

const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export async function login(formData: FormData) {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  // Auto-seed admin user if DB is empty
  const userCount = await prisma.user.count()
  if (userCount === 0) {
    await prisma.user.create({
      data: {
        username: 'admin',
        password: hashPassword('admin1234'),
        name: 'Administrator',
        role: 'admin',
      }
    })
  }

  const user = await prisma.user.findUnique({
    where: { username }
  })

  if (!user || !verifyPassword(password, user.password)) {
    redirect('/login?error=1')
  }

  // Upgrade legacy plaintext rows to scrypt on first successful login
  if (!user.password.startsWith('scrypt:')) {
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashPassword(password) }
    })
  }

  const cookieStore = await cookies()
  cookieStore.set('auth_token', signToken(user.role, SESSION_MAX_AGE), {
    maxAge: SESSION_MAX_AGE,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  })
  
  if (user.role === 'warehouse') {
    redirect('/scanner')
  } else {
    redirect('/')
  }
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('auth_token')
  redirect('/login')
}
