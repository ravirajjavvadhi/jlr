/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
    buildActivityPosition: 'bottom-right',
  },
  allowedDevOrigins: ['192.168.0.109', '10.133.82.129', 'localhost:3000'],
  serverExternalPackages: ['pdfjs-dist'],
  turbopack: {}, // Explicitly enable Turbopack to silence config warnings
};

module.exports = nextConfig;


