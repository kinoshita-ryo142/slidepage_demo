/// <reference types="vite/client" />

// add any custom env variables here, the VITE_ prefix is required for Vite to expose them
interface ImportMetaEnv {
  readonly VITE_MICROCMS_DOMAIN: string;
  readonly VITE_MICROCMS_API_KEY: string;
  // more env vars...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}