/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingExcludes: {
    "/*": ["next.config.mjs", "package-lock.json", ".mongo-data/**/*"],
  },
  serverExternalPackages: ["discord.js"],
};

export default nextConfig;
