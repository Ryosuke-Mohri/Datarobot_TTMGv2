import axios from 'axios';

import { getApiUrl } from '@/lib/utils';

const baseApiUrl = getApiUrl();

// デバッグ用: 開発環境でAPI URLをログ出力
if (import.meta.env.DEV) {
    console.log('[API Client] Base URL:', baseApiUrl);
    console.log('[API Client] Current location:', window.location.href);
    console.log('[API Client] Base path:', import.meta.env.BASE_URL);
}

const apiClient = axios.create({
    baseURL: baseApiUrl,
    headers: {
        Accept: 'application/json',
        'Content-type': 'application/json',
    },
    withCredentials: true,
});

// リクエストインターセプターでデバッグ情報を出力
apiClient.interceptors.request.use(
    config => {
        if (import.meta.env.DEV) {
            console.log('[API Request]', config.method?.toUpperCase(), config.url);
            console.log('[API Request] Full URL:', config.baseURL + config.url);
        }
        return config;
    },
    error => {
        console.error('[API Request Error]', error);
        return Promise.reject(error);
    }
);

// レスポンスインターセプターでエラーをログ出力
apiClient.interceptors.response.use(
    response => response,
    error => {
        if (import.meta.env.DEV) {
            console.error('[API Response Error]', error.response?.status, error.response?.statusText);
            console.error('[API Response Error] URL:', error.config?.url);
            console.error('[API Response Error] Full URL:', error.config?.baseURL + error.config?.url);
        }
        return Promise.reject(error);
    }
);

export default apiClient;
