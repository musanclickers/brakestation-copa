import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: [
    '@brakestation/db',
    '@brakestation/seal',
    '@brakestation/auth',
    '@brakestation/ui',
  ],
};

export default nextConfig;
