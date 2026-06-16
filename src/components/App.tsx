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
    GitPullRequestArrow,
    Languages,
    Moon,
    Sun,
} from 'lucide-react';

import { useGitHubConnection } from '../hooks/use-github-connection';
import { useI18n } from '../hooks/use-i18n';
import {
    assignToCodex,
    fetchAccessibleRepositories,
    fetchWorkItems,
} from '../lib/github';
import type { WorkItem } from '../types/app';
import { AutomationSetupDialog } from './AutomationSetupDialog';
import { BrandLogo } from './BrandLogo';
import { CodexMark } from './CodexMark';
import { GitHubMark } from './GitHubMark';
import type { WorkFilter } from './RepositorySidebar';
import type { SortDirection, WorkSortKey } from './WorkPanel';
import { WorkPanel } from './WorkPanel';

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
] as const;

const loginWallFlowCanvas = {
    height: 2600,
    purplePath:
        'M 575 726 C 563 898 235 941 301 1077 C 311 1265 955 1388 914 1578 C 1086 1698 715 1434 913 1579 C 921 1829 52 2188 -260 2260 C -664 2360 -608 2540 -284 2540 C 116 2540 620 2552 829 2424',
    repoDots: [
        { x: 700, y: 227 },
        { x: 880, y: 229 },
        { x: 1060, y: 227 },
    ],
    repoPaths: [
        'M 700 227 C 700 371 577 438 575 566',
        'M 880 229 C 884 356 562 448 575 566',
        'M 1060 227 C 1060 371 576 449 575 562',
    ],
    width: 1248,
} as const;

