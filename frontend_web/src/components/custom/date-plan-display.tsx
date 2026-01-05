import { ExternalLink, MapPin, Clock, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatePlanLinks {
    google_maps_search_url?: string;
    web_search_url?: string;
    image_search_url?: string;
}

interface DatePlanItineraryItem {
    start: string;
    end: string;
    type: string;
    name: string;
    area: string;
    notes?: string;
    links: DatePlanLinks;
}

interface DatePlan {
    plan_id: string;
    title: string;
    theme: string;
    summary: string;
    budget_estimate_jpy: {
        min: number;
        max: number;
        notes?: string;
    };
    constraints_respected: string[];
    itinerary: DatePlanItineraryItem[];
    checks: {
        meets_exact_time_window: boolean;
        no_gaps_or_overlaps: boolean;
        rounded_to_30min: boolean;
    };
}

interface DatePlanData {
    status: 'ok' | 'needs_clarification';
    clarifying_questions?: string[];
    meta?: {
        assumed_date?: string;
        timezone?: string;
        rounding_minutes?: number;
        transport_mode?: string;
        radius_hint?: string;
        meetup_time?: string;
        breakup_time?: string;
    };
    plans: DatePlan[];
    markdown_summary?: string;
}

interface DatePlanDisplayProps {
    data: DatePlanData;
}

const typeLabels: Record<string, string> = {
    meetup: '集合',
    move: '移動',
    meal: '食事',
    cafe: 'カフェ',
    activity: 'アクティビティ',
    shopping: 'ショッピング',
    rest: '休憩',
    breakup: '解散',
    other: 'その他',
};

const typeColors: Record<string, string> = {
    meetup: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    move: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    meal: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    cafe: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    activity: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    shopping: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    rest: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
    breakup: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    other: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200',
};

function formatDateTime(dateTimeStr: string): string {
    try {
        const date = new Date(dateTimeStr.replace(' ', 'T') + ':00+09:00');
        return new Intl.DateTimeFormat('ja-JP', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    } catch {
        return dateTimeStr;
    }
}

function formatTime(dateTimeStr: string): string {
    try {
        const date = new Date(dateTimeStr.replace(' ', 'T') + ':00+09:00');
        return new Intl.DateTimeFormat('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    } catch {
        return dateTimeStr.split(' ')[1] || dateTimeStr;
    }
}

export function DatePlanDisplay({ data }: DatePlanDisplayProps) {
    if (data.status === 'needs_clarification') {
        return (
            <div className="my-4 p-4 bg-card border rounded-lg">
                <h3 className="text-lg font-semibold mb-2">追加情報が必要です</h3>
                <p className="text-sm text-muted-foreground mb-4">以下の質問にお答えください</p>
                <ul className="list-disc pl-6 space-y-2">
                    {data.clarifying_questions?.map((question, index) => (
                        <li key={index} className="text-base">
                            {question}
                        </li>
                    ))}
                </ul>
            </div>
        );
    }

    if (!data.plans || data.plans.length === 0) {
        return (
            <div className="my-4 p-4 bg-card border rounded-lg">
                <p className="text-muted-foreground">プランが生成されませんでした。</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 my-4">
            {data.meta && (
                <div className="p-4 bg-muted/50 border rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {data.meta.meetup_time && (
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <div className="font-medium">集合</div>
                                    <div className="text-muted-foreground">
                                        {formatDateTime(data.meta.meetup_time)}
                                    </div>
                                </div>
                            </div>
                        )}
                        {data.meta.breakup_time && (
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <div className="font-medium">解散</div>
                                    <div className="text-muted-foreground">
                                        {formatDateTime(data.meta.breakup_time)}
                                    </div>
                                </div>
                            </div>
                        )}
                        {data.meta.transport_mode && data.meta.transport_mode !== 'unspecified' && (
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <div className="font-medium">交通手段</div>
                                    <div className="text-muted-foreground">
                                        {data.meta.transport_mode === 'walk'
                                            ? '徒歩'
                                            : data.meta.transport_mode === 'transit'
                                              ? '公共交通'
                                              : data.meta.transport_mode === 'car'
                                                ? '車'
                                                : data.meta.transport_mode}
                                    </div>
                                </div>
                            </div>
                        )}
                        {data.meta.assumed_date && (
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <div className="font-medium">日付</div>
                                    <div className="text-muted-foreground">{data.meta.assumed_date}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {data.plans.map((plan, planIndex) => (
                <div key={plan.plan_id || planIndex} className="border rounded-lg overflow-hidden">
                    <div className="p-4 bg-muted/50 border-b">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold mb-2">{plan.title}</h3>
                                <p className="text-base text-muted-foreground mb-2">{plan.theme}</p>
                            </div>
                            <span className="ml-4 px-2 py-1 text-xs border rounded bg-background">
                                {plan.plan_id}
                            </span>
                        </div>
                        {plan.summary && (
                            <p className="mt-3 text-sm text-muted-foreground">{plan.summary}</p>
                        )}
                        {plan.budget_estimate_jpy && (
                            <div className="mt-3 flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                    ¥{plan.budget_estimate_jpy.min.toLocaleString()} 〜 ¥
                                    {plan.budget_estimate_jpy.max.toLocaleString()}
                                </span>
                                {plan.budget_estimate_jpy.notes && (
                                    <span className="text-xs text-muted-foreground">
                                        ({plan.budget_estimate_jpy.notes})
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="p-4">
                        {plan.constraints_respected && plan.constraints_respected.length > 0 && (
                            <div className="mb-4">
                                <h4 className="text-sm font-semibold mb-2">考慮した制約</h4>
                                <div className="flex flex-wrap gap-2">
                                    {plan.constraints_respected.map((constraint, idx) => (
                                        <span
                                            key={idx}
                                            className="px-2 py-1 text-xs border rounded bg-muted"
                                        >
                                            {constraint}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {plan.itinerary && plan.itinerary.length > 0 && (
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="w-[120px] px-3 py-2 text-left text-sm font-semibold">
                                                時間
                                            </th>
                                            <th className="w-[100px] px-3 py-2 text-left text-sm font-semibold">
                                                種類
                                            </th>
                                            <th className="px-3 py-2 text-left text-sm font-semibold">
                                                場所・内容
                                            </th>
                                            <th className="px-3 py-2 text-left text-sm font-semibold">
                                                エリア
                                            </th>
                                            <th className="w-[200px] px-3 py-2 text-left text-sm font-semibold">
                                                リンク
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {plan.itinerary.map((item, itemIndex) => (
                                            <tr key={itemIndex} className="border-b">
                                                <td className="px-3 py-2 font-mono text-sm">
                                                    <div className="flex flex-col">
                                                        <span>{formatTime(item.start)}</span>
                                                        <span className="text-muted-foreground text-xs">
                                                            〜 {formatTime(item.end)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span
                                                        className={cn(
                                                            'px-2 py-1 text-xs rounded',
                                                            typeColors[item.type] || typeColors.other
                                                        )}
                                                    >
                                                        {typeLabels[item.type] || item.type}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="font-medium">{item.name}</div>
                                                    {item.notes && (
                                                        <div className="text-sm text-muted-foreground mt-1">
                                                            {item.notes}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-sm text-muted-foreground">
                                                    {item.area}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="flex flex-col gap-1">
                                                        {item.links.google_maps_search_url && (
                                                            <a
                                                                href={item.links.google_maps_search_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline"
                                                            >
                                                                <MapPin className="h-3 w-3" />
                                                                Google Maps
                                                                <ExternalLink className="h-3 w-3" />
                                                            </a>
                                                        )}
                                                        {item.links.web_search_url && (
                                                            <a
                                                                href={item.links.web_search_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline"
                                                            >
                                                                検索
                                                                <ExternalLink className="h-3 w-3" />
                                                            </a>
                                                        )}
                                                        {item.links.image_search_url && (
                                                            <a
                                                                href={item.links.image_search_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline"
                                                            >
                                                                画像
                                                                <ExternalLink className="h-3 w-3" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {plan.checks && (
                            <div className="mt-4 pt-4 border-t flex gap-4 text-xs text-muted-foreground">
                                <span
                                    className={cn(
                                        plan.checks.meets_exact_time_window
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-red-600 dark:text-red-400'
                                    )}
                                >
                                    {plan.checks.meets_exact_time_window ? '✓' : '✗'} 時刻整合性
                                </span>
                                <span
                                    className={cn(
                                        plan.checks.no_gaps_or_overlaps
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-red-600 dark:text-red-400'
                                    )}
                                >
                                    {plan.checks.no_gaps_or_overlaps ? '✓' : '✗'} 連続性
                                </span>
                                <span
                                    className={cn(
                                        plan.checks.rounded_to_30min
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-red-600 dark:text-red-400'
                                    )}
                                >
                                    {plan.checks.rounded_to_30min ? '✓' : '✗'} 30分単位
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {data.markdown_summary && (
                <div className="p-4 bg-muted/30 border rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">要約</h3>
                    <div
                        className="prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{
                            __html: data.markdown_summary
                                .replace(/\n/g, '<br>')
                                .replace(/## (.*?)\n/g, '<h2>$1</h2>')
                                .replace(/### (.*?)\n/g, '<h3>$1</h3>')
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/\*(.*?)\*/g, '<em>$1</em>'),
                        }}
                    />
                </div>
            )}
        </div>
    );
}

