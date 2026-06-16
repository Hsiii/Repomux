import { useMemo } from 'react';

import { getSupportedLanguage, translate } from '../lib/i18n';
import type { AppLanguage } from '../lib/i18n';

export function useI18n(language: string): {
    language: AppLanguage;
    t: (key: Parameters<typeof translate>[1]) => string;
} {
    const supportedLanguage = getSupportedLanguage(language);

    return useMemo(
        () => ({
            language: supportedLanguage,
            t: (key) => translate(supportedLanguage, key),
        }),
        [supportedLanguage]
    );
}
