import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { hashPassword } from '@/lib/auth'

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  })

  async function createUser(formData: FormData) {
    'use server'
    const username = formData.get('username') as string
    const password = formData.get('password') as string
    const role = formData.get('role') as string
    const name = formData.get('name') as string

    await prisma.user.create({
      data: { username, password: hashPassword(password), role, name }
    })
    revalidatePath('/users')
  }

  async function deleteUser(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    // Prevent deleting the main admin
    const user = await prisma.user.findUnique({ where: { id } })
    if (user?.username !== 'admin') {
      await prisma.user.delete({ where: { id } })
      revalidatePath('/users')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">จัดการผู้ใช้งาน (Users)</h1>
        <p className="text-muted-foreground mt-1">เพิ่ม ลบ และกำหนดสิทธิ์การเข้าถึงระบบ</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4 text-foreground">รายชื่อผู้ใช้งานทั้งหมด</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-3 font-medium">ชื่อเข้าใช้ (Username)</th>
                  <th className="pb-3 font-medium">ชื่อผู้ใช้ (Name)</th>
                  <th className="pb-3 font-medium">ตำแหน่ง (Role)</th>
                  <th className="pb-3 font-medium text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {users.map((user: any) => (
                  <tr key={user.id} className="text-foreground">
                    <td className="py-4">{user.username}</td>
                    <td className="py-4">{user.name || '-'}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'admin' ? 'bg-orange-500/20 text-orange-500' : 'bg-muted text-foreground'}`}>
                        {user.role === 'admin' ? 'Admin' : 'Warehouse'}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      {user.username !== 'admin' && (
                        <form action={deleteUser}>
                          <input type="hidden" name="id" value={user.id} />
                          <button type="submit" className="text-red-500 hover:text-red-500 text-sm">ลบ</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 h-fit">
          <h2 className="text-xl font-bold mb-4 text-foreground">เพิ่มผู้ใช้งานใหม่</h2>
          <form action={createUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">Username</label>
              <input required type="text" name="username" className="w-full bg-background border border-border rounded-lg p-2 text-foreground focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">Password</label>
              <input required type="text" name="password" className="w-full bg-background border border-border rounded-lg p-2 text-foreground focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">ชื่อ - นามสกุล</label>
              <input type="text" name="name" className="w-full bg-background border border-border rounded-lg p-2 text-foreground focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">ตำแหน่ง</label>
              <select name="role" className="w-full bg-background border border-border rounded-lg p-2 text-foreground focus:outline-none focus:border-orange-500">
                <option value="warehouse">Warehouse (ผู้ดูแลคลังสินค้า)</option>
                <option value="admin">Admin (เจ้าของร้าน)</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 rounded-lg transition-colors mt-2">
              บันทึกผู้ใช้งาน
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
