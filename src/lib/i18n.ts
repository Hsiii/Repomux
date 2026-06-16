export type AppLanguage = 'en' | 'zh';

type TranslationKey =
    | 'automation.copyButton'
    | 'automation.copiedButton'
    | 'automation.description'
    | 'automation.prompt'
    | 'automation.promptCardTitle'
    | 'automation.settingsButton'
    | 'automation.title'
    | 'status.automationCopied'
    | 'status.clipboardFailed';

const translations: Record<AppLanguage, Record<TranslationKey, string>> = {
    en: {
        'automation.copyButton': 'Copy prompt',
        'automation.copiedButton': 'Copied',
        'automation.description':
            'Copy this once to let Codex set up the automation with your scope, paths, and schedule.',
        'automation.prompt': [
            'Help me set up a local Codex automation for GitHub `codex-ready` work.',
            '',
            'Before saving anything, ask me for the GitHub scope, local automation workspace root, local repository root, schedule, and name.',
            '',
            'Then process one open `codex-ready` issue or pull request per run: require Codex GitHub access and local git or `gh` auth, read the latest `## Codex prompt` comment, sync the repo, create `codex/<item-number>-<slug>`, complete the work, respect `AGENTS.md`, run focused validation, commit with a conventional commit, push, open or update a PR when needed, and post a short GitHub update.',
            '',
            'If auth, prompt text, local paths, or repo state are missing or conflicting, stop and report the blocker instead of guessing.',
        ].join('\n'),
        'automation.promptCardTitle': 'Copy into Codex',
        'automation.settingsButton': 'Set up automation',
        'automation.title': 'Automation setup',
        'status.automationCopied':
            'Automation setup prompt copied. Paste it into Codex to create the suggested automation.',
        'status.clipboardFailed':
            'Clipboard access failed. Copy the setup prompt manually from the page or README.',
    },
    zh: {
        'automation.copyButton': 'Copy prompt',
        'automation.copiedButton': 'Copied',
        'automation.description':
            'Copy this once to let Codex set up the automation with your scope, paths, and schedule.',
        'automation.prompt': [
            'Help me set up a local Codex automation for GitHub `codex-ready` work.',
            '',
            'Before saving anything, ask me for the GitHub scope, local automation workspace root, local repository root, schedule, and name.',
            '',
            'Then process one open `codex-ready` issue or pull request per run: require Codex GitHub access and local git or `gh` auth, read the latest `## Codex prompt` comment, sync the repo, create `codex/<item-number>-<slug>`, complete the work, respect `AGENTS.md`, run focused validation, commit with a conventional commit, push, open or update a PR when needed, and post a short GitHub update.',
            '',
            'If auth, prompt text, local paths, or repo state are missing or conflicting, stop and report the blocker instead of guessing.',
        ].join('\n'),
        'automation.promptCardTitle': 'Copy into Codex',
        'automation.settingsButton': 'Set up automation',
        'automation.title': 'Automation setup',
        'status.automationCopied':
            'Automation setup prompt copied. Paste it into Codex to create the suggested automation.',
        'status.clipboardFailed':
            'Clipboard access failed. Copy the setup prompt manually from the page or README.',
    },
};

export function getSupportedLanguage(language: string): AppLanguage {
    return language === 'zh' ? 'zh' : 'en';
}

export function translate(language: AppLanguage, key: TranslationKey): string {
    return translations[language][key];
}
