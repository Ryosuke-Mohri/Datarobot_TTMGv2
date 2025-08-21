import { useCallback, useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { useChatsDelete } from '@/api/chat/hooks';
import { Button } from '@/components/ui/button.tsx';
import { EllipsisVertical, TextCursorInput, Trash } from 'lucide-react';
import { IChat } from '@/api/chat/types.ts';
import { useAppState } from '@/state';

export function ChatActionMenu({ chat }: { chat: IChat }) {
    const [open, setOpen] = useState(false);
    const { mutate: deleteChat } = useChatsDelete();
    const { setShowRenameChatModalForId } = useAppState();

    const handleDeleteChat = (chatId: string) => {
        deleteChat({ chatId });
    };
    const handleRenameChat = useCallback(
        (chatId: string) => {
            setOpen(false);
            setShowRenameChatModalForId(chatId);
        },
        [setShowRenameChatModalForId]
    );

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    className="justify-self-end cursor-pointer"
                    variant="ghost"
                    size="icon"
                    onClick={() => true}
                >
                    <EllipsisVertical strokeWidth="3" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    onClick={() => handleRenameChat(chat.uuid)}
                    className="cursor-pointer"
                >
                    <TextCursorInput />
                    Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleDeleteChat(chat.uuid)}
                    className="cursor-pointer"
                >
                    <Trash />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
