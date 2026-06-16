import type { JSX } from 'react';
import { useId, useState } from 'react';
import {
    ArrowDownWideNarrow,
    ArrowLeft,
    ArrowUpWideNarrow,
    Bot,
    Check,
    ChevronDown,
    CircleArrowUp,
    CircleDot,
    GitPullRequestArrow,
    LogOut,
    MessageSquare,
    Search,
    Settings,
    UserCircle,
} from 'lucide-react';

import { useI18n } from '../hooks/use-i18n';
import type { GitHubUser, WorkItem } from '../types/app';
import type { WorkFilter } from './RepositorySidebar';

export type SortDirection = 'asc' | 'desc';
export type ThemePreference = 'dark' | 'light' | 'system';
export type WorkSortKey = 'repo-count' | 'type' | 'comments';

interface WorkPanelProps {
    filteredWorkItems: readonly WorkItem[];
    githubUser: GitHubUser | undefined;
    isGitHubConnected: boolean;
    isAssigning: boolean;
    isSettingsMenuOpen: boolean;
    isSortMenuOpen: boolean;
    language: string;
    onAssign: () => void;
    onConnectGitHub: () => void;
    onDisconnectGitHub: () => void;
    onSetLanguage: (language: string) => void;
    onSetTheme: (theme: ThemePreference) => void;
    onSetupAutomation: () => void;
    onSelectItem: (item: Readonly<WorkItem> | undefined) => void;
    onToggleSettingsMenu: () => void;
    onToggleSortMenu: () => void;
    onUpdatePrompt: (value: string) => void;
    onUpdateRepositorySearchQuery: (value: string) => void;
    onUpdateSort: (sortKey: WorkSortKey, direction: SortDirection) => void;
    onUpdateWorkFilter: (filter: WorkFilter) => void;
    repositorySearchQuery: string;
    selectedItem: Readonly<WorkItem> | undefined;
    selectedPrompt: string;
    statusText: string;
    theme: ThemePreference;
    workFilter: WorkFilter;
    workSortDirection: SortDirection;
    workSortKey: WorkSortKey;
}

const sortOptions = [
    { label: 'Repo load', value: 'repo-count' },
    { label: 'Type', value: 'type' },
    { label: 'Comments', value: 'comments' },
] as const;

const sortDirectionOptions = [
    { label: 'Descending', value: 'desc' },
    { label: 'Ascending', value: 'asc' },
] as const;

const workFilterOptions = [
    { label: 'All', value: 'all' },
    { label: 'Assigned to me', value: 'assigned' },
    { label: 'Created by me', value: 'created' },
] as const;

const languageOptions = [
    { label: 'EN', value: 'en' },
    { label: 'ZH', value: 'zh' },
] as const;

const themeOptions = [
    { label: 'Dark', value: 'dark' },
    { label: 'Light', value: 'light' },
    { label: 'System', value: 'system' },
] as const;

