import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AENEWS Agent OS X — Credit Management",
  description: "Système de gestion de crédits pour AENEWS Agent OS X. Gérez vos crédits, commandez via WhatsApp, et administrez les utilisateurs.",
  keywords: ["AENEWS", "Agent OS X", "credits", "WhatsApp", "credit management", "Next.js"],
  authors: [{ name: "AENEWS" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "AENEWS Agent OS X — Credit Management",
    description: "Système de gestion de crédits pour AENEWS Agent OS X",
    siteName: "AENEWS Agent OS X",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AENEWS Agent OS X — Credit Management",
    description: "Système de gestion de crédits pour AENEWS Agent OS X",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
