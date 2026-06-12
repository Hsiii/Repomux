'use client';

import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
    ArrowRight,
    Check,
    ChevronDown,
    CircleArrowUp,
    CircleDot,
    ExternalLink,
    GitBranch,
    GitPullRequestArrow,
    Languages,
    ListTodo,
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
                        githubUser={githubUser}
                        hasGitHubError={githubSessionQuery.isError}
                        isGitHubConnected={isGitHubConnected}
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
                                                                height='56'
                                                                rx='8'
                                                                width='132'
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
                                                                y='38'
                                                            >
                                                                {name}
                                                            </text>
                                                            <text
                                                                className='login-wall__mux-repo-branch'
                                                                x='12'
                                                                y='50'
                                                            >
                                                                {branch}
                                                            </text>
                                                        </g>
                                                    )
                                                )}
                                                <g className='login-wall__mux-hub'>
                                                    <rect
                                                        height='120'
                                                        rx='20'
                                                        width='120'
                                                        x='258'
                                                        y='120'
                                                    />
                                                    <foreignObject
                                                        height='48'
                                                        width='48'
                                                        x='294'
                                                        y='144'
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
                                                        y='216'
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
                                                        <span className='login-wall__typing-line'>
                                                            Redesign the benefit
                                                            section around repo
                                                            multiplexing, queue
                                                            triage, Codex-ready
                                                            prompts, automation,
                                                            and PR review.
                                                        </span>
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

                                        <div className='login-wall__automation-stage'>
                                            <div className='login-wall__automation-stage-head'>
                                                <span className='login-wall__automation-stage-label'>
                                                    Automation rule
                                                </span>
                                                <span className='login-wall__automation-stage-value'>
                                                    When an item becomes
                                                    codex-ready
                                                </span>
                                            </div>
                                            <div className='login-wall__automation-list'>
                                                <div className='login-wall__automation-step login-wall__automation-step--active'>
                                                    <span className='login-wall__automation-step-index'>
                                                        01
                                                    </span>
                                                    <div>
                                                        <h3>Read the issue</h3>
                                                        <p>
                                                            Capture scope,
                                                            acceptance criteria,
                                                            and repo context.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className='login-wall__automation-step'>
                                                    <span className='login-wall__automation-step-index'>
                                                        02
                                                    </span>
                                                    <div>
                                                        <h3>
                                                            Pick up the prompt
                                                        </h3>
                                                        <p>
                                                            Use the Repomux
                                                            prompt as the exact
                                                            handoff to Codex.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className='login-wall__automation-step'>
                                                    <span className='login-wall__automation-step-index'>
                                                        03
                                                    </span>
                                                    <div>
                                                        <h3>Start the pass</h3>
                                                        <p>
                                                            Run asynchronously
                                                            and return with a PR
                                                            for review.
                                                        </p>
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
                                                Codex sends the result back as a
                                                PR tied to the prompt it saw, so
                                                you can review, add follow-up
                                                direction, or merge.
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
        </>
    );
}
