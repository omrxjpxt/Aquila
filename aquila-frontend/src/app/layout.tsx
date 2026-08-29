import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SideNavBar } from "@/components/layout/SideNavBar";
import { TopAppBar } from "@/components/layout/TopAppBar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AQUILA — Maritime Intelligence Platform",
  description: "Advanced maritime surveillance, slick assessment and vessel attribution.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex bg-background text-foreground font-sans overflow-hidden">
        <SideNavBar />
        <TopAppBar />
        <main className="flex-1 ml-16 mt-16 h-[calc(100vh-64px)] relative bg-surface-lowest">
          {children}
        </main>
      </body>
    </html>
  );
}
