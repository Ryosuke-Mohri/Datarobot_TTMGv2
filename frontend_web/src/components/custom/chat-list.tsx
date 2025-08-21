import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useChats } from '@/api/chat/hooks';
import { SidebarMenuButton, SidebarMenu, SidebarMenuItem } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner.tsx';
import { cn, getChatNameOrDefaultWithTimestamp } from '@/lib/utils.ts';
import { ChatActionMenu } from '@/components/custom/chat-action-menu.tsx';

export const ChatList: React.FC = () => {
    const { data: chats = [], isLoading } = useChats();
    const sortLatestUpdated = useMemo(() => {
        return [...chats].sort(
            (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
    }, [chats]);

    const location = useLocation();
    if (isLoading) {
        return (
            <div className="flex flex-row gap-1 text-sm items-center pt-2">
                <Spinner size="small" /> Loading chats...
            </div>
        );
    }

    return (
        <SidebarMenu className="mx-0 justify-items-center">
            {sortLatestUpdated.map(chat => (
                <SidebarMenuItem
                    key={chat.uuid}
                    className={cn(
                        'flex gap-2 pr-0 py-2 items-center rounded border-l-2 border-transparent overflow-hidden transition-colors cursor-pointer hover:bg-card',
                        {
                            'rounded-l-none dark:bg-card border-l-2 border-white':
                                location.pathname === `/chat/${chat.uuid}`,
                        }
                    )}
                >
                    <SidebarMenuButton
                        asChild
                        isActive={location.pathname === `/chat/${chat.uuid}`}
                    >
                        {/*Need this div as SidebarMenuButton does not allow fragments*/}
                        <div className="px-0 py-0">
                            <Link
                                to={`/chat/${chat.uuid}`}
                                title={getChatNameOrDefaultWithTimestamp(chat)}
                                className="truncate ml-2 flex-grow-1"
                                data-testid={`chat-link-${chat.uuid}`}
                            >
                                {getChatNameOrDefaultWithTimestamp(chat)}
                            </Link>
                            <ChatActionMenu chat={chat} />
                        </div>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            ))}
        </SidebarMenu>
    );
};
