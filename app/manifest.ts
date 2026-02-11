import { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Raiden Reader v2', // Đổi nhẹ tên để force update
    short_name: 'Raiden',
    description: 'Advanced AI-powered web novel reader and translator',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      {
        src: '/raiden-v2-small.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/raiden-v2.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Workspace',
        url: '/workspace',
        description: 'Open your workspace',
      },
      {
        name: 'Chapter List',
        url: '/chapter',
        description: 'View recent chapters',
      }
    ]
  }
}