function WorkDropdown(props: {
    ariaLabel: string;
    className?: string;
    icon?: JSX.Element;
    menuClassName?: string;
    onChange: (value: string) => void;
    options: ReadonlyArray<{ label: string; value: string }>;
    triggerClassName?: string;
    value: string;
}): JSX.Element {
    const {
        ariaLabel,
        className,
        icon,
        menuClassName,
        onChange,
        options,
        triggerClassName,
        value,
    } = props;
    const [isOpen, setIsOpen] = useState(false);
    const listboxId = useId();
    const wrapperClassName =
        className === undefined
            ? 'work-dropdown'
            : `work-dropdown ${className}`;
    const buttonClassName =
        triggerClassName === undefined
            ? 'work-dropdown__trigger'
            : `work-dropdown__trigger ${triggerClassName}`;
    const listboxClassName =
        menuClassName === undefined
            ? 'work-dropdown__menu'
            : `work-dropdown__menu ${menuClassName}`;
    const selectedOption =
        options.find((option) => option.value === value) ?? options[0];

    return (
        <div
            className={wrapperClassName}
            onBlur={(event) => {
                const nextTarget = event.relatedTarget;

                if (
                    !(nextTarget instanceof Node) ||
                    !event.currentTarget.contains(nextTarget)
                ) {
                    setIsOpen(false);
                }
            }}
            onKeyDown={(event) => {
                if (event.key === 'Escape') {
                    setIsOpen(false);
                }
            }}
        >
            <button
                aria-controls={listboxId}
                aria-expanded={isOpen}
                aria-haspopup='listbox'
                aria-label={ariaLabel}
                className={buttonClassName}
                onClick={() => {
                    setIsOpen((current) => !current);
                }}
                type='button'
            >
                {icon === undefined ? undefined : (
                    <span aria-hidden='true' className='work-dropdown__icon'>
                        {icon}
                    </span>
                )}
                <span className='work-dropdown__value'>
                    {selectedOption.label}
                </span>
                <ChevronDown
                    aria-hidden='true'
                    className='work-dropdown__chevron'
                    size={14}
                />
            </button>

            {isOpen ? (
                <div className={listboxClassName} id={listboxId} role='listbox'>
                    {options.map((option) => (
                        <button
                            aria-selected={option.value === value}
                            className='work-dropdown__option'
                            key={option.value}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            role='option'
                            type='button'
                        >
                            <span>{option.label}</span>
                            {option.value === value ? (
                                <Check aria-hidden='true' size={14} />
                            ) : undefined}
                        </button>
                    ))}
                </div>
            ) : undefined}
        </div>
    );
}

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
    filteredWorkItems: readonly WorkItem[];
    githubUser: GitHubUser | undefined;
    isGitHubConnected: boolean;
    isSettingsMenuOpen: boolean;
    isSortMenuOpen: boolean;
    language: string;
    onConnectGitHub: () => void;
    onDisconnectGitHub: () => void;
    onSetLanguage: (language: string) => void;
    onSetTheme: (theme: ThemePreference) => void;
    onSetupAutomation: () => void;
    onSelectItem: (item: Readonly<WorkItem>) => void;
    onToggleSettingsMenu: () => void;
    onToggleSortMenu: () => void;
    onUpdateRepositorySearchQuery: (value: string) => void;
    onUpdateSort: (sortKey: WorkSortKey, direction: SortDirection) => void;
    onUpdateWorkFilter: (filter: WorkFilter) => void;
    repositorySearchQuery: string;
    theme: ThemePreference;
    workFilter: WorkFilter;
    workSortDirection: SortDirection;
    workSortKey: WorkSortKey;
}): JSX.Element {
    const {
        filteredWorkItems,
        githubUser,
        isGitHubConnected,
        isSettingsMenuOpen,
        isSortMenuOpen,
        language,
        onConnectGitHub,
        onDisconnectGitHub,
        onSelectItem,
        onSetLanguage,
        onSetTheme,
        onSetupAutomation,
        onToggleSettingsMenu,
        onToggleSortMenu,
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
    const SortDirectionIcon =
        workSortDirection === 'desc' ? ArrowDownWideNarrow : ArrowUpWideNarrow;
    const readyWorkItemsCount = filteredWorkItems.filter(
        (item) => item.codexReady
    ).length;
    const { t } = useI18n(language);

    return (
        <>
            <div className='work-panel__header'>
                <div className='work-panel__title-group'>
                    <h2 className='work-title'>Work queue</h2>
                    <span className='work-panel__count'>
                        {readyWorkItemsCount}/{filteredWorkItems.length} codex
                        ready work items
                    </span>
                </div>
                <div className='work-panel__account'>
                    {isGitHubConnected ? (
                        <>
                            <button
                                aria-expanded={isSettingsMenuOpen}
                                aria-haspopup='menu'
                                aria-label='Open settings'
                                className='icon-button icon-button--bare'
                                onClick={onToggleSettingsMenu}
                                type='button'
                            >
                                <Settings aria-hidden='true' size={18} />
                            </button>
                            {isSettingsMenuOpen ? (
                                <div className='settings-menu' role='menu'>
                                    <div className='settings-account'>
                                        <span
                                            aria-hidden='true'
                                            className='account-avatar'
                                        >
                                            <UserCircle size={24} />
                                        </span>
                                        <span className='account-name'>
                                            {renderGitHubDisplayName(
                                                githubUser
                                            )}
                                        </span>
                                    </div>

                                    <button
                                        className='settings-menu__item'
                                        onClick={onSetupAutomation}
                                        role='menuitem'
                                        type='button'
                                    >
                                        <Bot aria-hidden='true' size={16} />
                                        <span>
                                            {t('automation.settingsButton')}
                                        </span>
                                    </button>

                                    <WorkDropdown
                                        ariaLabel='Theme'
                                        className='settings-select'
                                        onChange={(value) => {
                                            onSetTheme(
                                                value as ThemePreference
                                            );
                                        }}
                                        options={themeOptions}
                                        value={theme}
                                    />

                                    <WorkDropdown
                                        ariaLabel='Language'
                                        className='settings-select'
                                        onChange={onSetLanguage}
                                        options={languageOptions}
                                        value={language}
                                    />

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
                        placeholder='Filter by repo (owner/name)'
                        type='search'
                        value={repositorySearchQuery}
                    />
                </label>

                <WorkDropdown
                    ariaLabel='Work queue filter'
                    className='work-filter'
                    onChange={(value) => {
                        onUpdateWorkFilter(value as WorkFilter);
                    }}
                    options={workFilterOptions}
                    value={workFilter}
                />

                <div className='sort-menu'>
                    <button
                        aria-expanded={isSortMenuOpen}
                        aria-haspopup='menu'
                        className='sort-menu__trigger'
                        onClick={onToggleSortMenu}
                        type='button'
                    >
                        <SortDirectionIcon aria-hidden='true' size={16} />
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
        filteredWorkItems,
        githubUser,
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
        onSetTheme,
        onSetupAutomation,
        onToggleSettingsMenu,
        onToggleSortMenu,
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
                    filteredWorkItems={filteredWorkItems}
                    githubUser={githubUser}
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
                    onSetTheme={onSetTheme}
                    onSetupAutomation={onSetupAutomation}
                    onToggleSettingsMenu={onToggleSettingsMenu}
                    onToggleSortMenu={onToggleSortMenu}
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
