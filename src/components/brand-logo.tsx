import type { JSX } from 'react';

interface BrandLogoProps {
    alt?: string;
    className?: string;
    tone?: 'dark' | 'light';
}

export function BrandLogo(props: BrandLogoProps): JSX.Element {
    const { alt = 'repomux logo', className = '', tone = 'dark' } = props;

    const classes = ['brand-logo', `brand-logo--${tone}`, className]
        .filter((value) => value !== '')
        .join(' ');

    return <img alt={alt} className={classes} src='/repomux-logo.svg' />;
}
