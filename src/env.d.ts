interface ImportMetaEnv {
  readonly VITE_SEPOLIA_RPC?: string;
  readonly VITE_ALCHEMY_KEY?: string;
  readonly VITE_LLM_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
