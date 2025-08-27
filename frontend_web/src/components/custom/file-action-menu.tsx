import { useCallback, useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { Button } from '@/components/ui/button.tsx';
import { EllipsisVertical, Trash } from 'lucide-react';
import { FileSchema } from '@/api/knowledge-bases/types.ts';

export function FileActionMenu({
    file,
    onDelete,
}: {
    file: FileSchema;
    onDelete: (file: FileSchema) => void;
}) {
    const [open, setOpen] = useState(false);

    const handleOnDelete = useCallback(
        (file: FileSchema) => {
            setOpen(false);
            onDelete(file);
        },
        [onDelete]
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
                    <EllipsisVertical strokeWidth="4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    onClick={() => handleOnDelete(file)}
                    className="cursor-pointer text-red-400 hover:text-red-300 hover:bg-gray-700"
                >
                    <Trash />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
