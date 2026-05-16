import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/services/authContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JLR AI | Supremacy Intelligence",
  description: "Next-generation high-end AI power center. Experience the absolute peak of AI intelligence and multimedia synthesis.",
  manifest: "/manifest.json",
  openGraph: {
    title: "JLR AI | Supremacy Intelligence",
    description: "The peak of futuristic AI intelligence. Cinematic UI, beast-level performance, and absolute multimedia sovereignty.",
    url: "https://jlr-omega.vercel.app/",
    siteName: "JLR AI",
    images: [
      {
        url: "/og-image.png", // Assuming user will place the generated asset here
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
    title: "JLR AI | Supremacy Intelligence",
    description: "The peak of futuristic AI intelligence.",
    images: ["/og-image.png"],
  },
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
          <div className="neural-overlay" />
          <div className="app-container">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
