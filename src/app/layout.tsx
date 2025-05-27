import type { Metadata } from "next";
import { varsity, geistSans, geistMono } from './fonts';
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
