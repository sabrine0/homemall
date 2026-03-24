/** @type {import('next').NextConfig} */
const apiServerUrl =
  process.env.API_SERVER_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiServerUrl}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${apiServerUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
