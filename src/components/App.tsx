'use client';

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
    GitCommitHorizontal,
    GitFork,
    GitPullRequestArrow,
    Languages,
    ListTodo,
    Moon,
    Play,
    Settings,
    Sparkles,
    Sun,
    Workflow,
} from 'lucide-react';

import { useGitHubConnection } from '../hooks/use-github-connection';
import {
    assignToCodex,
    fetchAccessibleRepositories,
    fetchWorkItems,
} from '../lib/github';
import { mockRepositories, mockWorkItems } from '../lib/mock-data';
import {
    getStoredActiveRepositories,
    loadRepositories,
    setStoredActiveRepositories,
} from '../lib/repositories';
import { supabase } from '../lib/supabase';
import type { Repository, WorkItem } from '../types/app';
import { BrandLogo } from './BrandLogo';
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
            meta: 'Hsiii/repomux',
            number: 124,
            status: 'Prepared',
            title: 'Consider supporting Claude',
            type: 'issue',
        },
        {
            icon: GitPullRequestArrow,
            meta: 'Hsiii/repomux',
            number: 72,
            status: 'Assigned',
            title: 'Add user menu pop up',
            type: 'pr',
        },
    ] as const;
    const loginWallRepositoryNodes = [
        { branch: 'main', name: 'repomux', owner: 'Hsiii' },
        { branch: 'auth', name: 'create-hsi-app', owner: 'Hsiii' },
        { branch: 'docs', name: 'dotfiles', owner: 'Hsiii' },
        { branch: 'infra', name: 'agent-runtime', owner: 'Hsiii' },
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

                                {statusText === '' ? undefined : (
                                    <p className='login-wall__status'>
                                        {statusText}
                                    </p>
                                )}

                                <div className='login-wall__benefits'>
                                    <article className='login-wall__feature login-wall__feature--mux'>
                                        <div className='login-wall__feature-visual'>
                                            <svg
                                                aria-labelledby='mux-diagram-title'
                                                className='login-wall__mux-diagram'
                                                role='img'
                                                viewBox='0 0 620 360'
                                            >
                                                <title id='mux-diagram-title'>
                                                    Multiple repositories
                                                    multiplexed into one Repomux
                                                    workspace
                                                </title>
                                                <path
                                                    className='login-wall__mux-line login-wall__mux-line--blue'
                                                    d='M140 88 C220 88 224 168 304 168'
                                                />
                                                <path
                                                    className='login-wall__mux-line login-wall__mux-line--red'
                                                    d='M140 144 C220 144 224 176 304 176'
                                                />
                                                <path
                                                    className='login-wall__mux-line login-wall__mux-line--yellow'
                                                    d='M140 216 C220 216 224 184 304 184'
                                                />
                                                <path
                                                    className='login-wall__mux-line login-wall__mux-line--green'
                                                    d='M140 280 C220 280 224 192 304 192'
                                                />
                                                <path
                                                    className='login-wall__mux-line login-wall__mux-line--cyan'
                                                    d='M316 180 C392 180 400 104 480 104'
                                                />
                                                <path
                                                    className='login-wall__mux-line login-wall__mux-line--pink'
                                                    d='M316 180 C392 180 400 252 480 252'
                                                />
                                                {loginWallRepositoryNodes.map(
                                                    (
                                                        { branch, name, owner },
                                                        index
                                                    ) => (
                                                        <g
                                                            className='login-wall__mux-repo'
                                                            key={name}
                                                            transform={`translate(24 ${48 + index * 64})`}
                                                        >
                                                            <rect
                                                                height='48'
                                                                rx='8'
                                                                width='116'
                                                            />
                                                            <GitBranch
                                                                aria-hidden='true'
                                                                size={16}
                                                                x={12}
                                                                y={16}
                                                            />
                                                            <text
                                                                className='login-wall__mux-repo-owner'
                                                                x='36'
                                                                y='20'
                                                            >
                                                                {owner}
                                                            </text>
                                                            <text
                                                                className='login-wall__mux-repo-name'
                                                                x='36'
                                                                y='36'
                                                            >
                                                                {name}
                                                            </text>
                                                            <text
                                                                className='login-wall__mux-repo-branch'
                                                                x='12'
                                                                y='68'
                                                            >
                                                                {branch}
                                                            </text>
                                                        </g>
                                                    )
                                                )}
                                                <g className='login-wall__mux-hub'>
                                                    <rect
                                                        height='112'
                                                        rx='20'
                                                        width='112'
                                                        x='264'
                                                        y='124'
                                                    />
                                                    <foreignObject
                                                        height='64'
                                                        width='64'
                                                        x='288'
                                                        y='148'
                                                    >
                                                        <BrandLogo
                                                            alt=''
                                                            className='login-wall__mux-logo'
                                                        />
                                                    </foreignObject>
                                                    <text
                                                        className='login-wall__mux-hub-label'
                                                        textAnchor='middle'
                                                        x='320'
                                                        y='224'
                                                    >
                                                        Workspace
                                                    </text>
                                                </g>
                                                <g
                                                    className='login-wall__mux-output'
                                                    transform='translate(480 64)'
                                                >
                                                    <rect
                                                        height='80'
                                                        rx='12'
                                                        width='116'
                                                    />
                                                    <ListTodo
                                                        aria-hidden='true'
                                                        size={24}
                                                        x={46}
                                                        y={18}
                                                    />
                                                    <text x='58' y='60'>
                                                        Queue
                                                    </text>
                                                </g>
                                                <g
                                                    className='login-wall__mux-output'
                                                    transform='translate(480 212)'
                                                >
                                                    <rect
                                                        height='80'
                                                        rx='12'
                                                        width='116'
                                                    />
                                                    <GitPullRequestArrow
                                                        aria-hidden='true'
                                                        size={24}
                                                        x={46}
                                                        y={18}
                                                    />
                                                    <text x='58' y='60'>
                                                        PRs
                                                    </text>
                                                </g>
                                            </svg>
                                        </div>
                                        <div className='login-wall__feature-copy'>
                                            <p className='login-wall__feature-kicker'>
                                                Repository multiplexing
                                            </p>
                                            <h2>
                                                One workspace for every repo
                                                that needs attention.
                                            </h2>
                                            <p>
                                                Repomux connects your GitHub
                                                repositories, surfaces the
                                                scattered issues and PRs, and
                                                turns them into one queue you
                                                can hand to Codex.
                                            </p>
                                        </div>
                                    </article>

                                    <article className='login-wall__feature login-wall__feature--queue'>
                                        <div className='login-wall__feature-copy'>
                                            <p className='login-wall__feature-kicker'>
                                                See the queue
                                            </p>
                                            <h2>
                                                Stop context-switching across
                                                repository tabs.
                                            </h2>
                                            <p>
                                                The work queue keeps issues and
                                                pull requests from active repos
                                                side by side, with readiness
                                                visible before you open the
                                                detail pane.
                                            </p>
                                        </div>
                                        <article
                                            aria-label='Repomux work queue UI'
                                            className='login-wall__app-preview'
                                        >
                                            <div className='login-wall__product-topbar'>
                                                <div className='login-wall__window-controls'>
                                                    <span />
                                                    <span />
                                                    <span />
                                                </div>
                                                <span className='login-wall__product-title'>
                                                    repomux workspace
                                                </span>
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

                                                            <div className='custom-scrollbar repo-panel__scroll'>
                                                                <div className='repo-list repo-list--sidebar'>
                                                                    {loginWallRepositoryNodes
                                                                        .slice(
                                                                            0,
                                                                            3
                                                                        )
                                                                        .map(
                                                                            ({
                                                                                name,
                                                                                owner,
                                                                            }) => (
                                                                                <div
                                                                                    className={`repo-row${name === 'repomux' ? ' repo-row--selected' : ''}`}
                                                                                    key={
                                                                                        name
                                                                                    }
                                                                                >
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
                                                                                            {
                                                                                                owner
                                                                                            }
                                                                                        </span>
                                                                                        <span className='repo-row__slash'>
                                                                                            /
                                                                                        </span>
                                                                                        <span className='repo-row__name'>
                                                                                            {
                                                                                                name
                                                                                            }
                                                                                        </span>
                                                                                    </span>
                                                                                </div>
                                                                            )
                                                                        )}
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
                                                                    Hsi
                                                                </span>
                                                                <span className='repo-user-card__meta'>
                                                                    Hsiii
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
                                                                        key={
                                                                            title
                                                                        }
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
                                            </div>
                                        </article>
                                    </article>

                                    <article className='login-wall__feature login-wall__feature--prompt'>
                                        <div className='login-wall__feature-copy'>
                                            <p className='login-wall__feature-kicker'>
                                                Prompt the work
                                            </p>
                                            <h2>
                                                Add the intent Codex needs
                                                before automation touches
                                                GitHub.
                                            </h2>
                                            <p>
                                                Repomux turns a plain issue into
                                                a Codex-ready assignment by
                                                adding scope, constraints, and
                                                the label your automation
                                                watches.
                                            </p>
                                        </div>

                                        <div className='login-wall__prompt-stage'>
                                            <div className='login-wall__github-card'>
                                                <div className='login-wall__github-header'>
                                                    <GitHubMark className='login-wall__github-icon' />
                                                    <span>GitHub issue</span>
                                                    <span className='login-wall__issue-number'>
                                                        #128
                                                    </span>
                                                </div>
                                                <h3>
                                                    Polish landing page benefit
                                                    section
                                                </h3>
                                                <p>
                                                    Current section is too
                                                    generic. Show the queue,
                                                    prompt, automation, and PR
                                                    review flow.
                                                </p>
                                                <div className='login-wall__github-labels'>
                                                    <span className='login-wall__github-label'>
                                                        enhancement
                                                    </span>
                                                    <span className='login-wall__github-label login-wall__github-label--ready'>
                                                        codex-ready
                                                    </span>
                                                </div>
                                                <div className='login-wall__github-comment'>
                                                    <Sparkles
                                                        aria-hidden='true'
                                                        size={16}
                                                    />
                                                    <span>
                                                        Repomux prompt attached
                                                        scope, acceptance
                                                        criteria, and visual
                                                        reference.
                                                    </span>
                                                </div>
                                            </div>

                                            <div className='login-wall__prompt-card'>
                                                <label className='prompt-label'>
                                                    Prompt
                                                </label>
                                                <div
                                                    aria-label='Animated prompt text'
                                                    className='prompt-input login-wall__prompt-preview'
                                                >
                                                    <span className='login-wall__typing-line'>
                                                        Redesign the benefit
                                                        section around repo
                                                        multiplexing, queue
                                                        triage, Codex-ready
                                                        prompts, automation, and
                                                        PR review.
                                                    </span>
                                                </div>
                                                <div className='assign-button login-wall__assign-preview'>
                                                    <span>Assign to Codex</span>
                                                    <CircleArrowUp
                                                        aria-hidden='true'
                                                        size={24}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </article>

                                    <article className='login-wall__feature login-wall__feature--automation'>
                                        <div className='login-wall__feature-copy'>
                                            <p className='login-wall__feature-kicker'>
                                                Set up automation
                                            </p>
                                            <h2>
                                                Let Codex pick up prepared work
                                                while you are elsewhere.
                                            </h2>
                                            <p>
                                                The automation watches for the
                                                codex-ready label, reads the
                                                Repomux prompt, and starts a
                                                focused pass without another
                                                round of hand-holding.
                                            </p>
                                            <button
                                                className='login-wall__value-button'
                                                onClick={connectGitHub}
                                                type='button'
                                            >
                                                <span>Set up automation</span>
                                                <ArrowRight
                                                    aria-hidden='true'
                                                    size={16}
                                                />
                                            </button>
                                        </div>

                                        <div className='login-wall__automation-flow'>
                                            <div className='login-wall__automation-node'>
                                                <GitFork
                                                    aria-hidden='true'
                                                    size={24}
                                                />
                                                <span>GitHub repos</span>
                                            </div>
                                            <GitCommitHorizontal
                                                aria-hidden='true'
                                                className='login-wall__automation-arrow'
                                                size={28}
                                            />
                                            <div className='login-wall__automation-node login-wall__automation-node--active'>
                                                <Workflow
                                                    aria-hidden='true'
                                                    size={24}
                                                />
                                                <span>codex-ready</span>
                                            </div>
                                            <GitCommitHorizontal
                                                aria-hidden='true'
                                                className='login-wall__automation-arrow'
                                                size={28}
                                            />
                                            <div className='login-wall__automation-node'>
                                                <Bot
                                                    aria-hidden='true'
                                                    size={24}
                                                />
                                                <span>Codex</span>
                                            </div>
                                        </div>
                                    </article>

                                    <article className='login-wall__feature login-wall__feature--result'>
                                        <div className='login-wall__feature-copy'>
                                            <p className='login-wall__feature-kicker'>
                                                Review the result
                                            </p>
                                            <h2>
                                                Come back to a pull request, not
                                                another loose task.
                                            </h2>
                                            <p>
                                                Codex sends the result back as a
                                                PR tied to the prompt it saw, so
                                                you can review, add follow-up
                                                direction, or merge.
                                            </p>
                                        </div>
                                        <div className='login-wall__result-stage'>
                                            <div className='login-wall__codex-badge'>
                                                <Bot
                                                    aria-hidden='true'
                                                    size={18}
                                                />
                                                <span>Sent by Codex</span>
                                            </div>
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
                                                    <Play
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
        </>
    );
}
