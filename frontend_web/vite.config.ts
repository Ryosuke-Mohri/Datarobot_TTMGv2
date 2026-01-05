import { defineConfig } from 'vitest/config';
import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

import { VITE_DEFAULT_PORT } from './src/constants/dev';

let base: string = '';
// 1. if NOTEBOOK_ID is set, use /notebook-sessions/${NOTEBOOK_ID}/ports/5173/ for dev server
if (process.env.NOTEBOOK_ID && process.env.NODE_ENV === 'development') {
    const notebookId = process.env.NOTEBOOK_ID;
    base = `/notebook-sessions/${notebookId}/ports/${VITE_DEFAULT_PORT}/`;
}
const proxyBase: string = base === '' ? '/' : base;

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        {
            name: 'strip-base',
            apply: 'serve',
            configureServer({ middlewares }) {
                middlewares.use((req, _res, next) => {
                    if (base !== '' && !req.url?.startsWith(base)) {
                        req.url = base.slice(0, -1) + req.url;
                    }
                    next();
                });
            },
        },
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    base: base,
    build: {
        outDir: '../web/static/',
        manifest: true,
    },
    server: {
        host: true,
        allowedHosts: ['localhost', '127.0.0.1', '.datarobot.com', '.drdev.io'],
        proxy: {
            // プロキシ設定: /notebook-sessions/.../ports/5173/api/ を http://localhost:8080/api/ にプロキシ
            [`${proxyBase}api`]: {
                target: 'http://localhost:8080',
                changeOrigin: true,
                rewrite: path => {
                    // /notebook-sessions/.../ports/5173/api/v1/chat → /api/v1/chat
                    const baseWithoutSlash = proxyBase.replace(/\/$/, '');
                    // 正規表現で特殊文字をエスケープ
                    const escapedBase = baseWithoutSlash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const rewritten = path.replace(new RegExp(`^${escapedBase}/api`), '/api');
                    if (process.env.NODE_ENV === 'development') {
                        console.log('[Vite Proxy] Rewriting:', path, '→', rewritten);
                    }
                    return rewritten;
                },
                configure: (proxy, _options) => {
                    proxy.on('error', (err, _req, res) => {
                        console.error('[Vite Proxy Error]', err);
                    });
                    proxy.on('proxyReq', (proxyReq, req, _res) => {
                        console.log('[Vite Proxy] Proxying:', req.url, '→', proxyReq.path);
                    });
                },
            },
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './tests/setupTests.ts',
        typecheck: {
            tsconfig: './tsconfig.test.json',
        },
    },
});
