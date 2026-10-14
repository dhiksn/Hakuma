import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'hanime-cdn.com' },
      { protocol: 'https', hostname: '**.hanime-cdn.com' },
      { protocol: 'https', hostname: 'hanime.tv' },
      { protocol: 'https', hostname: '**.hanime.tv' },
      { protocol: 'https', hostname: '**.htv-hydaelyn.com' },
      { protocol: 'https', hostname: '**.htv-services.com' },
    ],
  },
};

export default nextConfig;
