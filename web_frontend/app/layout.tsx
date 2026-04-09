import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./Providers"; // Đảm bảo đường dẫn import chính xác

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Document Vault",
  description: "Hệ thống lưu trữ tài liệu bảo mật trên Sui Blockchain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}