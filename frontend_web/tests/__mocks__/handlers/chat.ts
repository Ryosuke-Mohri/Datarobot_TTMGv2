import { http, HttpResponse } from 'msw';
import { DEFAULT_LLM_CATALOG } from '@/api/chat/constants.ts';
import { IPostMessageParams } from '@/api/chat/types.ts';

export const chatHandlers = [
    http.post('api/v1/chat', async ({ request }) => {
        const payload = (await request.json()) as IPostMessageParams;
        return HttpResponse.json({
            uuid: 'chat-123-abc',
            name: 'New Chat',
            model: payload.model,
            created_at: new Date('2025-09-08T12:00:00.000Z').toISOString(),
            updated_at: new Date('2025-09-08T12:00:00.000Z').toISOString(),
        });
    }),

    http.post('api/v1/chat/:chatId/messages', async ({ request }) => {
        const payload = (await request.json()) as IPostMessageParams;
        return [
            HttpResponse.json([
                {
                    role: 'user',
                    content: payload.message,
                    chat_id: payload.chatId,
                    uuid: 'abc-123',
                    in_progress: false,
                },
                {
                    role: 'assistant',
                    content: 'Agents Say Hello World!',
                    chat_id: payload.chatId,
                    uuid: 'def-456',
                    in_progress: false,
                },
            ]),
        ];
    }),

    http.get('api/v1/chat/llm/catalog', () => {
        return HttpResponse.json({ data: DEFAULT_LLM_CATALOG });
    }),

    http.get('api/v1/chat', () => {
        return HttpResponse.json([]);
    }),
];
