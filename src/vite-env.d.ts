/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_KEY?: string;
    readonly VITE_TOPICS_ADMIN_PASSWORD?: string;
    readonly VITE_NEWS_PROXY_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
