import { NextConfig } from 'next'
import { after } from './after'

const nextConfig: NextConfig = {
  compiler: {
    afterProductionBuild: async ({ distDir, projectDir }) => {
      await after({ distDir, projectDir })
    },
  },
}

export default nextConfig
