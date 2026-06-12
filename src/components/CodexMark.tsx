import type { JSX } from 'react';

interface CodexMarkProps {
    className?: string;
    theme?: 'dark' | 'light';
}

export function CodexMark(props: CodexMarkProps): JSX.Element {
    const { className = '', theme = 'dark' } = props;
    const classes = ['codex-mark', className]
        .filter((value) => value !== '')
        .join(' ');
    const src =
        theme === 'light' ? '/codex-logo-light.svg' : '/codex-logo-dark.svg';

    return <img alt='' className={classes} src={src} />;
}
