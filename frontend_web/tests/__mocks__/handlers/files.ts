import { http, HttpResponse } from 'msw';

export const filesHandlers = [
    http.get('api/v1/files', () => {
        return HttpResponse.json({ files: [] });
    }),
];
