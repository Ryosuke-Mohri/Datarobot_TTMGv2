import { useRef, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import drLogo from '@/assets/DataRobot_white.svg';

import { useAppState } from '@/state';
import { ChatPromptInput } from '@/components/custom/chat-prompt-input.tsx';
import { IChatMessage } from '@/api/chat/types.ts';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatUserMessage } from '@/components/custom/chat-user-message';
import { ChatResponseMessage } from '@/components/custom/chat-response-message';
import { useChatMessages } from '@/api/chat/hooks.ts';

const Chat = () => {
    const { selectedLlmModel } = useAppState();
    const { chatId } = useParams<{ chatId: string }>();
    const { data: messages = [] } = useChatMessages(chatId);
    const hasPendingMessageRequest = useRef<boolean>(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const setPendingMessage = useCallback(
        (value: boolean) => {
            hasPendingMessageRequest.current = value;
        },
        [hasPendingMessageRequest]
    );

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            containerRef.current?.scrollTo({
                top: containerRef.current.scrollHeight, // Scroll to the bottom
                behavior: 'smooth',
            });
        }, 300); // Delay to ensure all messages are rendered

        return () => clearTimeout(timeoutId);
    }, [messages]);

    //If there are no messages or if chatId is not defined, show the initial prompt input
    if (messages.length === 0 || (!chatId && !hasPendingMessageRequest.current)) {
        return (
            <div className="content-center justify-items-center w-full h-full">
                <div className="flex">
                    <img
                        src={drLogo}
                        alt="DataRobot"
                        className="w-[130px] cursor-pointer ml-2.5 py-3.5"
                    />
                </div>
                <h1 className="text-4xl my-4" data-testid="app-model-name">
                    {selectedLlmModel.name}
                </h1>
                <ChatPromptInput
                    isPendingMessage={hasPendingMessageRequest.current}
                    setPendingMessage={setPendingMessage}
                />
            </div>
        );
    }

    return (
        <div
            className="flex flex-col items-center w-full min-h-[calc(100vh-4rem)]"
            data-testid="chat-conversation-view"
        >
            <ScrollArea
                className="flex-1 w-full overflow-auto mb-5 scroll"
                scrollViewportRef={containerRef}
            >
                <div className="justify-self-center px-4 w-full">
                    {messages.map((message: IChatMessage, index: number) =>
                        message.role === 'user' ? (
                            <ChatUserMessage
                                message={message}
                                key={`user-msg-${message.uuid || index}`}
                            />
                        ) : (
                            <ChatResponseMessage
                                message={message}
                                key={`llm-msg-${message.uuid}`}
                            />
                        )
                    )}
                    {hasPendingMessageRequest.current && (
                        <ChatResponseMessage
                            isPending
                            key="response-loader"
                            data-testid="pending-message-loader"
                        />
                    )}
                </div>
            </ScrollArea>
            <ChatPromptInput
                isPendingMessage={hasPendingMessageRequest.current}
                setPendingMessage={setPendingMessage}
                classNames="w-full self-end self-center mb-2 py-0 px-4"
            />
        </div>
    );
};

export default Chat;
