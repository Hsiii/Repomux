import type { JSX } from 'react';
import {
    ArrowLeft,
    Bot,
    Check,
    ChevronDown,
    CircleArrowUp,
    CircleDot,
    GitPullRequestArrow,
    Languages,
    ListFilter,
    LogOut,
    MessageSquare,
    Moon,
    Search,
    Settings,
    Sun,
} from 'lucide-react';

import type { GitHubUser, WorkItem } from '../types/app';
import type { WorkFilter } from './RepositorySidebar';

export type SortDirection = 'asc' | 'desc';
export type WorkSortKey = 'repo-count' | 'type' | 'comments';

interface WorkPanelProps {
    filteredRepositoriesCount: number;
    filteredWorkItems: readonly WorkItem[];
    githubUser: GitHubUser | undefined;
    hasGitHubError: boolean;
    isAutomationPromptCopied: boolean;
    isGitHubConnected: boolean;
    isAssigning: boolean;
    isSettingsMenuOpen: boolean;
    isSortMenuOpen: boolean;
    language: string;
    onAssign: () => void;
    onConnectGitHub: () => void;
    onDisconnectGitHub: () => void;
    onSetLanguage: (language: string) => void;
    onSetupAutomation: () => void;
    onSelectItem: (item: Readonly<WorkItem> | undefined) => void;
    onToggleSettingsMenu: () => void;
    onToggleSortMenu: () => void;
    onToggleTheme: () => void;
    onUpdatePrompt: (value: string) => void;
    onUpdateRepositorySearchQuery: (value: string) => void;
    onUpdateSort: (sortKey: WorkSortKey, direction: SortDirection) => void;
    onUpdateWorkFilter: (filter: WorkFilter) => void;
    repositorySearchQuery: string;
    selectedItem: Readonly<WorkItem> | undefined;
    selectedPrompt: string;
    statusText: string;
    theme: 'dark' | 'light';
    workFilter: WorkFilter;
    workSortDirection: SortDirection;
    workSortKey: WorkSortKey;
}

const sortOptions = [
    { label: 'Repository work count', value: 'repo-count' },
    { label: 'Work item type', value: 'type' },
    { label: 'Comments', value: 'comments' },
] as const;

const sortDirectionOptions = [
    { label: 'Descending', value: 'desc' },
    { label: 'Ascending', value: 'asc' },
] as const;

const workFilterOptions = [
    { label: 'Assigned to me', value: 'assigned' },
    { label: 'Include unassigned', value: 'assigned-or-unassigned' },
    { label: 'All work', value: 'all' },
] as const;

const languageOptions = [
    { label: 'English', value: 'en' },
    { label: 'Chinese', value: 'zh' },
] as const;

function renderGitHubDisplayName(githubUser: GitHubUser | undefined) {
    if (githubUser?.login === undefined) {
        return 'GitHub';
    }

    if (
        githubUser.name !== undefined &&
        githubUser.name !== null &&
        githubUser.name !== '' &&
        githubUser.name !== githubUser.login
    ) {
        return githubUser.name;
    }

    return githubUser.login;
}

function renderGitHubMeta(
    githubUser: GitHubUser | undefined,
    hasGitHubError: boolean
) {
    if (hasGitHubError) {
        return 'Auth needs attention';
    }

    if (githubUser?.login === undefined) {
        return 'Connected';
    }

    return githubUser.login;
}

