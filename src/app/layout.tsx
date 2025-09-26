import type { Metadata } from "next";
import { varsity, geistSans, geistMono } from './fonts';
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"
import Header from './components/Header';

export const metadata: Metadata = {
  title: "JACHA - College Hockey Rankings",
  description: "Just Another College Hockey App - View the latest Division I Men's Hockey Rankings",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${varsity.variable} antialiased bg-slate-900`}
      >
        <Analytics />
        <div className="container mx-auto px-4 py-6">
          <Header />
        </div>
        {children}
      </body>
    </html>
  );
}
