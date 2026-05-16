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
    icon: "/lion-core.png",
    apple: "/lion-core.png",
  },
  openGraph: {
    title: "JLR AI SUPREMACY | NEURAL COGNITION",
    description: "The peak of futuristic AI intelligence. Cinematic UI, beast-level performance, and absolute multimedia sovereignty.",
    url: "https://jlr-omega.vercel.app/",
    siteName: "JLR AI SUPREMACY",
    images: [
      {
        url: "/lion-core.png",
        width: 1200,
        height: 630,
        alt: "JLR AI Supremacy Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JLR AI SUPREMACY | NEURAL COGNITION",
    description: "The peak of futuristic AI intelligence.",
    images: ["/beast-logo.png"],
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/lion-core.png?v=2" />
        <link rel="apple-touch-icon" href="/lion-core.png?v=2" />
        <link rel="shortcut icon" href="/lion-core.png?v=2" />
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
