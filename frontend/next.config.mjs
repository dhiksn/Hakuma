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
      // Community image uploads — domain rotates: cu-images.image[b-z].top
      { protocol: 'https', hostname: '**.imageb.top' },
      { protocol: 'https', hostname: '**.imagec.top' },
      { protocol: 'https', hostname: '**.imaged.top' },
      { protocol: 'https', hostname: '**.imagee.top' },
      { protocol: 'https', hostname: '**.imagef.top' },
      { protocol: 'https', hostname: '**.imageg.top' },
      { protocol: 'https', hostname: '**.imageh.top' },
      { protocol: 'https', hostname: '**.imagei.top' },
      { protocol: 'https', hostname: '**.imagej.top' },
      { protocol: 'https', hostname: '**.imagek.top' },
      { protocol: 'https', hostname: '**.imagel.top' },
      { protocol: 'https', hostname: '**.imagem.top' },
      { protocol: 'https', hostname: '**.imagen.top' },
      { protocol: 'https', hostname: '**.imageo.top' },
      { protocol: 'https', hostname: '**.imagep.top' },
      { protocol: 'https', hostname: '**.imageq.top' },
      { protocol: 'https', hostname: '**.imager.top' },
      { protocol: 'https', hostname: '**.images.top' },
      { protocol: 'https', hostname: '**.imaget.top' },
      { protocol: 'https', hostname: '**.imageu.top' },
      { protocol: 'https', hostname: '**.imagev.top' },
      { protocol: 'https', hostname: '**.imagew.top' },
      { protocol: 'https', hostname: '**.imagex.top' },
      { protocol: 'https', hostname: '**.imagey.top' },
      { protocol: 'https', hostname: '**.imagez.top' },
    ],
  },
};

export default nextConfig;
