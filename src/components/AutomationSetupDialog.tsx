import type { JSX } from 'react';
import { Copy, X } from 'lucide-react';

import { useI18n } from '../hooks/use-i18n';

interface AutomationSetupDialogProps {
    isPromptCopied: boolean;
    language: string;
    onClose: () => void;
    onCopyPrompt: () => void;
    theme: 'dark' | 'light';
}

export function AutomationSetupDialog(
    props: AutomationSetupDialogProps
): JSX.Element {
    const { isPromptCopied, language, onClose, onCopyPrompt, theme } = props;
    const { t } = useI18n(language);

    return (
        <div
            className={`login-wall__automation-dialog-backdrop login-wall--${theme}`}
            onClick={onClose}
        >
            <section
                aria-labelledby='automation-setup-title'
                aria-modal='true'
                className='login-wall__automation-dialog'
                onClick={(event) => {
                    event.stopPropagation();
                }}
                role='dialog'
            >
                <div className='login-wall__automation-dialog-header'>
                    <div className='login-wall__automation-dialog-copy'>
                        <h2
                            className='login-wall__automation-dialog-title'
                            id='automation-setup-title'
                        >
                            {t('automation.title')}
                        </h2>
                        <p className='login-wall__automation-dialog-description'>
                            {t('automation.description')}
                        </p>
                    </div>
                    <button
                        aria-label='Close automation setup dialog'
                        className='login-wall__automation-dialog-close'
                        onClick={onClose}
                        type='button'
                    >
                        <X aria-hidden='true' size={18} />
                    </button>
                </div>

                <div className='login-wall__automation-dialog-body'>
                    <div className='login-wall__automation-prompt-card'>
                        <div className='login-wall__automation-prompt-header'>
                            <p className='login-wall__automation-prompt-title'>
                                {t('automation.promptCardTitle')}
                            </p>
                            <button
                                className='login-wall__automation-copy'
                                onClick={onCopyPrompt}
                                type='button'
                            >
                                <Copy aria-hidden='true' size={14} />
                                <span>
                                    {isPromptCopied
                                        ? t('automation.copiedButton')
                                        : t('automation.copyButton')}
                                </span>
                            </button>
                        </div>
                        <pre className='login-wall__automation-prompt'>
                            {t('automation.prompt')}
                        </pre>
                    </div>
                </div>
            </section>
        </div>
    );
}
