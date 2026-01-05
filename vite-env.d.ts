/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly GEMINI_API_KEY: string;
  readonly VITE_EMAILJS_SERVICE_ID: string;
  readonly VITE_EMAILJS_TEMPLATE_ID: string;
  readonly VITE_EMAILJS_PUBLIC_KEY: string;
  readonly VITE_AI_PROVIDER?: string;
  readonly VITE_AI_API_KEY?: string;
  readonly VITE_AI_MODEL?: string;
  readonly VITE_AI_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