export function App(): JSX.Element {
    const [repositorySearchQuery, setRepositorySearchQuery] = useState('');
    const [workFilter, setWorkFilter] = useState<WorkFilter>('all');
    const [workSortKey, setWorkSortKey] = useState<WorkSortKey>('repo-count');
    const [workSortDirection, setWorkSortDirection] =
        useState<SortDirection>('desc');
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
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
    const { t } = useI18n(loginLanguage);
    const loginBenefitsRef = useRef<HTMLDivElement>(null);
    const loginRepoRefs = useRef<Array<HTMLDivElement | undefined>>([]);
    const loginMuxNodeRef = useRef<HTMLDivElement>(null);
    const loginQueuePreviewRef = useRef<HTMLElement>(null);
    const loginPromptCardRef = useRef<HTMLDivElement>(null);
    const loginCodexNodeRef = useRef<HTMLDivElement>(null);
    const loginResultCardRef = useRef<HTMLDivElement>(null);
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
        enabled: isGitHubConnected && availableRepositories.length > 0,
        queryFn: async () => await fetchWorkItems(availableRepositories),
        queryKey: [
            'work-items',
            availableRepositories
                .map((repository) => repository.fullName)
                .toSorted()
                .join(','),
        ],
    });

    const workItems = workItemsQuery.data ?? [];

    const filteredWorkItems = useMemo(() => {
        const githubLogin = githubUser?.login;
        const repositoryCounts = new Map<string, number>();
        const repositoryNameMatches =
            repositorySearchQuery.trim() === ''
                ? undefined
                : new Set(
                      filteredRepositories.map(
                          (repository) => repository.fullName
                      )
                  );

        for (const item of workItems) {
            repositoryCounts.set(
                item.repo,
                (repositoryCounts.get(item.repo) ?? 0) + 1
            );
        }

        const nextItems = workItems.filter((item) => {
            if (
                repositoryNameMatches !== undefined &&
                !repositoryNameMatches.has(item.repo)
            ) {
                return false;
            }

            if (githubLogin === undefined || workFilter === 'all') {
                return true;
            }

            if (workFilter === 'assigned') {
                return item.assigneeLogins.includes(githubLogin);
            }

            return item.authorLogin === githubLogin;
        });

        return nextItems.toSorted((firstItem, secondItem) => {
            const direction = workSortDirection === 'asc' ? 1 : -1;
            let comparison: number;

            if (workSortKey === 'comments') {
                comparison = firstItem.commentsCount - secondItem.commentsCount;
            } else if (workSortKey === 'type') {
                comparison = firstItem.type.localeCompare(secondItem.type);
            } else {
                comparison =
                    (repositoryCounts.get(firstItem.repo) ?? 0) -
                    (repositoryCounts.get(secondItem.repo) ?? 0);
            }

            if (comparison !== 0) {
                return comparison * direction;
            }

            return firstItem.repo.localeCompare(secondItem.repo);
        });
    }, [
        filteredRepositories,
        githubUser?.login,
        repositorySearchQuery,
        workFilter,
        workItems,
        workSortDirection,
        workSortKey,
    ]);

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
        navigator.clipboard
            .writeText(t('automation.prompt'))
            .then(() => {
                setIsAutomationPromptCopied(true);
                setStatusMessage(t('status.automationCopied'));
            })
            .catch(() => {
                setStatusMessage(t('status.clipboardFailed'));
            });
    }

    function openAutomationSetupDialog() {
        setIsSettingsMenuOpen(false);
        setIsAutomationDialogOpen(true);
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
                    <WorkPanel
                        filteredRepositoriesCount={filteredRepositories.length}
                        filteredWorkItems={filteredWorkItems}
                        githubUser={githubUser}
                        hasGitHubError={githubSessionQuery.isError}
                        isAssigning={assignMutation.isPending}
                        isGitHubConnected={isGitHubConnected}
                        isSettingsMenuOpen={isSettingsMenuOpen}
                        isSortMenuOpen={isSortMenuOpen}
                        language={loginLanguage}
                        onAssign={() => {
                            assignMutation.mutate(undefined);
                        }}
                        onConnectGitHub={connectGitHub}
                        onDisconnectGitHub={disconnectGitHub}
                        onSelectItem={selectItem}
                        onSetLanguage={setLoginLanguage}
                        onSetupAutomation={openAutomationSetupDialog}
                        onToggleSettingsMenu={() => {
                            setIsSettingsMenuOpen((current) => !current);
                            setIsSortMenuOpen(false);
                        }}
                        onToggleSortMenu={() => {
                            setIsSortMenuOpen((current) => !current);
                            setIsSettingsMenuOpen(false);
                        }}
                        onToggleTheme={() => {
                            setLoginTheme((current) =>
                                current === 'dark' ? 'light' : 'dark'
                            );
                        }}
                        onUpdatePrompt={updatePrompt}
                        onUpdateRepositorySearchQuery={setRepositorySearchQuery}
                        onUpdateSort={(sortKey, direction) => {
                            setWorkSortKey(sortKey);
                            setWorkSortDirection(direction);
                            setIsSortMenuOpen(false);
                        }}
                        onUpdateWorkFilter={(filter) => {
                            setWorkFilter(filter);
                            setIsSettingsMenuOpen(false);
                        }}
                        repositorySearchQuery={repositorySearchQuery}
                        selectedItem={selectedItem}
                        selectedPrompt={selectedPrompt}
                        statusText={statusText}
                        theme={loginTheme}
                        workFilter={workFilter}
                        workSortDirection={workSortDirection}
                        workSortKey={workSortKey}
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

                                <div
                                    className='login-wall__benefits'
                                    ref={loginBenefitsRef}
                                >
                                    <svg
                                        aria-hidden='true'
                                        className='login-wall__flow-lines'
                                        height={loginWallFlowCanvas.height}
                                        preserveAspectRatio='none'
                                        viewBox={`0 0 ${loginWallFlowCanvas.width} ${loginWallFlowCanvas.height}`}
                                        width={loginWallFlowCanvas.width}
                                    >
                                        {loginWallFlowCanvas.repoPaths.map(
                                            (path, index) => (
                                                <path
                                                    className={`login-wall__flow-line login-wall__flow-line--repo login-wall__flow-line--repo-${index + 1}`}
                                                    d={path}
                                                    key={path}
                                                    pathLength='1'
                                                />
                                            )
                                        )}
                                        <path
                                            className='login-wall__flow-line login-wall__flow-line--purple'
                                            d={loginWallFlowCanvas.purplePath}
                                            pathLength='1'
                                        />
                                        {loginWallFlowCanvas.repoDots.map(
                                            ({ x, y }, index) => (
                                                <circle
                                                    className='login-wall__flow-dot'
                                                    cx={x}
                                                    cy={y}
                                                    key={`${x}-${y}-${index}`}
                                                    r='5'
                                                />
                                            )
                                        )}
                                    </svg>
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
                                            <div
                                                aria-label='Three repositories flowing into Repomux'
                                                className='login-wall__repo-flow'
                                            >
                                                <div className='login-wall__repo-row'>
                                                    {loginWallRepositoryNodes.map(
                                                        (
                                                            { name, owner },
                                                            index
                                                        ) => (
                                                            <div
                                                                className='login-wall__mux-repo'
                                                                key={name}
                                                                ref={(
                                                                    element
                                                                ) => {
                                                                    loginRepoRefs.current[
                                                                        index
                                                                    ] =
                                                                        element ??
                                                                        undefined;
                                                                }}
                                                            >
                                                                <BookMarked
                                                                    aria-hidden='true'
                                                                    size={18}
                                                                />
                                                                <span>
                                                                    {owner}
                                                                </span>
                                                                <strong>
                                                                    {name}
                                                                </strong>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </article>

                                    <div
                                        className='login-wall__flow-mux-node'
                                        ref={loginMuxNodeRef}
                                    >
                                        <BrandLogo
                                            alt='Repomux'
                                            className='login-wall__flow-mux-logo'
                                        />
                                    </div>

                                    <article className='login-wall__feature login-wall__feature--queue'>
                                        <article
                                            aria-label='Repomux work queue UI'
                                            className='login-wall__app-preview'
                                        >
                                            <section
                                                className='work-panel login-wall__work-panel-preview'
                                                ref={loginQueuePreviewRef}
                                            >
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
                                        <div className='login-wall__feature-copy'>
                                            <h2>One queue for active work.</h2>
                                            <p>Check work items at a glance.</p>
                                        </div>
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
                                            <div
                                                className='login-wall__prompt-card'
                                                ref={loginPromptCardRef}
                                            >
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
                                                <h2 className='login-wall__feature-heading--nowrap'>
                                                    Let Codex pick it up
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

                                        <div
                                            aria-hidden='true'
                                            className='login-wall__codex-node'
                                            ref={loginCodexNodeRef}
                                        >
                                            <CodexMark
                                                className='login-wall__mux-codex'
                                                theme={loginTheme}
                                            />
                                        </div>
                                    </article>

                                    <article className='login-wall__feature login-wall__feature--result'>
                                        <div className='login-wall__feature-copy'>
                                            <h2 className='login-wall__feature-heading--nowrap'>
                                                Come back to PRs.
                                            </h2>
                                            <p>
                                                Simply review the PRs submitted
                                                by Codex, no need to leave the
                                                dashboard.
                                            </p>
                                        </div>
                                        <div className='login-wall__result-stage'>
                                            <div className='queue-list login-wall__result-list'>
                                                <div
                                                    className='queue-row login-wall__pr-card'
                                                    ref={loginResultCardRef}
                                                >
                                                    <span className='queue-row__type'>
                                                        <GitPullRequestArrow
                                                            aria-label='Pull request'
                                                            size={18}
                                                        />
                                                    </span>
                                                    <span className='queue-row__content'>
                                                        <span className='queue-row__title'>
                                                            Add user menu pop up
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
                                    </article>
                                </div>
                            </div>
                        </section>
                    </div>
                </main>
            )}
            {isAutomationDialogOpen ? (
                <AutomationSetupDialog
                    isPromptCopied={isAutomationPromptCopied}
                    language={loginLanguage}
                    onClose={() => {
                        setIsAutomationDialogOpen(false);
                    }}
                    onCopyPrompt={copyAutomationSetupPrompt}
                    theme={loginTheme}
                />
            ) : undefined}
        </>
    );
}