function WorkQueueRow(props: {
    item: Readonly<WorkItem>;
    onSelectItem: (item: Readonly<WorkItem>) => void;
}): JSX.Element {
    const { item, onSelectItem } = props;

    return (
        <button
            className='queue-row'
            onClick={() => {
                onSelectItem(item);
            }}
            type='button'
        >
            <span className='queue-row__type'>
                {item.type === 'issue' ? (
                    <CircleDot aria-label='Issue' size={18} />
                ) : (
                    <GitPullRequestArrow aria-label='Pull request' size={18} />
                )}
            </span>
            <span className='queue-row__content'>
                <span className='queue-row__title'>{item.title}</span>
                <span className='queue-row__meta'>
                    <span className='queue-row__repo'>{item.repo}</span>
                    <span className='queue-row__number'>#{item.number}</span>
                </span>
            </span>
            <span className='queue-row__comments'>
                {item.commentsCount > 0 ? (
                    <>
                        <MessageSquare aria-hidden='true' size={16} />
                        <span>{item.commentsCount}</span>
                    </>
                ) : undefined}
            </span>
            <span className='readiness'>
                {item.codexReady ? (
                    <Check aria-label='Codex ready' size={18} />
                ) : (
                    <span
                        aria-label='Not codex ready'
                        className='readiness__empty'
                    />
                )}
            </span>
        </button>
    );
}

