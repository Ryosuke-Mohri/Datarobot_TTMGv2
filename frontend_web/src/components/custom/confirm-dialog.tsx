import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Sheet, SheetPortal, SheetClose, SheetOverlay, SheetTitle } from '@/components/ui/sheet';
import { Button } from '../ui/button';

export const ConfirmDialog: React.FC<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm?: () => void;
    title?: string;
    confirmButtonText?: string;
    children: React.ReactNode;
}> = ({ open, onOpenChange, title, onConfirm, confirmButtonText, children }) => (
    <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetPortal>
            <SheetOverlay className="fixed inset-0 bg-black/50 z-50" />
            <DialogPrimitive.Content
                className="fixed left-1/2 top-1/2 z-50 bg-background rounded shadow-lg p-6 w-[540px] -translate-x-1/2 -translate-y-1/2"
                aria-describedby={undefined}
            >
                {title && <SheetTitle className="text-lg font-bold mb-4">{title}</SheetTitle>}
                {children}
                <div className="flex justify-end gap-2 mt-6">
                    <SheetClose asChild>
                        <Button variant="outline">Close</Button>
                    </SheetClose>
                    <Button onClick={onConfirm}>{confirmButtonText || 'OK'}</Button>
                </div>
            </DialogPrimitive.Content>
        </SheetPortal>
    </Sheet>
);
