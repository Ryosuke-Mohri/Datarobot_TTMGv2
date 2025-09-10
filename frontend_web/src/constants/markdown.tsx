import { PropsWithChildren, HTMLAttributes } from 'react';

type MarkdownComponentProps = PropsWithChildren<HTMLAttributes<HTMLElement>>;

export const MARKDOWN_COMPONENTS = {
    ul: ({ children, ...props }: MarkdownComponentProps) => (
        <ul className="list-disc leading-relaxed pl-8 my-4" {...props}>
            {children}
        </ul>
    ),
    ol: ({ children, ...props }: MarkdownComponentProps) => (
        <ol className="list-decimal leading-relaxed pl-8 my-4" {...props}>
            {children}
        </ol>
    ),
    h1: ({ children, ...props }: MarkdownComponentProps) => (
        <h1 className="text-4xl font-bold leading-tight mt-6 mb-4" {...props}>
            {children}
        </h1>
    ),
    h2: ({ children, ...props }: MarkdownComponentProps) => (
        <h2 className="text-3xl font-semibold leading-snug mt-6 mb-4" {...props}>
            {children}
        </h2>
    ),
    h3: ({ children, ...props }: MarkdownComponentProps) => (
        <h3 className="text-2xl font-semibold leading-snug mt-4 mb-2" {...props}>
            {children}
        </h3>
    ),
    h4: ({ children, ...props }: MarkdownComponentProps) => (
        <h4 className="text-xl font-semibold leading-snug mt-4 mb-2" {...props}>
            {children}
        </h4>
    ),
    p: ({ children, ...props }: MarkdownComponentProps) => (
        <p className="text-base leading-relaxed" {...props}>
            {children}
        </p>
    ),
    hr: ({ ...props }: MarkdownComponentProps) => <hr className="mt-4 mb-2" {...props} />,
};
