import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { VITE_STATIC_DEFAULT_PORT, VITE_DEFAULT_PORT } from '@/constants/dev';
import { IChat } from '@/api/chat/types.ts';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function getApiPort() {
    return window.ENV?.API_PORT || VITE_STATIC_DEFAULT_PORT;
}

export function getBaseUrl() {
    let basename = window.ENV?.BASE_PATH;
    // Adjust API URL based on the environment
    const pathname: string = window.location.pathname;

    if (pathname?.includes('notebook-sessions') && pathname?.includes(`/${VITE_DEFAULT_PORT}/`)) {
        // ex:. /notebook-sessions/{id}/ports/5137/
        basename = import.meta.env.BASE_URL;
    }

    return basename ? basename : '/';
}

export function getApiUrl() {
    return `${window.location.origin}${getBaseUrl()}api`;
}

export function unwrapMarkdownCodeBlock(message: string): string {
    return message
        .replace(/^```(?:markdown)?\s*/, '')
        .replace(/\s*```$/, '')
        .replace(/<\/?think>/g, '');
}

const DEFAULT_CHAT_NAME = 'New Chat';
export const getChatNameOrDefaultWithTimestamp = (chat: IChat) => {
    const chatName = chat.name || DEFAULT_CHAT_NAME;
    if (chatName === DEFAULT_CHAT_NAME) {
        const date = chat.created_at ? new Date(chat.created_at) : new Date();
        const formattedDate = new Intl.DateTimeFormat('en', {
            month: 'long',
            day: 'numeric',
        }).format(date);
        const formattedTime = new Intl.DateTimeFormat('en', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        }).format(date);
        return `Chat ${formattedDate} ${formattedTime}`;
    }
    return chatName;
};
