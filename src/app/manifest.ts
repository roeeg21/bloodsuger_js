import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CyberHealth Monitor - Blood Sugar App',
    short_name: 'Sugar Monitor',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d1117',
    theme_color: '#22c55e',
    description:
      'CGM monitoring, glucose history graphs, manual logging, and dose tools in an iPhone-style web app.',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
