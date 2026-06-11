import type { JSX } from 'react';
import {
    ArrowDown,
    ArrowUp,
    LogOut,
    Parasol,
    Plus,
    Rocket,
    X,
} from 'lucide-react';

import type { GitHubUser, Repository } from '../types/app.js';

interface RepositorySidebarProps {
    activeRepositories: readonly Repository[];
    githubToken: string;
    githubUser: GitHubUser | undefined;
    hasGitHubError: boolean;
    normalRepositories: readonly Repository[];
    onConnectGitHub: () => void;
    onDisconnectGitHub: () => void;
    onMoveRepositoryToActive: (repository: Readonly<Repository>) => void;
    onOpenAddRepository: () => void;
    onRemoveRepository: (repository: Readonly<Repository>) => void;
    onRemoveRepositoryFromActive: (repository: Readonly<Repository>) => void;
}

function RepositoryRow(props: {
    isActiveRepository: boolean;
    onMoveRepositoryToActive: (repository: Readonly<Repository>) => void;
    onRemoveRepository: (repository: Readonly<Repository>) => void;
    onRemoveRepositoryFromActive: (repository: Readonly<Repository>) => void;
    repository: Readonly<Repository>;
}): JSX.Element {
    const {
        isActiveRepository,
        onMoveRepositoryToActive,
        onRemoveRepository,
        onRemoveRepositoryFromActive,
        repository,
    } = props;

    return (
        <div className='repo-row'>
            <span className='repo-row__label'>{repository.fullName}</span>
            <button
                aria-label={
                    isActiveRepository
                        ? `Remove ${repository.fullName} from active`
                        : `Move ${repository.fullName} to active`
                }
                className='repo-row__action'
                onClick={() => {
                    if (isActiveRepository) {
                        onRemoveRepositoryFromActive(repository);
                        return;
                    }

                    onMoveRepositoryToActive(repository);
                }}
                type='button'
            >
                {isActiveRepository ? (
                    <ArrowDown aria-hidden='true' size={18} />
                ) : (
                    <ArrowUp aria-hidden='true' size={18} />
                )}
            </button>
            <button
                aria-label={`Remove ${repository.fullName}`}
                className='repo-row__remove'
                onClick={() => {
                    onRemoveRepository(repository);
                }}
                type='button'
            >
                <X aria-hidden='true' size={18} />
            </button>
        </div>
    );
}

function RepositoryGroup(props: {
    heading: string;
    icon: JSX.Element;
    isActiveRepository: boolean;
    onMoveRepositoryToActive: (repository: Readonly<Repository>) => void;
    onOpenAddRepository: () => void;
    onRemoveRepository: (repository: Readonly<Repository>) => void;
    onRemoveRepositoryFromActive: (repository: Readonly<Repository>) => void;
    repositories: readonly Repository[];
}): JSX.Element {
    const {
        heading,
        icon,
        isActiveRepository,
        onMoveRepositoryToActive,
        onOpenAddRepository,
        onRemoveRepository,
        onRemoveRepositoryFromActive,
        repositories,
    } = props;

    return (
        <section className='repo-group'>
            <div className='repo-group__header'>
                <div className='repo-group__heading'>
                    {icon}
                    <h2 className='repo-group__title'>{heading}</h2>
                </div>
                <button
                    aria-label='Add repository'
                    className='section-add-button'
                    onClick={onOpenAddRepository}
                    type='button'
                >
                    <Plus aria-hidden='true' size={18} />
                </button>
            </div>
            <div className='repo-list'>
                {repositories.map((repository) => (
                    <RepositoryRow
                        isActiveRepository={isActiveRepository}
                        key={repository.id}
                        onMoveRepositoryToActive={onMoveRepositoryToActive}
                        onRemoveRepository={onRemoveRepository}
                        onRemoveRepositoryFromActive={
                            onRemoveRepositoryFromActive
                        }
                        repository={repository}
                    />
                ))}
            </div>
        </section>
    );
}

export function RepositorySidebar(props: RepositorySidebarProps): JSX.Element {
    const {
        activeRepositories,
        githubToken,
        githubUser,
        hasGitHubError,
        normalRepositories,
        onConnectGitHub,
        onDisconnectGitHub,
        onMoveRepositoryToActive,
        onOpenAddRepository,
        onRemoveRepository,
        onRemoveRepositoryFromActive,
    } = props;

    return (
        <aside aria-label='Repositories' className='repo-panel'>
            <section className='repo-panel__section'>
                <div className='repo-groups'>
                    <RepositoryGroup
                        heading='Active repos'
                        icon={<Rocket aria-hidden='true' size={16} />}
                        isActiveRepository={true}
                        onMoveRepositoryToActive={onMoveRepositoryToActive}
                        onOpenAddRepository={onOpenAddRepository}
                        onRemoveRepository={onRemoveRepository}
                        onRemoveRepositoryFromActive={
                            onRemoveRepositoryFromActive
                        }
                        repositories={activeRepositories}
                    />
                    <RepositoryGroup
                        heading='Pocket repos'
                        icon={<Parasol aria-hidden='true' size={16} />}
                        isActiveRepository={false}
                        onMoveRepositoryToActive={onMoveRepositoryToActive}
                        onOpenAddRepository={onOpenAddRepository}
                        onRemoveRepository={onRemoveRepository}
                        onRemoveRepositoryFromActive={
                            onRemoveRepositoryFromActive
                        }
                        repositories={normalRepositories}
                    />
                </div>

                <div className='github-account-card'>
                    <span aria-hidden='true' className='github-mark'>
                        GH
                    </span>
                    {githubToken.trim() === '' ? (
                        <>
                            <div className='github-account-card__main'>
                                <span className='github-account-card__name'>
                                    GitHub
                                </span>
                                <span className='github-account-card__meta'>
                                    Not connected
                                </span>
                            </div>
                            <button
                                className='github-account-card__button'
                                onClick={onConnectGitHub}
                                type='button'
                            >
                                Connect
                            </button>
                        </>
                    ) : (
                        <>
                            <div className='github-account-card__main'>
                                <span className='github-account-card__name'>
                                    {githubUser?.name ??
                                        githubUser?.login ??
                                        'GitHub'}
                                </span>
                                <span className='github-account-card__meta'>
                                    {hasGitHubError
                                        ? 'Token needs attention'
                                        : (githubUser?.login ?? 'Connected')}
                                </span>
                            </div>
                            <button
                                aria-label='Log out of GitHub'
                                className='github-account-card__icon-button'
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
