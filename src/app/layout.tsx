import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/services/authContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JLR AI SUPREMACY | NEURAL COGNITION",
  description: "Tactical high-end AI power center. Experience the absolute peak of AI intelligence and multimedia sovereignty.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "JLR AI SUPREMACY | NEURAL COGNITION",
    description: "The peak of futuristic AI intelligence. Cinematic UI, beast-level performance, and absolute multimedia sovereignty.",
    url: "https://jlr-omega.vercel.app/",
    siteName: "JLR AI SUPREMACY",
    images: [
      {
        url: "https://jlr-omega.vercel.app/metaforjlr.png?v=3", // Cache buster added
        width: 1200,
        height: 630,
        alt: "JLR AI SUPREMACY Preview",
        type: "image/png",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JLR AI SUPREMACY | NEURAL COGNITION",
    description: "The peak of futuristic AI intelligence. Experience cinematic UI and absolute multimedia sovereignty.",
    images: ["https://jlr-omega.vercel.app/metaforjlr.png?v=3"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "JLR AI SUPREMACY",
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
    <html lang="en" prefix="og: http://ogp.me/ns#" suppressHydrationWarning>
      <head>
        {/* Absolute Redundancy with Cache Buster */}
        <meta property="og:image:secure_url" content="https://jlr-omega.vercel.app/metaforjlr.png?v=3" />
        <meta itemProp="image" content="https://jlr-omega.vercel.app/metaforjlr.png?v=3" />
        <link rel="image_src" href="https://jlr-omega.vercel.app/metaforjlr.png?v=3" />
        
        <link rel="icon" href="/favicon.png?v=4" />
        <link rel="apple-touch-icon" href="/favicon.png?v=4" />
        <link rel="shortcut icon" href="/favicon.png?v=4" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <div className="neural-overlay" />
          <div className="app-container">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
