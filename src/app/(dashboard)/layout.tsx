import { cookies } from 'next/headers';
import ClientLayout from "./ClientLayout";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const role = cookieStore.get('auth_role')?.value;

  return (
    <ClientLayout role={role}>
      {children}
    </ClientLayout>
  );
}
