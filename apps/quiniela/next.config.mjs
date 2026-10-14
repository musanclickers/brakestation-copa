import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    // Monorepo: el standalone incluye packages/* y deja server.js en apps/quiniela/.
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  transpilePackages: [
    '@brakestation/db',
    '@brakestation/seal',
    '@brakestation/auth',
    '@brakestation/ui',
  ],
};

export default nextConfig;
