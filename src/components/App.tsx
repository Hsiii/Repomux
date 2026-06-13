'use client';

import type { CSSProperties, JSX } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
    ArrowRight,
    BookMarked,
    Check,
    ChevronDown,
    CircleDot,
    Clock3,
    Copy,
    GitPullRequestArrow,
    Languages,
    Moon,
    Sun,
    X,
} from 'lucide-react';

import { useGitHubConnection } from '../hooks/use-github-connection';
import {
    assignToCodex,
    fetchAccessibleRepositories,
    fetchWorkItems,
} from '../lib/github';
import {
    getStoredActiveRepositories,
    setStoredActiveRepositories,
} from '../lib/repositories';
import type { Repository, WorkItem } from '../types/app';
import { BrandLogo } from './BrandLogo';
import { CodexMark } from './CodexMark';
import { GitHubMark } from './GitHubMark';
import { RepositorySidebar } from './RepositorySidebar';
import type { WorkFilter } from './RepositorySidebar';
import { WorkPanel } from './WorkPanel';

const automationSetupPrompt = [
    'Help me set up a local Codex automation for GitHub `codex-ready` work.',
    '',
    'Before saving anything, ask me for the GitHub scope, local automation workspace root, local repository root, schedule, and name.',
    '',
    'Then process one open `codex-ready` issue or pull request per run: require Codex GitHub access and local git or `gh` auth, read the latest `## Codex prompt` comment, sync the repo, create `codex/<item-number>-<slug>`, complete the work, respect `AGENTS.md`, run focused validation, commit with a conventional commit, push, open or update a PR when needed, and post a short GitHub update.',
    '',
    'If auth, prompt text, local paths, or repo state are missing or conflicting, stop and report the blocker instead of guessing.',
].join('\n');

