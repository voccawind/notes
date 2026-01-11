/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_E2EE_DEFAULT: string
  readonly VITE_APP_VERSION: string
  readonly VITE_FEATURE_GRAPH_VIEW: string
  readonly VITE_FEATURE_DATABASE_VIEW: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
