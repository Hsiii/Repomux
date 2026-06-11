import type { JSX } from 'react';
import { LogOut } from 'lucide-react';

import type { GitHubUser, Repository } from '../types/app.js';

interface RepositorySidebarProps {
    filteredRepositories: readonly Repository[];
    githubToken: string;
    githubUser: GitHubUser | undefined;
    hasGitHubError: boolean;
    onConnectGitHub: () => void;
    onDisconnectGitHub: () => void;
    onSelectRepository: (repository: Readonly<Repository>) => void;
    onUpdateRepositorySearchQuery: (value: string) => void;
    repositorySearchQuery: string;
    selectedRepositoryNames: readonly string[];
}

export function RepositorySidebar(props: RepositorySidebarProps): JSX.Element {
    const {
        filteredRepositories,
        githubToken,
        githubUser,
        hasGitHubError,
        onConnectGitHub,
        onDisconnectGitHub,
        onSelectRepository,
        onUpdateRepositorySearchQuery,
        repositorySearchQuery,
        selectedRepositoryNames,
    } = props;

    let repoContent: JSX.Element;

    if (githubToken.trim() === '') {
        repoContent = (
            <div className='repo-panel__empty-state'>
                <p className='repo-panel__message'>
                    Connect GitHub to load your repositories.
                </p>
            </div>
        );
    } else if (filteredRepositories.length === 0) {
        repoContent = (
            <div className='repo-panel__empty-state'>
                <p className='repo-panel__message'>
                    No repositories match that search.
                </p>
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
                            <span className='repo-row__label'>
                                {repository.fullName}
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
                            aria-label='Find a repository'
                            className='modal-input repo-search-input'
                            onChange={(event) => {
                                onUpdateRepositorySearchQuery(
                                    event.target.value
                                );
                            }}
                            placeholder='Find a repository...'
                            type='search'
                            value={repositorySearchQuery}
                        />
                    </div>

                    {repoContent}
                </div>

                <div className='repo-user-card'>
                    <span aria-hidden='true' className='repo-user-card__mark'>
                        GH
                    </span>
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
                                    {githubUser?.name ??
                                        githubUser?.login ??
                                        'GitHub'}
                                </span>
                                <span className='repo-user-card__meta'>
                                    {hasGitHubError
                                        ? 'Token needs attention'
                                        : (githubUser?.login ?? 'Connected')}
                                </span>
                            </div>
                            <button
                                aria-label='Log out of GitHub'
                                className='repo-user-card__icon-button'
                                onClick={onDisconnectGitHub}
                                type='button'
                            >
                                <LogOut aria-hidden='true' size={18} />
                            </button>
                        </>
                    )}
                </div>
            </section>
        </aside>
    );
}
