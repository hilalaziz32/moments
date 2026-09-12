/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Server Actions receive CSV uploads of up to 5,000 rows.
    serverActions: { bodySizeLimit: "10mb" },
  },
};
export default nextConfig;
