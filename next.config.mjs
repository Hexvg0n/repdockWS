/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  outputFileTracingExcludes: {
    "/*": ["next.config.mjs", "package-lock.json", ".mongo-data/**/*"],
  },
  serverExternalPackages: ["discord.js"],
};

export default nextConfig;
