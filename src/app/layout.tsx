import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/services/authContext";
import DynamicIsland from "@/components/DynamicIsland";
import SovereignStatusBar from "@/components/SovereignStatusBar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JLR AI | Supremacy Edition",
  description: "Next-generation high-end AI power center.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "JLR AI",
  },
};

export const viewport: Viewport = {
  themeColor: "#020202",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <SovereignStatusBar />
          <DynamicIsland />
          <div className="neural-overlay" />
          <div className="app-container">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
