interface ImportMetaEnv {
  readonly VITE_SEPOLIA_RPC?: string;
  readonly VITE_ALCHEMY_KEY?: string;
  readonly VITE_LLM_KEY?: string;
  readonly VITE_E2E?: string;
  readonly VITE_E2E_MOCK_ENRICH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
