import { chatHandlers } from './handlers/chat';
import { knowledgeBasesHandlers } from './handlers/knowledge-bases';
import { userHandlers } from './handlers/user';
import { filesHandlers } from './handlers/files';

export const handlers = [
    ...chatHandlers,
    ...userHandlers,
    ...knowledgeBasesHandlers,
    ...filesHandlers,
];
