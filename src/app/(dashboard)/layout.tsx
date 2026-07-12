import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import ClientLayout from "./ClientLayout";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const role = verifyToken(cookieStore.get('auth_token')?.value) ?? undefined;

  return (
    <ClientLayout role={role}>
      {children}
    </ClientLayout>
  );
}
