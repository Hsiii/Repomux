import type { JSX } from 'react';
import {
    Bot,
    Check,
    GitBranch,
    Languages,
    LogOut,
    Moon,
    Settings,
    Sun,
} from 'lucide-react';

import type { GitHubUser, Repository } from '../types/app.js';

export type WorkFilter = 'assigned' | 'assigned-or-unassigned' | 'all';

interface RepositorySidebarProps {
    filteredRepositories: readonly Repository[];
    githubToken: string;
    githubUser: GitHubUser | undefined;
    hasGitHubError: boolean;
    isSettingsMenuOpen: boolean;
    language: string;
    onConnectGitHub: () => void;
    onDisconnectGitHub: () => void;
    onSetLanguage: (language: string) => void;
    onSetupAutomation: () => void;
    onSelectRepository: (repository: Readonly<Repository>) => void;
    onToggleSettingsMenu: () => void;
    onToggleTheme: () => void;
    onUpdateRepositorySearchQuery: (value: string) => void;
    onUpdateWorkFilter: (filter: WorkFilter) => void;
    repositorySearchQuery: string;
    selectedRepositoryNames: readonly string[];
    theme: 'dark' | 'light';
    workFilter: WorkFilter;
}

const workFilterOptions = [
    { label: 'Assigned to me', value: 'assigned' },
    { label: 'Include unassigned', value: 'assigned-or-unassigned' },
    { label: 'All work', value: 'all' },
] as const;

const languageOptions = [
    { label: 'English', value: 'en' },
    { label: 'Chinese', value: 'zh' },
] as const;

export function RepositorySidebar(props: RepositorySidebarProps): JSX.Element {
    const {
        filteredRepositories,
        githubToken,
        githubUser,
        hasGitHubError,
        isSettingsMenuOpen,
        language,
        onConnectGitHub,
        onDisconnectGitHub,
        onSetLanguage,
        onSetupAutomation,
        onSelectRepository,
        onToggleSettingsMenu,
        onToggleTheme,
        onUpdateRepositorySearchQuery,
        onUpdateWorkFilter,
        repositorySearchQuery,
        selectedRepositoryNames,
        theme,
        workFilter,
    } = props;

    function renderRepositoryName(fullName: string) {
        const [owner, ...nameParts] = fullName.split('/');
        const name = nameParts.join('/');

        return (
            <>
                <span className='repo-row__owner'>{owner}</span>
                {name === '' ? undefined : (
                    <>
                        <span className='repo-row__slash'>/</span>
                        <span className='repo-row__name'>{name}</span>
                    </>
                )}
            </>
        );
    }

    function renderGitHubDisplayName() {
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

    function renderGitHubMeta() {
        if (hasGitHubError) {
            return 'Auth needs attention';
        }

        if (githubUser?.login === undefined) {
            return 'Connected';
        }

        return githubUser.login;
    }

    let repoContent: JSX.Element;

    if (githubToken.trim() === '') {
        repoContent = (
            <div className='repo-panel__empty-state'>
                <p className='repo-panel__message'>
                    Connect GitHub to load repos.
                </p>
            </div>
        );
    } else if (filteredRepositories.length === 0) {
        repoContent = (
            <div className='repo-panel__empty-state'>
                <p className='repo-panel__message'>No matching repos.</p>
            </div>
        );
    } else {
        repoContent = (
            <div className='repo-list repo-list--sidebar'>
                {filteredRepositories.map((repository) => {
                    const isSelected = selectedRepositoryNames.includes(
                        repository.fullName
                    );

                    return (
                        <button
                            aria-pressed={isSelected}
                            className={`repo-row${isSelected ? ' repo-row--selected' : ''}`}
                            key={repository.id}
                            onClick={() => {
                                onSelectRepository(repository);
                            }}
                            type='button'
                        >
                            <span aria-hidden='true' className='repo-row__icon'>
                                <GitBranch size={16} />
                            </span>
                            <span className='repo-row__label'>
                                {renderRepositoryName(repository.fullName)}
                            </span>
                        </button>
                    );
                })}
            </div>
        );
    }

    return (
        <aside aria-label='Repositories' className='repo-panel'>
            <section className='repo-panel__section'>
                <div className='repo-panel__main'>
                    <div className='repo-panel__header'>
                        <div className='repo-panel__heading'>
                            <h2 className='repo-panel__title'>Repositories</h2>
                        </div>

                        <input
                            aria-label='Find repo'
                            className='modal-input repo-search-input'
                            onChange={(event) => {
                                onUpdateRepositorySearchQuery(
                                    event.target.value
                                );
                            }}
                            placeholder='Find repo...'
                            type='search'
                            value={repositorySearchQuery}
                        />
                    </div>

                    {repoContent}
                </div>

                <div className='repo-user-card'>
                    {githubUser?.avatar_url === undefined ? (
                        <span
                            aria-hidden='true'
                            className='repo-user-card__mark'
                        >
                            GH
                        </span>
                    ) : (
                        <img
                            alt=''
                            className='repo-user-card__avatar'
                            src={githubUser.avatar_url}
                        />
                    )}
                    {githubToken.trim() === '' ? (
                        <>
                            <div className='repo-user-card__main'>
                                <span className='repo-user-card__name'>
                                    GitHub
                                </span>
                                <span className='repo-user-card__meta'>
                                    Not connected
                                </span>
                            </div>
                            <button
                                className='repo-user-card__button'
                                onClick={onConnectGitHub}
                                type='button'
                            >
                                Connect
                            </button>
                        </>
                    ) : (
                        <>
                            <div className='repo-user-card__main'>
                                <span className='repo-user-card__name'>
                                    {renderGitHubDisplayName()}
                                </span>
                                <span className='repo-user-card__meta'>
                                    {renderGitHubMeta()}
                                </span>
                            </div>
                            <button
                                aria-expanded={isSettingsMenuOpen}
                                aria-haspopup='menu'
                                aria-label='Open settings'
                                className='repo-user-card__icon-button'
                                onClick={onToggleSettingsMenu}
                                type='button'
                            >
                                <Settings aria-hidden='true' size={18} />
                            </button>
                            {isSettingsMenuOpen ? (
                                <div
                                    className='repo-user-card__settings-menu'
                                    role='menu'
                                >
                                    <button
                                        className='repo-user-card__settings-item'
                                        onClick={onSetupAutomation}
                                        role='menuitem'
                                        type='button'
                                    >
                                        <Bot aria-hidden='true' size={16} />
                                        <span>Set up automation</span>
                                    </button>

                                    <div className='repo-user-card__settings-group'>
                                        <span className='repo-user-card__settings-label'>
                                            Queue filter
                                        </span>
                                        {workFilterOptions.map((option) => (
                                            <button
                                                aria-checked={
                                                    option.value === workFilter
                                                }
                                                className='repo-user-card__settings-item'
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
                                        className='repo-user-card__settings-item'
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

                                    <div className='repo-user-card__settings-group'>
                                        <span className='repo-user-card__settings-label'>
                                            Language
                                        </span>
                                        {languageOptions.map((option) => (
                                            <button
                                                aria-checked={
                                                    option.value === language
                                                }
                                                className='repo-user-card__settings-item'
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
                                        className='repo-user-card__settings-item'
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
                    )}
                </div>
            </section>
        </aside>
    );
}
