/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath:'/jacha',
  output: "export",  // <=== enables static exports
  reactStrictMode: true,
  experimental: {
    optimizeFonts: true
  }
};

module.exports = nextConfig;
