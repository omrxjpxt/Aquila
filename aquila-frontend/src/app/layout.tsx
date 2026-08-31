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
      <body className="h-full flex flex-col bg-background text-foreground font-sans overflow-hidden">
        <TopAppBar />
        <div className="flex flex-1 pt-14 h-full relative overflow-hidden">
          <SideNavBar />
          <main className="flex-1 h-full relative bg-surface-lowest overflow-hidden">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
