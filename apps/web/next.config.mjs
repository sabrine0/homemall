/** @type {import('next').NextConfig} */
const apiServerUrl =
  process.env.API_SERVER_URL?.trim() ||
  process.env.NEXT_PUBLIC_API_URL?.trim() ||
  (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");

const nextConfig = {
  skipTrailingSlashRedirect: true,
  async rewrites() {
    if (!apiServerUrl) {
      return [];
    }

    return [
      {
        source: "/health",
        destination: `${apiServerUrl.replace(/\/$/, "")}/health`,
      },
      {
        source: "/api/docs",
        destination: `${apiServerUrl.replace(/\/$/, "")}/api/docs/`,
      },
      {
        source: "/api/docs/",
        destination: `${apiServerUrl.replace(/\/$/, "")}/api/docs/`,
      },
      {
        source: "/api/docs/:path*",
        destination: `${apiServerUrl.replace(/\/$/, "")}/api/docs/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${apiServerUrl.replace(/\/$/, "")}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${apiServerUrl.replace(/\/$/, "")}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
