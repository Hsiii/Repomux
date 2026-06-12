import type { JSX } from 'react';

interface CodexMarkProps {
    className?: string;
}

export function CodexMark(props: CodexMarkProps): JSX.Element {
    const { className = '' } = props;

    return (
        <svg
            aria-hidden='true'
            className={className}
            fill='none'
            viewBox='0 0 64 64'
        >
            <path
                d='M32 8 44 15v14l-12 7-12-7V15Z'
                fill='currentColor'
                opacity='0.22'
            />
            <path
                d='M32 8 44 15v14l-12 7-12-7V15Z'
                stroke='currentColor'
                strokeLinejoin='round'
                strokeWidth='5'
            />
            <path
                d='M20 22 32 29 44 22'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='5'
            />
            <path
                d='M32 29v14'
                stroke='currentColor'
                strokeLinecap='round'
                strokeWidth='5'
            />
            <path
                d='M18 41 10 46v10l8 4 8-4'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='5'
            />
            <path
                d='M46 41 54 46v10l-8 4-8-4'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='5'
            />
        </svg>
    );
}