export function App(): JSX.Element {
    const [repositorySearchQuery, setRepositorySearchQuery] = useState('');
    const [activeRepositoryNames, setActiveRepositoryNames] = useState<
        readonly string[] | undefined
    >(getStoredActiveRepositories);
    const [workFilter, setWorkFilter] = useState<WorkFilter>(
        'assigned-or-unassigned'
    );
    const [selectedItem, setSelectedItem] = useState<WorkItem | undefined>();
    const [promptDrafts, setPromptDrafts] = useState<Record<string, string>>(
        {}
    );
    const [statusMessage, setStatusMessage] = useState('');
    const [loginTheme, setLoginTheme] = useState<'dark' | 'light'>('dark');
    const [loginLanguage, setLoginLanguage] = useState('en');
    const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
    const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
    const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
    const [isAutomationPromptCopied, setIsAutomationPromptCopied] =
        useState(false);
    const [isAutomationDialogOpen, setIsAutomationDialogOpen] = useState(false);
    const loginTopbarControlsRef = useRef<HTMLDivElement>(null);

    const {
        connectGitHub,
        disconnectGitHub,
        githubSessionQuery,
        githubUser,
        isGitHubConnected,
    } = useGitHubConnection(setStatusMessage);

    const accessibleRepositoriesQuery = useQuery({
        enabled: isGitHubConnected,
        queryFn: fetchAccessibleRepositories,
        queryKey: ['accessible-repositories'],
        staleTime: 60_000,
    });

    const availableRepositories = accessibleRepositoriesQuery.data ?? [];

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
        enabled: isGitHubConnected && activeRepositories.length > 0,
        queryFn: async () => await fetchWorkItems(activeRepositories),
        queryKey: [
            'work-items',
            activeRepositories
                .map((repository) => repository.fullName)
                .toSorted()
                .join(','),
        ],
    });

    const workItems = workItemsQuery.data ?? [];

    const filteredWorkItems = workItems.filter((item) => {
        const githubLogin = githubUser?.login;

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

            await assignToCodex(selectedItem, selectedPrompt);
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

    useEffect(() => {
        if (!isLanguageMenuOpen && !isThemeMenuOpen) {
            return undefined;
        }

        function closeLoginMenusOnOutsideClick(event: PointerEvent) {
            const { target } = event;
            const topbarControls = loginTopbarControlsRef.current;

            if (
                target instanceof Node &&
                topbarControls !== null &&
                topbarControls.contains(target)
            ) {
                return;
            }

            setIsLanguageMenuOpen(false);
            setIsThemeMenuOpen(false);
        }

        document.addEventListener('pointerdown', closeLoginMenusOnOutsideClick);

        return () => {
            document.removeEventListener(
                'pointerdown',
                closeLoginMenusOnOutsideClick
            );
        };
    }, [isLanguageMenuOpen, isThemeMenuOpen]);

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
    } else if (workItemsQuery.error instanceof Error) {
        statusText = workItemsQuery.error.message;
    }
    const loginWallQueueItems = [
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
            meta: 'Hsiii/comux',
            number: 41,
            status: 'Prepared',
            title: 'Consider supporting Claude',
            type: 'issue',
        },
        {
            icon: GitPullRequestArrow,
            meta: 'Hsiii/create-hsi-app',
            number: 72,
            status: 'Assigned',
            title: 'Add user menu pop up',
            type: 'pr',
        },
    ] as const;
    const loginWallPromptLines = [
        {
            steps: 55,
            text: 'Redesign the benefit section to show repo multiplexing.',
            width: '55ch',
        },
        {
            steps: 66,
            text: 'Keep the queue, prompt handoff, and automation states easy to scan.',
            width: '66ch',
        },
        {
            steps: 62,
            text: 'Remove decorative clutter and keep the review path obvious.',
            width: '62ch',
        },
    ] as const;
    const loginWallRepositoryNodes = [
        { name: 'repomux', owner: 'Hsiii' },
        { name: 'create-hsi-app', owner: 'Hsiii' },
        { name: 'comux', owner: 'Hsiii' },
        { name: 'fish-git-alias', owner: 'Hsiii' },
    ] as const;
    const loginWallMuxLayout = {
        codexX: 484,
        codexY: 222,
        hubX: 300,
        hubY: 206,
        hubLineStartX: 376,
        lineEndX: 322,
        lineEndY: 254,
        lineStartX: 212,
        repoHeight: 84,
        repoWidth: 196,
        repoX: 16,
        repoYGap: 112,
        repoYStart: 44,
        viewBoxHeight: 504,
    } as const;
    const loginLanguages = [
        { label: 'English', shortLabel: 'EN', value: 'en' },
        { label: 'Chinese', shortLabel: 'ZH', value: 'zh' },
    ] as const;
    const loginThemes = [
        { icon: Moon, label: 'Dark', value: 'dark' },
        { icon: Sun, label: 'Light', value: 'light' },
    ] as const;
    const selectedLoginLanguage =
        loginLanguages.find((language) => language.value === loginLanguage) ??
        loginLanguages[0];
    const selectedLoginTheme =
        loginThemes.find((theme) => theme.value === loginTheme) ??
        loginThemes[0];
    const SelectedLoginThemeIcon = selectedLoginTheme.icon;
    function copyAutomationSetupPrompt() {
        setIsSettingsMenuOpen(false);
        navigator.clipboard
            .writeText(automationSetupPrompt)
            .then(() => {
                setIsAutomationPromptCopied(true);
                setStatusMessage(
                    'Automation setup prompt copied. Paste it into Codex to create the suggested automation.'
                );
            })
            .catch(() => {
                setStatusMessage(
                    'Clipboard access failed. Copy the setup prompt manually from the page or README.'
                );
            });
    }

    useEffect(() => {
        if (!isAutomationDialogOpen) {
            return undefined;
        }

        function closeAutomationDialogOnEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsAutomationDialogOpen(false);
            }
        }

        document.addEventListener('keydown', closeAutomationDialogOnEscape);

        return () => {
            document.removeEventListener(
                'keydown',
                closeAutomationDialogOnEscape
            );
        };
    }, [isAutomationDialogOpen]);

    return (
        <>
            {isGitHubConnected ? (
                <main className={`app-shell app-shell--${loginTheme}`}>
                    <RepositorySidebar
                        filteredRepositories={filteredRepositories}
                        githubUser={githubUser}
                        hasGitHubError={githubSessionQuery.isError}
                        isAutomationPromptCopied={isAutomationPromptCopied}
                        isGitHubConnected={isGitHubConnected}
                        isSettingsMenuOpen={isSettingsMenuOpen}
                        language={loginLanguage}
                        onConnectGitHub={connectGitHub}
                        onDisconnectGitHub={disconnectGitHub}
                        onSelectRepository={selectRepository}
                        onSetLanguage={setLoginLanguage}
                        onSetupAutomation={copyAutomationSetupPrompt}
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
                        isAssigning={assignMutation.isPending}
                        isGitHubConnected={isGitHubConnected}
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
                            <div
                                className='login-wall__topbar-controls'
                                ref={loginTopbarControlsRef}
                            >
                                <a
                                    className='login-wall__footer-link'
                                    href='https://github.com/Hsiii/LazyHub'
                                    rel='noreferrer'
                                    target='_blank'
                                >
                                    <GitHubMark className='login-wall__github-icon' />
                                    <span>GitHub</span>
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
                                            setIsThemeMenuOpen(false);
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

                                <div className='login-wall__language'>
                                    <button
                                        aria-expanded={isThemeMenuOpen}
                                        aria-haspopup='menu'
                                        className='login-wall__theme-toggle'
                                        onClick={() => {
                                            setIsThemeMenuOpen(
                                                (current) => !current
                                            );
                                            setIsLanguageMenuOpen(false);
                                        }}
                                        type='button'
                                    >
                                        <SelectedLoginThemeIcon
                                            aria-hidden='true'
                                            size={16}
                                        />
                                        <span>{selectedLoginTheme.label}</span>
                                        <ChevronDown
                                            aria-hidden='true'
                                            size={14}
                                        />
                                    </button>

                                    {isThemeMenuOpen ? (
                                        <div
                                            className='login-wall__language-menu'
                                            role='menu'
                                        >
                                            {loginThemes.map((theme) => {
                                                const ThemeIcon = theme.icon;

                                                return (
                                                    <button
                                                        aria-checked={
                                                            theme.value ===
                                                            loginTheme
                                                        }
                                                        className='login-wall__language-option'
                                                        key={theme.value}
                                                        onClick={() => {
                                                            setLoginTheme(
                                                                theme.value
                                                            );
                                                            setIsThemeMenuOpen(
                                                                false
                                                            );
                                                        }}
                                                        role='menuitemradio'
                                                        type='button'
                                                    >
                                                        <span>
                                                            {theme.label}
                                                        </span>
                                                        {theme.value ===
                                                        loginTheme ? (
                                                            <Check
                                                                aria-hidden='true'
                                                                size={14}
                                                            />
                                                        ) : (
                                                            <ThemeIcon
                                                                aria-hidden='true'
                                                                size={14}
                                                            />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : undefined}
                                </div>
                            </div>
                            <button
                                className='login-wall__button login-wall__topbar-login'
                                onClick={connectGitHub}
                                type='button'
                            >
                                <span className='login-wall__github-icon-pad'>
                                    <GitHubMark className='login-wall__github-icon' />
                                </span>
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
                                    <span className='login-wall__github-icon-pad'>
                                        <GitHubMark className='login-wall__github-icon' />
                                    </span>
                                    <span>Connect GitHub</span>
                                    <ArrowRight aria-hidden='true' size={16} />
                                </button>

                                <div className='login-wall__benefits'>
                                    <article className='login-wall__feature login-wall__feature--mux'>
                                        <div className='login-wall__feature-copy'>
                                            <h2>
                                                One workspace for every repo.
                                            </h2>
                                            <p>
                                                Repomux connects your GitHub
                                                repositories and surfaces the
                                                scattered issues and PRs you
                                                need to work through.
                                            </p>
                                        </div>
                                        <div className='login-wall__feature-visual'>
                                            <svg
                                                aria-labelledby='mux-diagram-title'
                                                className='login-wall__mux-diagram'
                                                role='img'
                                                viewBox={`0 0 620 ${loginWallMuxLayout.viewBoxHeight}`}
                                            >
                                                <title id='mux-diagram-title'>
                                                    Multiple repositories
                                                    multiplexed into one Repomux
                                                    workspace
                                                </title>
                                                <path
                                                    className='login-wall__mux-line login-wall__mux-line--blue'
                                                    d={`M${loginWallMuxLayout.lineStartX} 86 C248 86 270 194 ${loginWallMuxLayout.lineEndX} ${loginWallMuxLayout.lineEndY}`}
                                                />
                                                <path
                                                    className='login-wall__mux-line login-wall__mux-line--red'
                                                    d={`M${loginWallMuxLayout.lineStartX} 198 C256 198 278 222 ${loginWallMuxLayout.lineEndX} ${loginWallMuxLayout.lineEndY}`}
                                                />
                                                <path
                                                    className='login-wall__mux-line login-wall__mux-line--yellow'
                                                    d={`M${loginWallMuxLayout.lineStartX} 310 C256 310 278 286 ${loginWallMuxLayout.lineEndX} ${loginWallMuxLayout.lineEndY}`}
                                                />
                                                <path
                                                    className='login-wall__mux-line login-wall__mux-line--green'
                                                    d={`M${loginWallMuxLayout.lineStartX} 422 C248 422 270 314 ${loginWallMuxLayout.lineEndX} ${loginWallMuxLayout.lineEndY}`}
                                                />
                                                <path
                                                    className='login-wall__mux-line login-wall__mux-line--pink'
                                                    d={`M${loginWallMuxLayout.hubLineStartX} 254 C424 254 448 254 ${loginWallMuxLayout.codexX} 254`}
                                                />
                                                {loginWallRepositoryNodes.map(
                                                    (
                                                        { name, owner },
                                                        index
                                                    ) => (
                                                        <g
                                                            className='login-wall__mux-repo'
                                                            key={name}
                                                            transform={`translate(${loginWallMuxLayout.repoX} ${loginWallMuxLayout.repoYStart + index * loginWallMuxLayout.repoYGap})`}
                                                        >
                                                            <rect
                                                                height={
                                                                    loginWallMuxLayout.repoHeight
                                                                }
                                                                rx='12'
                                                                width={
                                                                    loginWallMuxLayout.repoWidth
                                                                }
                                                            />
                                                            <BookMarked
                                                                aria-hidden='true'
                                                                size={22}
                                                                x={18}
                                                                y={30}
                                                            />
                                                            <text
                                                                className='login-wall__mux-repo-owner'
                                                                x='52'
                                                                y='33'
                                                            >
                                                                {owner}
                                                            </text>
                                                            <text
                                                                className='login-wall__mux-repo-name'
                                                                x='52'
                                                                y='58'
                                                            >
                                                                {name}
                                                            </text>
                                                        </g>
                                                    )
                                                )}
                                                <g className='login-wall__mux-hub'>
                                                    <foreignObject
                                                        height='96'
                                                        width='96'
                                                        x={
                                                            loginWallMuxLayout.hubX
                                                        }
                                                        y={
                                                            loginWallMuxLayout.hubY
                                                        }
                                                    >
                                                        <BrandLogo
                                                            alt=''
                                                            className='login-wall__mux-logo'
                                                        />
                                                    </foreignObject>
                                                </g>
                                                <g
                                                    className='login-wall__mux-output'
                                                    transform={`translate(${loginWallMuxLayout.codexX} ${loginWallMuxLayout.codexY})`}
                                                >
                                                    <foreignObject
                                                        height='64'
                                                        width='64'
                                                        x='0'
                                                        y='0'
                                                    >
                                                        <CodexMark
                                                            className='login-wall__mux-codex'
                                                            theme={loginTheme}
                                                        />
                                                    </foreignObject>
                                                </g>
                                            </svg>
                                        </div>
                                    </article>

                                    <article className='login-wall__feature login-wall__feature--queue'>
                                        <div className='login-wall__feature-copy'>
                                            <h2>One queue for active work.</h2>
                                            <p>
                                                See issues and PRs from active
                                                repos in one queue.
                                            </p>
                                        </div>
                                        <article
                                            aria-label='Repomux work queue UI'
                                            className='login-wall__app-preview'
                                        >
                                            <section className='work-panel login-wall__work-panel-preview'>
                                                <div className='custom-scrollbar work-panel__queue-scroll'>
                                                    <div className='queue-list'>
                                                        {loginWallQueueItems.map(
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
                                                                            {
                                                                                title
                                                                            }
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
                                                </div>
                                            </section>
                                        </article>
                                    </article>

                                    <article className='login-wall__feature login-wall__feature--prompt'>
                                        <div className='login-wall__feature-copy'>
                                            <h2>Add your prompt.</h2>
                                            <p>
                                                Write the handoff, send it to
                                                Codex, then step away.
                                            </p>
                                        </div>

                                        <div className='login-wall__prompt-stage'>
                                            <div className='login-wall__prompt-card'>
                                                <div className='login-wall__prompt-issue'>
                                                    <span className='login-wall__prompt-issue-label'>
                                                        GitHub issue #128
                                                    </span>
                                                    <span className='login-wall__prompt-issue-title'>
                                                        Polish landing page
                                                        benefit section
                                                    </span>
                                                </div>
                                                <div className='login-wall__prompt-editor'>
                                                    <div
                                                        aria-label='Animated prompt text'
                                                        className='prompt-input login-wall__prompt-preview'
                                                    >
                                                        {loginWallPromptLines.map(
                                                            (
                                                                {
                                                                    steps,
                                                                    text,
                                                                    width,
                                                                },
                                                                index
                                                            ) => (
                                                                <span
                                                                    className={`login-wall__typing-line login-wall__typing-line--${index + 1}`}
                                                                    key={text}
                                                                    style={
                                                                        {
                                                                            '--login-wall-line-width':
                                                                                width,
                                                                            '--login-wall-step-count':
                                                                                steps,
                                                                        } as CSSProperties
                                                                    }
                                                                >
                                                                    {text}
                                                                </span>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <section className='login-wall__bento-cell login-wall__bento-cell--automation'>
                                            <div className='login-wall__feature-copy'>
                                                <h2>
                                                    Let Codex pick up the work.
                                                </h2>
                                                <p>
                                                    Set up{' '}
                                                    <button
                                                        className='login-wall__automation-inline-cta'
                                                        onClick={() => {
                                                            setIsAutomationDialogOpen(
                                                                true
                                                            );
                                                        }}
                                                        type='button'
                                                    >
                                                        <Clock3
                                                            aria-hidden='true'
                                                            size={14}
                                                        />
                                                        <span>automation</span>
                                                    </button>{' '}
                                                    with a single prompt in
                                                    seconds.
                                                </p>
                                            </div>
                                        </section>

                                        <section className='login-wall__bento-cell login-wall__bento-cell--result'>
                                            <div className='login-wall__feature-copy'>
                                                <h2>Come back to PRs.</h2>
                                                <p>
                                                    Simply review, add follow-up
                                                    direction, or merge the PR
                                                    submitted by Codex.
                                                </p>
                                            </div>
                                            <div className='login-wall__result-stage'>
                                                <div className='queue-list login-wall__result-list'>
                                                    <div className='queue-row login-wall__pr-card'>
                                                        <span className='queue-row__type'>
                                                            <GitPullRequestArrow
                                                                aria-label='Pull request'
                                                                size={18}
                                                            />
                                                        </span>
                                                        <span className='queue-row__content'>
                                                            <span className='queue-row__title'>
                                                                Add user menu
                                                                pop up
                                                            </span>
                                                            <span className='queue-row__meta'>
                                                                <span className='queue-row__repo'>
                                                                    Hsiii/create-hsi-app
                                                                </span>
                                                                <span className='queue-row__number'>
                                                                    #72
                                                                </span>
                                                            </span>
                                                        </span>
                                                        <span className='readiness'>
                                                            <Check
                                                                aria-label='Codex ready'
                                                                size={18}
                                                            />
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </section>
                                    </article>
                                </div>
                            </div>
                        </section>
                    </div>

                    {isAutomationDialogOpen ? (
                        <div
                            className='login-wall__automation-dialog-backdrop'
                            onClick={() => {
                                setIsAutomationDialogOpen(false);
                            }}
                        >
                            <section
                                aria-labelledby='login-wall-automation-title'
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
                                            id='login-wall-automation-title'
                                        >
                                            Automation setup
                                        </h2>
                                        <p className='login-wall__automation-dialog-description'>
                                            Copy this once to let Codex set up
                                            the automation with your scope,
                                            paths, and schedule.
                                        </p>
                                    </div>
                                    <button
                                        aria-label='Close automation setup dialog'
                                        className='login-wall__automation-dialog-close'
                                        onClick={() => {
                                            setIsAutomationDialogOpen(false);
                                        }}
                                        type='button'
                                    >
                                        <X aria-hidden='true' size={18} />
                                    </button>
                                </div>

                                <div className='login-wall__automation-dialog-body'>
                                    <div className='login-wall__automation-prompt-card'>
                                        <div className='login-wall__automation-prompt-header'>
                                            <p className='login-wall__automation-prompt-title'>
                                                Copy into Codex
                                            </p>
                                            <button
                                                className='login-wall__automation-copy'
                                                onClick={
                                                    copyAutomationSetupPrompt
                                                }
                                                type='button'
                                            >
                                                <Copy
                                                    aria-hidden='true'
                                                    size={14}
                                                />
                                                <span>
                                                    {isAutomationPromptCopied
                                                        ? 'Copied'
                                                        : 'Copy prompt'}
                                                </span>
                                            </button>
                                        </div>
                                        <pre className='login-wall__automation-prompt'>
                                            {automationSetupPrompt}
                                        </pre>
                                    </div>
                                </div>
                            </section>
                        </div>
                    ) : undefined}
                </main>
            )}
        </>
    );
}
