'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export async function login(formData: FormData) {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  // Auto-seed admin user if DB is empty
  const userCount = await prisma.user.count()
  if (userCount === 0) {
    await prisma.user.create({
      data: {
        username: 'admin',
        password: 'admin1234',
        name: 'Administrator',
        role: 'admin',
      }
    })
  }

  const user = await prisma.user.findUnique({
    where: { username }
  })

  if (!user || user.password !== password) {
    redirect('/login?error=1')
  }

  const cookieStore = await cookies()
  cookieStore.set('auth_role', user.role, { maxAge: 60 * 60 * 24 * 7 }) // 7 days
  
  if (user.role === 'warehouse') {
    redirect('/scanner')
  } else {
    redirect('/')
  }
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('auth_role')
  redirect('/login')
}
