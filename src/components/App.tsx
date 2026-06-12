'use client';

import type { CSSProperties, JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
    ArrowRight,
    BookMarked,
    Check,
    ChevronDown,
    CircleArrowUp,
    CircleDot,
    ExternalLink,
    GitPullRequestArrow,
    Languages,
    Moon,
    Sun,
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
    const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
    const [isAutomationDialogOpen, setIsAutomationDialogOpen] = useState(false);
    const [hasAutomationReminder, setHasAutomationReminder] = useState(false);

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
    const loginLanguages = [
        { label: 'English', shortLabel: 'EN', value: 'en' },
        { label: 'Chinese', shortLabel: 'ZH', value: 'zh' },
    ] as const;
    const selectedLoginLanguage =
        loginLanguages.find((language) => language.value === loginLanguage) ??
        loginLanguages[0];
    function openAutomationDialog() {
        setIsSettingsMenuOpen(false);
        setIsAutomationDialogOpen(true);
    }

    function dismissAutomationDialog() {
        setHasAutomationReminder(true);
        setIsAutomationDialogOpen(false);
    }

    function setupAutomation() {
        if (!isGitHubConnected) {
            setHasAutomationReminder(true);
            setIsAutomationDialogOpen(false);
            connectGitHub();
            return;
        }

        setStatusMessage(
            'Automation setup starts from the Codex-ready GitHub automation prompt.'
        );
        setIsSettingsMenuOpen(false);
        setHasAutomationReminder(false);
        setIsAutomationDialogOpen(false);
    }

    return (
        <>
            {isGitHubConnected ? (
                <main className={`app-shell app-shell--${loginTheme}`}>
                    <RepositorySidebar
                        filteredRepositories={filteredRepositories}
                        githubUser={githubUser}
                        hasAutomationReminder={hasAutomationReminder}
                        hasGitHubError={githubSessionQuery.isError}
                        isGitHubConnected={isGitHubConnected}
                        isSettingsMenuOpen={isSettingsMenuOpen}
                        language={loginLanguage}
                        onConnectGitHub={connectGitHub}
                        onDisconnectGitHub={disconnectGitHub}
                        onSelectRepository={selectRepository}
                        onSetLanguage={setLoginLanguage}
                        onSetupAutomation={openAutomationDialog}
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
                                        <div className='login-wall__feature-visual'>
                                            <svg
                                                aria-labelledby='mux-diagram-title'
                                                className='login-wall__mux-diagram'
                                                role='img'
                                                viewBox='0 0 620 400'
                                            >
                                                <title id='mux-diagram-title'>
                                                    Multiple repositories
                                                    multiplexed into one Repomux
                                                    workspace
                                                </title>
                                                <path
                                                    className='login-wall__mux-line login-wall__mux-line--blue'
                                                    d='M140 88 C208 88 230 160 270 200'
                                                />
                                                <path
                                                    className='login-wall__mux-line login-wall__mux-line--red'
                                                    d='M140 144 C214 144 234 176 270 200'
                                                />
                                                <path
                                                    className='login-wall__mux-line login-wall__mux-line--yellow'
                                                    d='M140 216 C214 216 234 224 270 200'
                                                />
                                                <path
                                                    className='login-wall__mux-line login-wall__mux-line--green'
                                                    d='M140 280 C208 280 230 240 270 200'
                                                />
                                                <path
                                                    className='login-wall__mux-line login-wall__mux-line--pink'
                                                    d='M356 200 C404 200 414 132 472 132'
                                                />
                                                {loginWallRepositoryNodes.map(
                                                    (
                                                        { name, owner },
                                                        index
                                                    ) => (
                                                        <g
                                                            className='login-wall__mux-repo'
                                                            key={name}
                                                            transform={`translate(20 ${44 + index * 72})`}
                                                        >
                                                            <rect
                                                                height='60'
                                                                rx='12'
                                                                width='156'
                                                            />
                                                            <BookMarked
                                                                aria-hidden='true'
                                                                size={18}
                                                                x={16}
                                                                y={18}
                                                            />
                                                            <text
                                                                className='login-wall__mux-repo-owner'
                                                                x='44'
                                                                y='24'
                                                            >
                                                                {owner}
                                                            </text>
                                                            <text
                                                                className='login-wall__mux-repo-name'
                                                                x='44'
                                                                y='42'
                                                            >
                                                                {name}
                                                            </text>
                                                        </g>
                                                    )
                                                )}
                                                <g className='login-wall__mux-hub'>
                                                    <foreignObject
                                                        height='80'
                                                        width='80'
                                                        x='270'
                                                        y='160'
                                                    >
                                                        <BrandLogo
                                                            alt=''
                                                            className='login-wall__mux-logo'
                                                        />
                                                    </foreignObject>
                                                </g>
                                                <g
                                                    className='login-wall__mux-output'
                                                    transform='translate(472 92)'
                                                >
                                                    <rect
                                                        height='72'
                                                        rx='12'
                                                        width='116'
                                                    />
                                                    <foreignObject
                                                        height='32'
                                                        width='32'
                                                        x='16'
                                                        y='20'
                                                    >
                                                        <CodexMark
                                                            className='login-wall__mux-codex'
                                                            theme={loginTheme}
                                                        />
                                                    </foreignObject>
                                                    <text x='62' y='44'>
                                                        Codex
                                                    </text>
                                                </g>
                                            </svg>
                                        </div>
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
                                    </article>

                                    <article className='login-wall__feature login-wall__feature--queue'>
                                        <div className='login-wall__feature-copy'>
                                            <h2>
                                                Stop context-switching across
                                                repository tabs.
                                            </h2>
                                            <p>
                                                See issues and PRs from active
                                                repos in one queue before you
                                                dive into the detail pane.
                                            </p>
                                        </div>
                                        <article
                                            aria-label='Repomux work queue UI'
                                            className='login-wall__app-preview'
                                        >
                                            <section className='work-panel login-wall__work-panel-preview'>
                                                <div className='work-panel__header'>
                                                    <h2 className='work-title'>
                                                        Work queue
                                                    </h2>
                                                    <span className='work-subtitle'>
                                                        3 active items
                                                    </span>
                                                </div>

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
                                            <h2>Add the prompt.</h2>
                                            <p>
                                                Write the handoff the same way
                                                you would in Codex: what to
                                                change, what to keep, and what a
                                                good result looks like.
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
                                            </div>
                                        </div>
                                    </article>

                                    <article className='login-wall__feature login-wall__feature--automation'>
                                        <div className='login-wall__feature-copy'>
                                            <h2>Let Codex pick up the work.</h2>
                                            <p>
                                                When an item is codex-ready,
                                                automation picks up the prompt
                                                and starts the pass.
                                            </p>
                                            <button
                                                className='login-wall__value-button'
                                                onClick={openAutomationDialog}
                                                type='button'
                                            >
                                                <span>Set up automation</span>
                                                <ArrowRight
                                                    aria-hidden='true'
                                                    size={16}
                                                />
                                            </button>
                                        </div>

                                        <div className='login-wall__automation-stage'>
                                            <div className='login-wall__automation-graphic'>
                                                <div className='login-wall__automation-stage-head'>
                                                    <span className='login-wall__automation-stage-label'>
                                                        Automation rule
                                                    </span>
                                                    <span className='login-wall__automation-stage-value'>
                                                        Start a Codex pass when
                                                        an item becomes
                                                        codex-ready
                                                    </span>
                                                    <p className='login-wall__automation-stage-copy'>
                                                        Repomux keeps the issue,
                                                        prompt, and result
                                                        connected so the handoff
                                                        stays clear.
                                                    </p>
                                                </div>
                                                <div className='login-wall__automation-flow'>
                                                    <div className='login-wall__automation-issue'>
                                                        <span className='login-wall__automation-kicker'>
                                                            Issue
                                                        </span>
                                                        <strong>
                                                            Support Claude in
                                                            comux
                                                        </strong>
                                                        <span className='login-wall__automation-chip'>
                                                            codex-ready
                                                        </span>
                                                    </div>
                                                    <div className='login-wall__automation-rail' />
                                                    <div className='login-wall__automation-codex'>
                                                        <CodexMark
                                                            className='login-wall__automation-codex-mark'
                                                            theme={loginTheme}
                                                        />
                                                        <span>Codex</span>
                                                    </div>
                                                    <div className='login-wall__automation-rail login-wall__automation-rail--result' />
                                                    <div className='login-wall__automation-outcome'>
                                                        <span className='login-wall__automation-outcome-label'>
                                                            Result
                                                        </span>
                                                        <strong className='login-wall__automation-outcome-value'>
                                                            Review-ready PR
                                                            linked back to the
                                                            issue.
                                                        </strong>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </article>

                                    <article className='login-wall__feature login-wall__feature--result'>
                                        <div className='login-wall__feature-copy'>
                                            <h2>
                                                Come back to a pull request.
                                            </h2>
                                            <p>
                                                Simply review, add follow-up
                                                direction, or merge the PR
                                                submitted by Codex.
                                            </p>
                                        </div>
                                        <div className='login-wall__result-stage'>
                                            <div className='login-wall__pr-card'>
                                                <div className='login-wall__pr-icon'>
                                                    <GitPullRequestArrow
                                                        aria-hidden='true'
                                                        size={24}
                                                    />
                                                </div>
                                                <div className='login-wall__pr-copy'>
                                                    <h3>
                                                        Redesign landing benefit
                                                        section
                                                    </h3>
                                                    <p>
                                                        Hsiii/repomux #129
                                                        opened from issue #128
                                                    </p>
                                                    <span>
                                                        Uses your prompt:
                                                        multiplexing, queue,
                                                        automation, PR review.
                                                    </span>
                                                </div>
                                                <button
                                                    className='login-wall__pr-button'
                                                    type='button'
                                                >
                                                    <ExternalLink
                                                        aria-hidden='true'
                                                        size={14}
                                                    />
                                                    Review
                                                </button>
                                            </div>
                                        </div>
                                    </article>
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
                                    <GitHubMark className='login-wall__github-icon' />
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
            {isAutomationDialogOpen ? (
                <div
                    aria-labelledby='automation-dialog-title'
                    className='modal-backdrop'
                    role='presentation'
                >
                    <div
                        aria-describedby='automation-dialog-description'
                        aria-modal='true'
                        className='modal-card login-wall__automation-dialog'
                        role='dialog'
                    >
                        <div className='modal-header'>
                            <div>
                                <h2
                                    className='modal-title'
                                    id='automation-dialog-title'
                                >
                                    Set up automation after login
                                </h2>
                                <p
                                    className='modal-description'
                                    id='automation-dialog-description'
                                >
                                    Connect GitHub, then open Settings to finish
                                    the Codex-ready automation handoff.
                                </p>
                            </div>
                        </div>
                        <div className='login-wall__automation-dialog-actions'>
                            <button
                                className='repo-user-card__button login-wall__automation-dialog-dismiss'
                                onClick={dismissAutomationDialog}
                                type='button'
                            >
                                Remind me later
                            </button>
                            <button
                                className='modal-primary-button'
                                onClick={setupAutomation}
                                type='button'
                            >
                                {isGitHubConnected
                                    ? 'Open automation setup'
                                    : 'Connect GitHub'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : undefined}
        </>
    );
}
