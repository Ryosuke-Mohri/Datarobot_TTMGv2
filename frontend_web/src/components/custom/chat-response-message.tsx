import { IChatMessage } from '@/api/chat/types.ts';
import { cn, unwrapMarkdownCodeBlock } from '@/lib/utils.ts';
import { Avatar, AvatarImage } from '@/components/ui/avatar.tsx';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircleIcon } from 'lucide-react';
import drIcon from '@/assets/DataRobotLogo_black.svg';
import { useAppState } from '@/state';
import { MARKDOWN_COMPONENTS } from '@/constants/markdown';
import { DotPulseLoader } from '@/components/custom/dot-pulse-loader';
import { MarkdownHooks } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeMermaid from 'rehype-mermaid';

export function ChatResponseMessage({
    classNames,
    message,
}: {
    classNames?: string;
    message: IChatMessage;
}) {
    const { availableLlmModels } = useAppState();
    const messageLlmModel =
        message && availableLlmModels?.find(({ model }) => model === message.model);
    return (
        <div className="my-3 py-3" data-testid="chat-response-message">
            <div className={cn('w-2xl px-3 flex gap-2 items-center', classNames)}>
                <Avatar>
                    <AvatarImage src={drIcon} alt="LLM" />
                </Avatar>
                <p className="">{messageLlmModel?.name}</p>
            </div>
            <div className="w-full">
                {message.in_progress ? (
                    <div className="mt-2 bg-card p-4 w-fit rounded-md">
                        <DotPulseLoader />
                    </div>
                ) : (
                    <div className="p-2 w-fit">
                        {message.error ? (
                            <Alert variant="destructive" className="">
                                <AlertCircleIcon />
                                <AlertDescription>
                                    <p>{message.error}</p>
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <MarkdownHooks
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[
                                    [
                                        rehypeMermaid,
                                        {
                                            dark: true,
                                            mermaidConfig: {
                                                theme: 'dark',
                                            },
                                        },
                                    ],
                                ]}
                                fallback={<div>Processing markdown...</div>}
                                components={MARKDOWN_COMPONENTS}
                            >
                                {message
                                    ? unwrapMarkdownCodeBlock(message.content)
                                    : 'Message not available'}
                            </MarkdownHooks>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
