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
import { DatePlanDisplay } from './date-plan-display';

function tryParseDatePlanJson(content: string): any {
    try {
        // JSON部分を抽出（マークダウンコードブロック内の可能性も考慮）
        const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const jsonStr = jsonMatch[1] || jsonMatch[0];
            const parsed = JSON.parse(jsonStr);
            // デートプランのJSONかどうかを判定
            if (
                parsed &&
                typeof parsed === 'object' &&
                (parsed.status === 'ok' || parsed.status === 'needs_clarification') &&
                (parsed.plans || parsed.clarifying_questions)
            ) {
                return parsed;
            }
        }
    } catch (e) {
        // JSON解析に失敗した場合はnullを返す
    }
    return null;
}

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
    
    // デートプランのJSONを検出
    const datePlanData = message.content ? tryParseDatePlanJson(message.content) : null;
    
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
                        ) : datePlanData ? (
                            // デートプランのJSONが検出された場合は専用コンポーネントで表示
                            <DatePlanDisplay data={datePlanData} />
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
