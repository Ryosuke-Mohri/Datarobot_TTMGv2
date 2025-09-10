import { LLM_MODEL } from '@/state/types.ts';
import { DRApiResponse } from '@/api/types.ts';

import apiClient from '../apiClient';
import { IPostMessageParams, IChat, IChatMessage } from './types';

const BASE_URL = '/v1/chat';
const llmCatalogUrl = `${BASE_URL}/llm/catalog`;
const chatListUrl = `${BASE_URL}`;

export async function startNewChat({
    message,
    model,
    knowledgeBase,
    knowledgeBaseId,
    fileIds,
    signal,
}: IPostMessageParams): Promise<IChat> {
    const payload = {
        message: message,
        model: model,
        // Send knowledge base ID if provided, otherwise fall back to full knowledge base object for backward compatibility
        ...(knowledgeBaseId
            ? { knowledge_base_id: knowledgeBaseId }
            : knowledgeBase && { knowledge_base: knowledgeBase }),
        ...(fileIds && fileIds.length > 0 && { file_ids: fileIds }),
    };

    // To try the agents, change to: `/v1/chat/agent/completions`
    const { data } = await apiClient.post<IChat>(BASE_URL, payload, {
        signal,
    });

    return data;
}

export async function postMessage({
    message,
    model,
    chatId,
    knowledgeBase,
    knowledgeBaseId,
    fileIds,
    signal,
}: IPostMessageParams): Promise<IChatMessage[]> {
    const payload = {
        message: message,
        model: model,
        chat_id: chatId,
        // Send knowledge base ID if provided, otherwise fall back to full knowledge base object for backward compatibility
        ...(knowledgeBaseId
            ? { knowledge_base_id: knowledgeBaseId }
            : knowledgeBase && { knowledge_base: knowledgeBase }),
        ...(fileIds && fileIds.length > 0 && { file_ids: fileIds }),
    };

    // To try the agents, change to: `/v1/chat/agent/completions`
    const { data } = await apiClient.post<IChatMessage[]>(
        `${BASE_URL}/${chatId}/messages`,
        payload,
        {
            signal,
        }
    );

    return data;
}

export async function getAllChats(signal?: AbortSignal): Promise<IChat[]> {
    const { data } = await apiClient.get<IChat[]>(chatListUrl, {
        signal,
    });

    return data;
}

export async function getMessages({
    chatId,
    signal,
}: {
    chatId: string;
    signal?: AbortSignal;
}): Promise<IChatMessage[]> {
    const { data } = await apiClient.get<IChatMessage[]>(`${BASE_URL}/${chatId}/messages`, {
        signal,
    });

    return data;
}

export async function deleteChatById({ chatId }: { chatId: string }): Promise<void> {
    await apiClient.delete<Record<string, string>>(`${BASE_URL}/${chatId}`);
}

export async function renameChatById({
    chatId,
    chatName,
}: {
    chatId: string;
    chatName: string;
}): Promise<void> {
    await apiClient.patch<Record<string, string>>(`${BASE_URL}/${chatId}`, { name: chatName });
}

export async function getLlmCatalog(): Promise<LLM_MODEL[]> {
    const response = await apiClient.get<DRApiResponse<LLM_MODEL[]>>(llmCatalogUrl);
    return response.data?.data.filter(
        model => model.isActive === true && model.isDeprecated === false
    );
}
