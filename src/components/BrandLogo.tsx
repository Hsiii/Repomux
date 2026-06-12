import type { JSX } from 'react';

interface BrandLogoProps {
    alt?: string;
    className?: string;
}

export function BrandLogo(props: BrandLogoProps): JSX.Element {
    const { alt = 'repomux logo', className = '' } = props;

    const classes = ['brand-logo', className]
        .filter((value) => value !== '')
        .join(' ');

    return <img alt={alt} className={classes} src='/repomux-logo.svg' />;
}
