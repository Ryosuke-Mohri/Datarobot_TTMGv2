import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    deleteChatById,
    renameChatById,
    getAllChats,
    getMessages,
    getLlmCatalog,
    postMessage,
    startNewChat,
} from './requests';
import { chatKeys } from './keys';
import { IChatMessage, IPostMessageContext, IUserMessage, IChat } from './types';
import { useAppState } from '@/state';
import { AGENT_MODEL_LLM } from '@/api/chat/constants.ts';

export const useCreateChat = () => {
    const { selectedLlmModel } = useAppState();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    return useMutation<IChat, Error, IUserMessage, IPostMessageContext>({
        mutationFn: ({ message, context, knowledgeBase, knowledgeBaseId }) => {
            // Fallback to legacy pages format for backward compatibility
            const pages = Array.isArray(context?.pages)
                ? context.pages
                : Object.values(context?.pages || []);

            if (pages.length > 0) {
                console.warn('Legacy pages format detected. Consider updating to use fileIds.');
            }

            const fileIds =
                context?.fileIds && context.fileIds.length > 0 ? context.fileIds : undefined;
            return startNewChat({
                message: message,
                model: selectedLlmModel.model,
                knowledgeBase: knowledgeBase || undefined,
                knowledgeBaseId: knowledgeBaseId || undefined,
                fileIds,
            });
        },
        onError: error => {
            toast.error(error?.message || 'Failed to send message');
        },
        onSuccess: data => {
            queryClient.invalidateQueries({ queryKey: chatKeys.chatList() });
            navigate(`/chat/${data.uuid}`);
        },
    });
};

export const usePostMessage = ({ chatId }: { chatId?: string }) => {
    const { selectedLlmModel } = useAppState();
    const queryClient = useQueryClient();
    return useMutation<IChatMessage[], Error, IUserMessage, IPostMessageContext>({
        mutationFn: ({ message, context, knowledgeBase, knowledgeBaseId }) => {
            if (!chatId) {
                throw new Error('chatId is required');
            }
            // Fallback to legacy pages format for backward compatibility
            const pages = Array.isArray(context?.pages)
                ? context.pages
                : Object.values(context?.pages || []);

            if (pages.length > 0) {
                console.warn('Legacy pages format detected. Consider updating to use fileIds.');
            }

            const fileIds =
                context?.fileIds && context.fileIds.length > 0 ? context.fileIds : undefined;
            return postMessage({
                message: message,
                model: selectedLlmModel.model,
                chatId,
                knowledgeBase: knowledgeBase || undefined,
                knowledgeBaseId: knowledgeBaseId || undefined,
                fileIds,
            });
        },
        onError: (error, _variables, context) => {
            // Restore previous messages
            if (context?.previousMessages && context?.messagesKey) {
                queryClient.setQueryData(context.messagesKey, context.previousMessages);
            }
            toast.error(error?.message || 'Failed to send message');
        },
        onSuccess: data => {
            // Set the chat messages data directly in the cache to avoid loading state
            queryClient.setQueryData<IChatMessage[]>(chatKeys.messages(chatId), (oldData = []) => [
                ...oldData,
                ...data,
            ]);
            queryClient.setQueryData<IChat[]>(chatKeys.chatList(), (oldData = []) => {
                return oldData.map(chat =>
                    chat.uuid === chatId
                        ? ({ ...chat, updated_at: data[data.length - 1].created_at } as IChat)
                        : chat
                );
            });
        },
    });
};

export const useChatMessages = ({
    chatId,
    shouldRefetch,
}: {
    chatId?: string;
    shouldRefetch?: number;
}) => {
    return useQuery<IChatMessage[]>({
        queryKey: chatKeys.messages(chatId),
        queryFn: async ({ signal }) => {
            return await getMessages({ chatId: chatId!, signal });
        },
        enabled: !!chatId,
        refetchInterval: shouldRefetch || false,
    });
};

export const useChats = () => {
    return useQuery<IChat[]>({
        queryKey: chatKeys.chatList(),
        queryFn: async ({ signal }) => {
            return await getAllChats(signal);
        },
    });
};

export const useChatsDelete = () => {
    const queryClient = useQueryClient();
    return useMutation<void, Error, { chatId: string }>({
        mutationFn: ({ chatId }) => deleteChatById({ chatId }),
        onSettled: () => queryClient.invalidateQueries({ queryKey: chatKeys.chatList() }),
    });
};

export const useChatsRename = () => {
    const queryClient = useQueryClient();
    return useMutation<void, Error, { chatId: string; chatName: string }>({
        mutationFn: ({ chatId, chatName }) => renameChatById({ chatId, chatName }),
        onSettled: () => queryClient.invalidateQueries({ queryKey: chatKeys.chatList() }),
    });
};

export const useLlmCatalog = () => {
    return useQuery({
        queryKey: chatKeys.llmCatalog,
        queryFn: () => getLlmCatalog(),
        select: data => {
            return [AGENT_MODEL_LLM, ...data];
        },
    });
};
