import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';
import { OPTIMIZED_IMAGE_HOSTS } from './src/lib/remote-images';

const config: NextConfig = {
  // Image Docker prod chỉ chép thư mục standalone (apps/web/Dockerfile).
  output: 'standalone',
  // Gốc monorepo, để standalone chép đủ package trong packages/.
  outputFileTracingRoot: fileURLToPath(new URL('../../', import.meta.url)),
  // Package trong packages/ xuất thẳng file .ts, Next tự biên dịch.
  transpilePackages: [
    '@tripflix/api-client',
    '@tripflix/app-core',
    '@tripflix/i18n',
    '@tripflix/tokens',
    '@tripflix/ui-web',
    '@tripflix/utils',
  ],
  images: {
    remotePatterns: OPTIMIZED_IMAGE_HOSTS.map((hostname) => ({ protocol: 'https' as const, hostname })),
  },
};

export default config;
