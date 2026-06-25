import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ChessLab — Kişisel Satranç Gelişim Sistemi",
  description: "Private chess development and analysis system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark">
      <body className={`${inter.className} bg-zinc-950 antialiased`}>
        {children}
      </body>
    </html>
  );
}
