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
    if (!content || typeof content !== 'string') {
        return null;
    }

    try {
        // 1. マークダウンコードブロック内のJSONを検出（最優先）
        let jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);

        // 2. "json {" で始まる形式を検出（エージェントが直接出力した場合）
        if (!jsonMatch) {
            jsonMatch = content.match(/^json\s+(\{[\s\S]*\})/m);
        }

        // 3. 行頭の "json " を除いたJSONオブジェクトを検出
        if (!jsonMatch) {
            jsonMatch = content.match(/^json\s+(\{[\s\S]*\})/m);
        }

        // 4. 単純なJSONオブジェクトを検出（最後の手段）
        if (!jsonMatch) {
            // 最初の { から最後の } までを抽出（ネストされたJSONに対応）
            const startIndex = content.indexOf('{');
            if (startIndex !== -1) {
                let braceCount = 0;
                let endIndex = startIndex;
                for (let i = startIndex; i < content.length; i++) {
                    if (content[i] === '{') braceCount++;
                    if (content[i] === '}') braceCount--;
                    if (braceCount === 0) {
                        endIndex = i;
                        break;
                    }
                }
                if (endIndex > startIndex) {
                    const jsonSubstring = content.substring(startIndex, endIndex + 1);
                    jsonMatch = [jsonSubstring, jsonSubstring];
                }
            }
        }

        if (jsonMatch) {
            let jsonStr = jsonMatch[1] || jsonMatch[0];

            // JSON文字列をクリーンアップ
            jsonStr = jsonStr.trim();

            // 不完全なJSONの場合、最後の } までを探す
            if (!jsonStr.endsWith('}')) {
                const lastBraceIndex = jsonStr.lastIndexOf('}');
                if (lastBraceIndex > 0) {
                    jsonStr = jsonStr.substring(0, lastBraceIndex + 1);
                }
            }

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
        console.debug('Failed to parse date plan JSON:', e);
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
