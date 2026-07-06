import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BizHQ",
  description: "ระบบบริหารจัดการธุรกิจอัจฉริยะ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="dark">
      <body className={`${inter.className} bg-[#09090b] text-slate-200 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
