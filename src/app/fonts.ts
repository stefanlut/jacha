import { Geist, Geist_Mono } from "next/font/google";
import localFont from 'next/font/local';

export const varsity = localFont({
  src: '../../public/fonts/varsity_regular.ttf',
  variable: '--font-varsity',
  display: 'swap',
});

export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