function WorkQueue(props: {
    filteredRepositoriesCount: number;
    filteredWorkItems: readonly WorkItem[];
    githubUser: GitHubUser | undefined;
    hasGitHubError: boolean;
    isAutomationPromptCopied: boolean;
    isGitHubConnected: boolean;
    isSettingsMenuOpen: boolean;
    isSortMenuOpen: boolean;
    language: string;
    onConnectGitHub: () => void;
    onDisconnectGitHub: () => void;
    onSetLanguage: (language: string) => void;
    onSetupAutomation: () => void;
    onSelectItem: (item: Readonly<WorkItem>) => void;
    onToggleSettingsMenu: () => void;
    onToggleSortMenu: () => void;
    onToggleTheme: () => void;
    onUpdateRepositorySearchQuery: (value: string) => void;
    onUpdateSort: (sortKey: WorkSortKey, direction: SortDirection) => void;
    onUpdateWorkFilter: (filter: WorkFilter) => void;
    repositorySearchQuery: string;
    theme: 'dark' | 'light';
    workFilter: WorkFilter;
    workSortDirection: SortDirection;
    workSortKey: WorkSortKey;
}): JSX.Element {
    const {
        filteredRepositoriesCount,
        filteredWorkItems,
        githubUser,
        hasGitHubError,
        isAutomationPromptCopied,
        isGitHubConnected,
        isSettingsMenuOpen,
        isSortMenuOpen,
        language,
        onConnectGitHub,
        onDisconnectGitHub,
        onSelectItem,
        onSetLanguage,
        onSetupAutomation,
        onToggleSettingsMenu,
        onToggleSortMenu,
        onToggleTheme,
        onUpdateRepositorySearchQuery,
        onUpdateSort,
        onUpdateWorkFilter,
        repositorySearchQuery,
        theme,
        workFilter,
        workSortDirection,
        workSortKey,
    } = props;
    const selectedSortOption =
        sortOptions.find((option) => option.value === workSortKey) ??
        sortOptions[0];

    return (
        <>
            <div className='work-panel__header'>
                <h2 className='work-title'>Work queue</h2>
                <div className='work-panel__account'>
                    {githubUser?.avatar_url === undefined ? (
                        <span aria-hidden='true' className='account-avatar'>
                            GH
                        </span>
                    ) : (
                        <img
                            alt=''
                            className='account-avatar'
                            src={githubUser.avatar_url}
                        />
                    )}
                    {isGitHubConnected ? (
                        <>
                            <div className='account-main'>
                                <span className='account-name'>
                                    {renderGitHubDisplayName(githubUser)}
                                </span>
                                <span className='account-meta'>
                                    {renderGitHubMeta(
                                        githubUser,
                                        hasGitHubError
                                    )}
                                </span>
                            </div>
                            <button
                                aria-expanded={isSettingsMenuOpen}
                                aria-haspopup='menu'
                                aria-label='Open settings'
                                className='icon-button'
                                onClick={onToggleSettingsMenu}
                                type='button'
                            >
                                <Settings aria-hidden='true' size={18} />
                            </button>
                            {isSettingsMenuOpen ? (
                                <div className='settings-menu' role='menu'>
                                    <button
                                        className='settings-menu__item'
                                        onClick={onSetupAutomation}
                                        role='menuitem'
                                        type='button'
                                    >
                                        <Bot aria-hidden='true' size={16} />
                                        <span>
                                            {isAutomationPromptCopied
                                                ? 'Prompt copied'
                                                : 'Copy setup prompt'}
                                        </span>
                                    </button>

                                    <div className='settings-menu__group'>
                                        <span className='settings-menu__label'>
                                            Queue filter
                                        </span>
                                        {workFilterOptions.map((option) => (
                                            <button
                                                aria-checked={
                                                    option.value === workFilter
                                                }
                                                className='settings-menu__item'
                                                key={option.value}
                                                onClick={() => {
                                                    onUpdateWorkFilter(
                                                        option.value
                                                    );
                                                }}
                                                role='menuitemradio'
                                                type='button'
                                            >
                                                <span>{option.label}</span>
                                                {option.value === workFilter ? (
                                                    <Check
                                                        aria-hidden='true'
                                                        size={14}
                                                    />
                                                ) : undefined}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        className='settings-menu__item'
                                        onClick={onToggleTheme}
                                        role='menuitem'
                                        type='button'
                                    >
                                        {theme === 'dark' ? (
                                            <Sun aria-hidden='true' size={16} />
                                        ) : (
                                            <Moon
                                                aria-hidden='true'
                                                size={16}
                                            />
                                        )}
                                        <span>
                                            {theme === 'dark'
                                                ? 'Light mode'
                                                : 'Dark mode'}
                                        </span>
                                    </button>

                                    <div className='settings-menu__group'>
                                        <span className='settings-menu__label'>
                                            Language
                                        </span>
                                        {languageOptions.map((option) => (
                                            <button
                                                aria-checked={
                                                    option.value === language
                                                }
                                                className='settings-menu__item'
                                                key={option.value}
                                                onClick={() => {
                                                    onSetLanguage(option.value);
                                                }}
                                                role='menuitemradio'
                                                type='button'
                                            >
                                                <Languages
                                                    aria-hidden='true'
                                                    size={16}
                                                />
                                                <span>{option.label}</span>
                                                {option.value === language ? (
                                                    <Check
                                                        aria-hidden='true'
                                                        size={14}
                                                    />
                                                ) : undefined}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        className='settings-menu__item'
                                        onClick={onDisconnectGitHub}
                                        role='menuitem'
                                        type='button'
                                    >
                                        <LogOut aria-hidden='true' size={16} />
                                        <span>Log out</span>
                                    </button>
                                </div>
                            ) : undefined}
                        </>
                    ) : (
                        <button
                            className='account-connect'
                            onClick={onConnectGitHub}
                            type='button'
                        >
                            Connect
                        </button>
                    )}
                </div>
            </div>

            <div className='work-panel__toolbar'>
                <label className='repo-filter'>
                    <Search aria-hidden='true' size={16} />
                    <span className='sr-only'>Filter repositories</span>
                    <input
                        aria-label='Filter repositories'
                        onChange={(event) => {
                            onUpdateRepositorySearchQuery(event.target.value);
                        }}
                        placeholder='Filter by repo'
                        type='search'
                        value={repositorySearchQuery}
                    />
                </label>

                <span className='work-panel__count'>
                    {filteredWorkItems.length} work items in{' '}
                    {filteredRepositoriesCount} repos
                </span>

                <div className='sort-menu'>
                    <button
                        aria-expanded={isSortMenuOpen}
                        aria-haspopup='menu'
                        className='sort-menu__trigger'
                        onClick={onToggleSortMenu}
                        type='button'
                    >
                        <ListFilter aria-hidden='true' size={16} />
                        <span>{selectedSortOption.label}</span>
                        <span className='sort-menu__direction'>
                            {workSortDirection === 'desc'
                                ? 'descending'
                                : 'ascending'}
                        </span>
                        <ChevronDown aria-hidden='true' size={14} />
                    </button>

                    {isSortMenuOpen ? (
                        <div className='sort-menu__content' role='menu'>
                            <div className='settings-menu__group'>
                                <span className='settings-menu__label'>
                                    Sort by
                                </span>
                                {sortOptions.map((option) => (
                                    <button
                                        aria-checked={
                                            option.value === workSortKey
                                        }
                                        className='settings-menu__item'
                                        key={option.value}
                                        onClick={() => {
                                            onUpdateSort(
                                                option.value,
                                                workSortDirection
                                            );
                                        }}
                                        role='menuitemradio'
                                        type='button'
                                    >
                                        <span>{option.label}</span>
                                        {option.value === workSortKey ? (
                                            <Check
                                                aria-hidden='true'
                                                size={14}
                                            />
                                        ) : undefined}
                                    </button>
                                ))}
                            </div>

                            <div className='settings-menu__group'>
                                <span className='settings-menu__label'>
                                    Direction
                                </span>
                                {sortDirectionOptions.map((option) => (
                                    <button
                                        aria-checked={
                                            option.value === workSortDirection
                                        }
                                        className='settings-menu__item'
                                        key={option.value}
                                        onClick={() => {
                                            onUpdateSort(
                                                workSortKey,
                                                option.value
                                            );
                                        }}
                                        role='menuitemradio'
                                        type='button'
                                    >
                                        <span>{option.label}</span>
                                        {option.value === workSortDirection ? (
                                            <Check
                                                aria-hidden='true'
                                                size={14}
                                            />
                                        ) : undefined}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : undefined}
                </div>
            </div>

            <div className='custom-scrollbar work-panel__queue-scroll'>
                <div
                    className={
                        filteredWorkItems.length === 0
                            ? 'queue-list queue-list--empty'
                            : 'queue-list'
                    }
                >
                    {filteredWorkItems.length === 0 ? (
                        <p className='empty-state'>No open work found.</p>
                    ) : (
                        filteredWorkItems.map((item) => (
                            <WorkQueueRow
                                item={item}
                                key={item.id}
                                onSelectItem={onSelectItem}
                            />
                        ))
                    )}
                </div>
            </div>
        </>
    );
}

function WorkDetail(props: {
    isGitHubConnected: boolean;
    isAssigning: boolean;
    onAssign: () => void;
    onBack: () => void;
    onUpdatePrompt: (value: string) => void;
    selectedItem: Readonly<WorkItem>;
    selectedPrompt: string;
}): JSX.Element {
    const {
        isGitHubConnected,
        isAssigning,
        onAssign,
        onBack,
        onUpdatePrompt,
        selectedItem,
        selectedPrompt,
    } = props;

    return (
        <article className='custom-scrollbar detail-panel'>
            <button className='back-button' onClick={onBack} type='button'>
                <ArrowLeft aria-hidden='true' size={22} />
                Back
            </button>

            <header className='detail-header'>
                <div className='detail-header__main'>
                    <span className='detail-header__type'>
                        {selectedItem.type === 'issue' ? (
                            <CircleDot aria-label='Issue' size={36} />
                        ) : (
                            <GitPullRequestArrow
                                aria-label='Pull request'
                                size={36}
                            />
                        )}
                    </span>
                    <div>
                        <h2 className='detail-title'>{selectedItem.title}</h2>
                        <p className='detail-meta'>
                            <span>{selectedItem.repo}</span>
                            <span>#{selectedItem.number}</span>
                        </p>
                    </div>
                </div>
                <span className='readiness readiness--detail'>
                    {selectedItem.codexReady ? (
                        <Check aria-label='Codex ready' size={20} />
                    ) : (
                        <span
                            aria-label='Not codex ready'
                            className='readiness__empty'
                        />
                    )}
                </span>
            </header>

            <div className='issue-body'>
                {selectedItem.body === ''
                    ? 'No description.'
                    : selectedItem.body}
            </div>

            <label className='prompt-label' htmlFor='prompt'>
                Prompt
            </label>
            <textarea
                className='prompt-input'
                id='prompt'
                onChange={(event) => {
                    onUpdatePrompt(event.target.value);
                }}
                placeholder='Add intent, constraints, and acceptance criteria.'
                value={selectedPrompt}
            />

            <button
                className='assign-button'
                disabled={
                    selectedPrompt.trim() === '' ||
                    !isGitHubConnected ||
                    isAssigning
                }
                onClick={onAssign}
                type='button'
            >
                <span>{isAssigning ? 'Assigning...' : 'Assign to Codex'}</span>
                <CircleArrowUp aria-hidden='true' size={20} />
            </button>
        </article>
    );
}

export function WorkPanel(props: WorkPanelProps): JSX.Element {
    const {
        filteredRepositoriesCount,
        filteredWorkItems,
        githubUser,
        hasGitHubError,
        isAutomationPromptCopied,
        isGitHubConnected,
        isAssigning,
        isSettingsMenuOpen,
        isSortMenuOpen,
        language,
        onAssign,
        onConnectGitHub,
        onDisconnectGitHub,
        onSelectItem,
        onSetLanguage,
        onSetupAutomation,
        onToggleSettingsMenu,
        onToggleSortMenu,
        onToggleTheme,
        onUpdatePrompt,
        onUpdateRepositorySearchQuery,
        onUpdateSort,
        onUpdateWorkFilter,
        repositorySearchQuery,
        selectedItem,
        selectedPrompt,
        statusText,
        theme,
        workFilter,
        workSortDirection,
        workSortKey,
    } = props;

    return (
        <section className='work-panel'>
            {selectedItem === undefined ? (
                <WorkQueue
                    filteredRepositoriesCount={filteredRepositoriesCount}
                    filteredWorkItems={filteredWorkItems}
                    githubUser={githubUser}
                    hasGitHubError={hasGitHubError}
                    isAutomationPromptCopied={isAutomationPromptCopied}
                    isGitHubConnected={isGitHubConnected}
                    isSettingsMenuOpen={isSettingsMenuOpen}
                    isSortMenuOpen={isSortMenuOpen}
                    language={language}
                    onConnectGitHub={onConnectGitHub}
                    onDisconnectGitHub={onDisconnectGitHub}
                    onSelectItem={(item) => {
                        onSelectItem(item);
                    }}
                    onSetLanguage={onSetLanguage}
                    onSetupAutomation={onSetupAutomation}
                    onToggleSettingsMenu={onToggleSettingsMenu}
                    onToggleSortMenu={onToggleSortMenu}
                    onToggleTheme={onToggleTheme}
                    onUpdateRepositorySearchQuery={
                        onUpdateRepositorySearchQuery
                    }
                    onUpdateSort={onUpdateSort}
                    onUpdateWorkFilter={onUpdateWorkFilter}
                    repositorySearchQuery={repositorySearchQuery}
                    theme={theme}
                    workFilter={workFilter}
                    workSortDirection={workSortDirection}
                    workSortKey={workSortKey}
                />
            ) : (
                <WorkDetail
                    isAssigning={isAssigning}
                    isGitHubConnected={isGitHubConnected}
                    onAssign={onAssign}
                    onBack={() => {
                        onSelectItem(undefined);
                    }}
                    onUpdatePrompt={onUpdatePrompt}
                    selectedItem={selectedItem}
                    selectedPrompt={selectedPrompt}
                />
            )}

            {statusText === '' ? undefined : (
                <p className='status-message'>{statusText}</p>
            )}
        </section>
    );
}
