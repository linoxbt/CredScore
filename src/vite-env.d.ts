/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CREDSCORE_ADDRESS?: string;
  readonly VITE_CREDSCORE_NETWORK?: string;
  readonly VITE_REOWN_PROJECT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
