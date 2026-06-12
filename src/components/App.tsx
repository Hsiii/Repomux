import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
    ArrowRight,
    Bot,
    Check,
    ChevronDown,
    CircleArrowUp,
    CircleDot,
    ExternalLink,
    GitBranch,
    GitPullRequestArrow,
    Languages,
    MessageSquareText,
    Moon,
    Settings,
    Sun,
} from 'lucide-react';

import { useGitHubConnection } from '../hooks/use-github-connection.js';
import {
    assignToCodex,
    fetchAccessibleRepositories,
    fetchWorkItems,
} from '../lib/github.js';
import { mockRepositories, mockWorkItems } from '../lib/mock-data.js';
import {
    getStoredActiveRepositories,
    loadRepositories,
    setStoredActiveRepositories,
} from '../lib/repositories.js';
import { supabase } from '../lib/supabase.js';
import type { Repository, WorkItem } from '../types/app.js';
import { BrandLogo } from './brand-logo.js';
import { RepositorySidebar } from './repository-sidebar.js';
import type { WorkFilter } from './repository-sidebar.js';
import { WorkPanel } from './work-panel.js';

export function App(): JSX.Element {
    const [repositorySearchQuery, setRepositorySearchQuery] = useState('');
    const [activeRepositoryNames, setActiveRepositoryNames] = useState<
        readonly string[] | undefined
    >(getStoredActiveRepositories);
    const [workFilter, setWorkFilter] = useState<WorkFilter>(
        'assigned-or-unassigned'
    );
    const [selectedItem, setSelectedItem] = useState(
        supabase === undefined ? mockWorkItems[0] : undefined
    );
    const [promptDrafts, setPromptDrafts] = useState<Record<string, string>>(
        {}
    );
    const [statusMessage, setStatusMessage] = useState('');
    const [loginTheme, setLoginTheme] = useState<'dark' | 'light'>('dark');
    const [loginLanguage, setLoginLanguage] = useState('en');
    const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
    const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);

    const {
        connectGitHub,
        disconnectGitHub,
        githubSession,
        githubToken,
        githubUserQuery,
    } = useGitHubConnection(setStatusMessage);

    const repositoriesQuery = useQuery({
        enabled: supabase !== undefined && githubSession !== undefined,
        queryFn: loadRepositories,
        queryKey: ['repositories'],
    });

    const accessibleRepositoriesQuery = useQuery({
        enabled: githubToken.trim() !== '',
        queryFn: async () => await fetchAccessibleRepositories(githubToken),
        queryKey: ['accessible-repositories', githubToken],
        staleTime: 60_000,
    });

    const availableRepositories = useMemo(() => {
        if ((accessibleRepositoriesQuery.data?.length ?? 0) > 0) {
            return accessibleRepositoriesQuery.data ?? [];
        }

        if (supabase === undefined) {
            return mockRepositories;
        }

        return repositoriesQuery.data ?? [];
    }, [accessibleRepositoriesQuery.data, repositoriesQuery.data]);

    const effectiveActiveRepositoryNames =
        activeRepositoryNames ??
        (availableRepositories.length === 0
            ? []
            : [availableRepositories[0].fullName]);

    const activeRepositories = availableRepositories.filter((repository) =>
        effectiveActiveRepositoryNames.includes(repository.fullName)
    );

    const filteredRepositories = useMemo(() => {
        const normalizedQuery = repositorySearchQuery.trim().toLowerCase();

        if (normalizedQuery === '') {
            return availableRepositories;
        }

        return availableRepositories.filter((repository) =>
            repository.fullName.toLowerCase().includes(normalizedQuery)
        );
    }, [availableRepositories, repositorySearchQuery]);

    const workItemsQuery = useQuery({
        enabled: supabase !== undefined && activeRepositories.length > 0,
        queryFn: async () => await fetchWorkItems(activeRepositories),
        queryKey: [
            'work-items',
            activeRepositories
                .map((repository) => repository.fullName)
                .toSorted()
                .join(','),
        ],
    });

    const workItems =
        supabase === undefined
            ? mockWorkItems.filter((item) =>
                  activeRepositories.some(
                      (repository) => repository.fullName === item.repo
                  )
              )
            : (workItemsQuery.data ?? []);

    const filteredWorkItems = workItems.filter((item) => {
        const githubLogin = githubUserQuery.data?.login;

        if (githubLogin === undefined) {
            return true;
        }

        if (workFilter === 'all') {
            return true;
        }

        if (item.assigneeLogins.includes(githubLogin)) {
            return true;
        }

        return (
            workFilter === 'assigned-or-unassigned' &&
            item.assigneeLogins.length === 0
        );
    });

    const selectedPrompt =
        selectedItem === undefined ? '' : (promptDrafts[selectedItem.id] ?? '');

    const assignMutation = useMutation({
        mutationFn: async () => {
            if (selectedItem === undefined) {
                return;
            }

            await assignToCodex(selectedItem, selectedPrompt, githubToken);
        },
        onSuccess: () => {
            setStatusMessage('Queued for Codex.');
            setSelectedItem(undefined);
            workItemsQuery.refetch().catch((error: unknown) => {
                setStatusMessage(
                    error instanceof Error
                        ? error.message
                        : 'Unable to reload work queue.'
                );
            });
        },
    });

    useEffect(() => {
        setActiveRepositoryNames((current) => {
            if (current === undefined) {
                return current;
            }

            const next = current.filter((repositoryName) =>
                availableRepositories.some(
                    (repository) => repository.fullName === repositoryName
                )
            );

            if (next.length === current.length) {
                return current;
            }

            setStoredActiveRepositories(next);
            return next;
        });
    }, [availableRepositories]);

    function updateActiveRepositories(nextRepositoryNames: readonly string[]) {
        setStoredActiveRepositories(nextRepositoryNames);
        setActiveRepositoryNames(nextRepositoryNames);
    }

    function selectRepository(repository: Readonly<Repository>) {
        updateActiveRepositories([repository.fullName]);
        setSelectedItem(undefined);
        setStatusMessage('');
    }

    function updatePrompt(value: string) {
        if (selectedItem === undefined) {
            return;
        }

        setPromptDrafts((current: Readonly<Record<string, string>>) => ({
            ...current,
            [selectedItem.id]: value,
        }));
    }

    function selectItem(item: Readonly<WorkItem> | undefined) {
        setSelectedItem(item);
        setStatusMessage('');
    }

    let statusText = statusMessage;

    if (assignMutation.error instanceof Error) {
        statusText = assignMutation.error.message;
    } else if (accessibleRepositoriesQuery.error instanceof Error) {
        statusText = accessibleRepositoriesQuery.error.message;
    } else if (repositoriesQuery.error instanceof Error) {
        statusText = repositoriesQuery.error.message;
    } else if (workItemsQuery.error instanceof Error) {
        statusText = workItemsQuery.error.message;
    }

    const isGitHubConnected = githubToken.trim() !== '';
    const loginWallBenefits = [
        {
            icon: CircleDot,
            label: 'See the queue',
            value: 'Issues and PRs from the repos you maintain.',
        },
        {
            icon: MessageSquareText,
            label: 'Prompt the work',
            value: 'Add scope, constraints, and acceptance criteria.',
        },
        {
            icon: GitPullRequestArrow,
            label: 'Review the result',
            value: 'Step away and come back when Codex has a PR ready.',
        },
    ] as const;
    const loginWallPreviewItems = [
        {
            icon: CircleDot,
            meta: 'Hsiii/repomux',
            number: 128,
            status: 'Ready',
            title: 'Polish landing page',
            type: 'issue',
        },
        {
            icon: CircleDot,
            meta: 'Hsiii/repomux',
            number: 124,
            status: 'Prepared',
            title: 'Confirm acceptance criteria',
            type: 'issue',
        },
        {
            icon: GitPullRequestArrow,
            meta: 'Hsiii/repomux',
            number: 72,
            status: 'Assigned',
            title: 'Ship the implementation',
            type: 'pr',
        },
    ] as const;
    const loginLanguages = [
        { label: 'English', shortLabel: 'EN', value: 'en' },
        { label: 'Chinese', shortLabel: 'ZH', value: 'zh' },
    ] as const;
    const selectedLoginLanguage =
        loginLanguages.find((language) => language.value === loginLanguage) ??
        loginLanguages[0];
    const loginPreviewAvatar = 'https://github.com/Hsiii.png';

    function setupAutomation() {
        setStatusMessage(
            'Automation setup starts from the Codex-ready GitHub automation prompt.'
        );
        setIsSettingsMenuOpen(false);
    }

    return (
        <>
            {isGitHubConnected ? (
                <main className={`app-shell app-shell--${loginTheme}`}>
                    <RepositorySidebar
                        filteredRepositories={filteredRepositories}
                        githubToken={githubToken}
                        githubUser={githubUserQuery.data}
                        hasGitHubError={githubUserQuery.isError}
                        isSettingsMenuOpen={isSettingsMenuOpen}
                        language={loginLanguage}
                        onConnectGitHub={connectGitHub}
                        onDisconnectGitHub={disconnectGitHub}
                        onSelectRepository={selectRepository}
                        onSetLanguage={setLoginLanguage}
                        onSetupAutomation={setupAutomation}
                        onToggleSettingsMenu={() => {
                            setIsSettingsMenuOpen((current) => !current);
                        }}
                        onToggleTheme={() => {
                            setLoginTheme((current) =>
                                current === 'dark' ? 'light' : 'dark'
                            );
                        }}
                        onUpdateRepositorySearchQuery={setRepositorySearchQuery}
                        onUpdateWorkFilter={(filter) => {
                            setWorkFilter(filter);
                            setIsSettingsMenuOpen(false);
                        }}
                        repositorySearchQuery={repositorySearchQuery}
                        selectedRepositoryNames={effectiveActiveRepositoryNames}
                        theme={loginTheme}
                        workFilter={workFilter}
                    />

                    <WorkPanel
                        filteredWorkItems={filteredWorkItems}
                        githubToken={githubToken}
                        isAssigning={assignMutation.isPending}
                        onAssign={() => {
                            assignMutation.mutate(undefined);
                        }}
                        onSelectItem={selectItem}
                        onUpdatePrompt={updatePrompt}
                        selectedItem={selectedItem}
                        selectedPrompt={selectedPrompt}
                        statusText={statusText}
                    />
                </main>
            ) : (
                <main className={`login-wall login-wall--${loginTheme}`}>
                    <div className='login-wall__frame'>
                        <header className='login-wall__topbar'>
                            <div className='login-wall__wordmark'>
                                <BrandLogo
                                    alt='Repomux'
                                    className='login-wall__wordmark-mark'
                                />
                                <span className='login-wall__wordmark-text'>
                                    Repomux
                                </span>
                            </div>
                            <button
                                className='login-wall__button login-wall__topbar-login'
                                onClick={connectGitHub}
                                type='button'
                            >
                                <svg
                                    aria-hidden='true'
                                    className='login-wall__button-icon'
                                    fill='currentColor'
                                    viewBox='0 0 24 24'
                                >
                                    <path d='M12 .5C5.65.5.5 5.65.5 12A11.5 11.5 0 0 0 8.36 22.1c.58.1.79-.25.79-.56v-2.17c-3.18.69-3.85-1.35-3.85-1.35-.52-1.31-1.27-1.66-1.27-1.66-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.33.96.1-.74.4-1.25.72-1.54-2.54-.29-5.22-1.27-5.22-5.64 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.19 1.18a11.1 11.1 0 0 1 5.82 0c2.22-1.49 3.19-1.18 3.19-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.38-2.68 5.34-5.24 5.63.41.35.78 1.03.78 2.08v3.08c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z' />
                                </svg>
                                <span>Connect</span>
                            </button>
                        </header>

                        <section className='login-wall__layout'>
                            <div className='login-wall__story'>
                                <div className='login-wall__headline-group'>
                                    <h1 className='login-wall__title'>
                                        Stop babysitting coding agents.
                                    </h1>
                                    <p className='login-wall__lede'>
                                        Add your prompt to issues and PRs across
                                        repos, step away, and come back to PRs
                                        ready for review.
                                    </p>
                                </div>

                                <button
                                    className='login-wall__button login-wall__hero-button'
                                    onClick={connectGitHub}
                                    type='button'
                                >
                                    <svg
                                        aria-hidden='true'
                                        className='login-wall__button-icon'
                                        fill='currentColor'
                                        viewBox='0 0 24 24'
                                    >
                                        <path d='M12 .5C5.65.5.5 5.65.5 12A11.5 11.5 0 0 0 8.36 22.1c.58.1.79-.25.79-.56v-2.17c-3.18.69-3.85-1.35-3.85-1.35-.52-1.31-1.27-1.66-1.27-1.66-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.33.96.1-.74.4-1.25.72-1.54-2.54-.29-5.22-1.27-5.22-5.64 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.19 1.18a11.1 11.1 0 0 1 5.82 0c2.22-1.49 3.19-1.18 3.19-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.38-2.68 5.34-5.24 5.63.41.35.78 1.03.78 2.08v3.08c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z' />
                                    </svg>
                                    <span>Connect GitHub</span>
                                    <ArrowRight aria-hidden='true' size={16} />
                                </button>

                                {statusText === '' ? undefined : (
                                    <p className='login-wall__status'>
                                        {statusText}
                                    </p>
                                )}

                                <div className='login-wall__benefits'>
                                    <article
                                        aria-label='Repomux app UI preview'
                                        className='login-wall__app-preview'
                                    >
                                        <div className='login-wall__product-topbar'>
                                            <div className='login-wall__window-controls'>
                                                <span />
                                                <span />
                                                <span />
                                            </div>
                                        </div>

                                        <div className='app-shell login-wall__app-shell-preview'>
                                            <aside className='repo-panel login-wall__repo-panel-preview'>
                                                <section className='repo-panel__section'>
                                                    <div className='repo-panel__main'>
                                                        <div className='repo-panel__header'>
                                                            <div className='repo-panel__heading'>
                                                                <h2 className='repo-panel__title'>
                                                                    Repositories
                                                                </h2>
                                                            </div>
                                                            <div className='modal-input repo-search-input login-wall__search-preview'>
                                                                Find repo...
                                                            </div>
                                                        </div>

                                                        <div className='repo-list repo-list--sidebar'>
                                                            <div className='repo-row repo-row--selected'>
                                                                <span
                                                                    aria-hidden='true'
                                                                    className='repo-row__icon'
                                                                >
                                                                    <GitBranch
                                                                        size={
                                                                            16
                                                                        }
                                                                    />
                                                                </span>
                                                                <span className='repo-row__label'>
                                                                    <span className='repo-row__owner'>
                                                                        Hsiii
                                                                    </span>
                                                                    <span className='repo-row__slash'>
                                                                        /
                                                                    </span>
                                                                    <span className='repo-row__name'>
                                                                        Repomux
                                                                    </span>
                                                                </span>
                                                            </div>
                                                            <div className='repo-row'>
                                                                <span
                                                                    aria-hidden='true'
                                                                    className='repo-row__icon'
                                                                >
                                                                    <GitBranch
                                                                        size={
                                                                            16
                                                                        }
                                                                    />
                                                                </span>
                                                                <span className='repo-row__label'>
                                                                    <span className='repo-row__owner'>
                                                                        Hsiii
                                                                    </span>
                                                                    <span className='repo-row__slash'>
                                                                        /
                                                                    </span>
                                                                    <span className='repo-row__name'>
                                                                        create-hsi-app
                                                                    </span>
                                                                </span>
                                                            </div>
                                                            <div className='repo-row'>
                                                                <span
                                                                    aria-hidden='true'
                                                                    className='repo-row__icon'
                                                                >
                                                                    <GitBranch
                                                                        size={
                                                                            16
                                                                        }
                                                                    />
                                                                </span>
                                                                <span className='repo-row__label'>
                                                                    <span className='repo-row__owner'>
                                                                        Hsiii
                                                                    </span>
                                                                    <span className='repo-row__slash'>
                                                                        /
                                                                    </span>
                                                                    <span className='repo-row__name'>
                                                                        dotfiles
                                                                    </span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className='repo-user-card'>
                                                        <img
                                                            alt=''
                                                            className='repo-user-card__avatar'
                                                            src={
                                                                loginPreviewAvatar
                                                            }
                                                        />
                                                        <div className='repo-user-card__main'>
                                                            <span className='repo-user-card__name'>
                                                                Hsiii (Hsi)
                                                            </span>
                                                            <span className='repo-user-card__meta'>
                                                                @Hsiii
                                                            </span>
                                                        </div>
                                                        <span className='repo-user-card__icon-button'>
                                                            <Settings
                                                                aria-hidden='true'
                                                                size={16}
                                                            />
                                                        </span>
                                                    </div>
                                                </section>
                                            </aside>

                                            <section className='work-panel login-wall__work-panel-preview'>
                                                <div className='work-panel__header'>
                                                    <h2 className='work-title'>
                                                        Work queue
                                                    </h2>
                                                </div>

                                                <div className='queue-list'>
                                                    {loginWallPreviewItems.map(
                                                        ({
                                                            icon: Icon,
                                                            meta,
                                                            number,
                                                            status,
                                                            title,
                                                            type,
                                                        }) => (
                                                            <div
                                                                className='queue-row'
                                                                key={title}
                                                            >
                                                                <span className='queue-row__type'>
                                                                    <Icon
                                                                        aria-label={
                                                                            type ===
                                                                            'issue'
                                                                                ? 'Issue'
                                                                                : 'Pull request'
                                                                        }
                                                                        size={
                                                                            18
                                                                        }
                                                                    />
                                                                </span>
                                                                <span className='queue-row__content'>
                                                                    <span className='queue-row__title'>
                                                                        {title}
                                                                    </span>
                                                                    <span className='queue-row__meta'>
                                                                        <span className='queue-row__repo'>
                                                                            {
                                                                                meta
                                                                            }
                                                                        </span>
                                                                        <span className='queue-row__number'>
                                                                            #
                                                                            {
                                                                                number
                                                                            }
                                                                        </span>
                                                                    </span>
                                                                </span>
                                                                <span className='readiness'>
                                                                    {status ===
                                                                    'Ready' ? (
                                                                        <Check
                                                                            aria-label='Codex ready'
                                                                            size={
                                                                                18
                                                                            }
                                                                        />
                                                                    ) : (
                                                                        <span
                                                                            aria-label='Not codex ready'
                                                                            className='readiness__empty'
                                                                        />
                                                                    )}
                                                                </span>
                                                            </div>
                                                        )
                                                    )}
                                                </div>

                                                <div className='login-wall__detail-preview'>
                                                    <label className='prompt-label'>
                                                        Prompt
                                                    </label>
                                                    <div className='prompt-input login-wall__prompt-preview'>
                                                        Remove purple gradients,
                                                        and prevent the showcase
                                                        UI from overflowing
                                                    </div>
                                                    <div className='assign-button login-wall__assign-preview'>
                                                        <span>
                                                            Assign to Codex
                                                        </span>
                                                        <CircleArrowUp
                                                            aria-hidden='true'
                                                            size={24}
                                                        />
                                                    </div>
                                                </div>
                                            </section>
                                        </div>
                                    </article>

                                    <div
                                        aria-label='Repomux workflow benefits'
                                        className='login-wall__benefit-stack'
                                    >
                                        {loginWallBenefits.map(
                                            ({ icon: Icon, label, value }) => (
                                                <article
                                                    className='login-wall__benefit-card'
                                                    key={label}
                                                >
                                                    <div className='login-wall__benefit-step'>
                                                        <Icon
                                                            aria-hidden='true'
                                                            size={16}
                                                        />
                                                    </div>
                                                    <div className='login-wall__benefit-copy'>
                                                        <h2 className='login-wall__benefit-label'>
                                                            {label}
                                                        </h2>
                                                        <p className='login-wall__benefit-value'>
                                                            {value}
                                                        </p>
                                                    </div>
                                                </article>
                                            )
                                        )}
                                    </div>

                                    <section className='login-wall__automation'>
                                        <div className='login-wall__section-heading'>
                                            <h2>Let Codex picks it up.</h2>
                                            <p>
                                                Turn the queue into a
                                                Codex-ready automation so work
                                                keeps moving after you step
                                                away.
                                            </p>
                                        </div>
                                        <button
                                            className='login-wall__value-button'
                                            onClick={connectGitHub}
                                            type='button'
                                        >
                                            <Bot aria-hidden='true' size={16} />
                                            Set up automation
                                            <ArrowRight
                                                aria-hidden='true'
                                                size={16}
                                            />
                                        </button>
                                    </section>
                                </div>
                            </div>
                        </section>

                        <footer className='login-wall__footer'>
                            <div className='login-wall__footer-actions'>
                                <a
                                    className='login-wall__footer-link'
                                    href='https://github.com/Hsiii/LazyHub'
                                    rel='noreferrer'
                                    target='_blank'
                                >
                                    <svg
                                        aria-hidden='true'
                                        className='login-wall__button-icon'
                                        fill='currentColor'
                                        viewBox='0 0 24 24'
                                    >
                                        <path d='M12 .5C5.65.5.5 5.65.5 12A11.5 11.5 0 0 0 8.36 22.1c.58.1.79-.25.79-.56v-2.17c-3.18.69-3.85-1.35-3.85-1.35-.52-1.31-1.27-1.66-1.27-1.66-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.33.96.1-.74.4-1.25.72-1.54-2.54-.29-5.22-1.27-5.22-5.64 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.19 1.18a11.1 11.1 0 0 1 5.82 0c2.22-1.49 3.19-1.18 3.19-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.38-2.68 5.34-5.24 5.63.41.35.78 1.03.78 2.08v3.08c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z' />
                                    </svg>
                                    <span>GitHub</span>
                                    <ExternalLink
                                        aria-hidden='true'
                                        size={14}
                                    />
                                </a>

                                <div className='login-wall__language'>
                                    <button
                                        aria-expanded={isLanguageMenuOpen}
                                        aria-haspopup='menu'
                                        className='login-wall__language-trigger'
                                        onClick={() => {
                                            setIsLanguageMenuOpen(
                                                (current) => !current
                                            );
                                        }}
                                        type='button'
                                    >
                                        <Languages
                                            aria-hidden='true'
                                            size={16}
                                        />
                                        <span>
                                            {selectedLoginLanguage.shortLabel}
                                        </span>
                                        <ChevronDown
                                            aria-hidden='true'
                                            size={14}
                                        />
                                    </button>

                                    {isLanguageMenuOpen ? (
                                        <div
                                            className='login-wall__language-menu'
                                            role='menu'
                                        >
                                            {loginLanguages.map((language) => (
                                                <button
                                                    aria-checked={
                                                        language.value ===
                                                        loginLanguage
                                                    }
                                                    className='login-wall__language-option'
                                                    key={language.value}
                                                    onClick={() => {
                                                        setLoginLanguage(
                                                            language.value
                                                        );
                                                        setIsLanguageMenuOpen(
                                                            false
                                                        );
                                                    }}
                                                    role='menuitemradio'
                                                    type='button'
                                                >
                                                    <span>
                                                        {language.label}
                                                    </span>
                                                    {language.value ===
                                                    loginLanguage ? (
                                                        <Check
                                                            aria-hidden='true'
                                                            size={14}
                                                        />
                                                    ) : undefined}
                                                </button>
                                            ))}
                                        </div>
                                    ) : undefined}
                                </div>

                                <button
                                    aria-label={
                                        loginTheme === 'dark'
                                            ? 'Switch to light mode'
                                            : 'Switch to dark mode'
                                    }
                                    aria-pressed={loginTheme === 'light'}
                                    className='login-wall__theme-toggle'
                                    onClick={() => {
                                        setLoginTheme((current) =>
                                            current === 'dark'
                                                ? 'light'
                                                : 'dark'
                                        );
                                    }}
                                    type='button'
                                >
                                    {loginTheme === 'dark' ? (
                                        <Sun aria-hidden='true' size={16} />
                                    ) : (
                                        <Moon aria-hidden='true' size={16} />
                                    )}
                                    <span>
                                        {loginTheme === 'dark'
                                            ? 'Light'
                                            : 'Dark'}
                                    </span>
                                </button>
                            </div>
                        </footer>
                    </div>
                </main>
            )}
        </>
    );
}
