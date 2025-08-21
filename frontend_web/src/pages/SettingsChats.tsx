import React from 'react';
import { useChats } from '@/api/chat/hooks';
import { getChatNameOrDefaultWithTimestamp } from '@/lib/utils.ts';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatActionMenu } from '@/components/custom/chat-action-menu.tsx';

export const SettingsChats: React.FC = () => {
    const { data: chats = [], isLoading } = useChats();

    if (isLoading) return <div>Loading chats...</div>;

    return (
        <div className="p-8">
            <h2 className="text-xl font-semibold mb-2">Chats</h2>
            <ScrollArea className="max-h-[calc(100vh-200px)]">
                <ul className="space-y-2">
                    {chats.map(chat => (
                        <li
                            key={chat.uuid}
                            className="mb-2 flex items-center justify-between p-4 hover:bg-accent/30 rounded-md text-primary text-gray-500"
                        >
                            <div className="flex items-center justify-between truncate max-w-[400px]">
                                {getChatNameOrDefaultWithTimestamp(chat)}
                            </div>
                            <ChatActionMenu chat={chat} />
                        </li>
                    ))}
                </ul>
            </ScrollArea>
        </div>
    );
};
