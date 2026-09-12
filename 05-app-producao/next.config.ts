import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build standalone (server.js + só as deps realmente usadas) — imagem
  // Docker final não carrega o node_modules inteiro do dev.
  output: 'standalone',
};

export default nextConfig;
