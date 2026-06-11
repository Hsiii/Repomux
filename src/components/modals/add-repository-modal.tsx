import type { JSX } from 'react';
import { Plus, X } from 'lucide-react';

import type { Repository } from '../../types/app.js';

interface AddRepositoryModalProps {
    accessibleRepositories: readonly Repository[];
    continueAddingRepositories: boolean;
    hasExactMatch: boolean;
    isGitHubConnected: boolean;
    isPending: boolean;
    isRepositoryListPending: boolean;
    onClose: () => void;
    onPickRepository: (fullName: string) => void;
    onSubmit: () => void;
    onToggleContinueAddingRepositories: (checked: boolean) => void;
    onUpdateRepoInput: (value: string) => void;
    repoInput: string;
}

export function AddRepositoryModal(
    props: AddRepositoryModalProps
): JSX.Element {
    const {
        accessibleRepositories,
        continueAddingRepositories,
        hasExactMatch,
        isGitHubConnected,
        isPending,
        isRepositoryListPending,
        onClose,
        onPickRepository,
        onSubmit,
        onToggleContinueAddingRepositories,
        onUpdateRepoInput,
        repoInput,
    } = props;
    let results: JSX.Element;

    if (isGitHubConnected) {
        if (isRepositoryListPending) {
            results = (
                <p className='repo-search-results__message'>
                    Loading accessible repositories...
                </p>
            );
        } else if (accessibleRepositories.length === 0) {
            results = (
                <p className='repo-search-results__message'>
                    No accessible repositories match this search.
                </p>
            );
        } else {
            results = (
                <>
                    {accessibleRepositories.map((repository) => (
                        <button
                            className='repo-search-result'
                            key={repository.id}
                            onClick={() => {
                                onPickRepository(repository.fullName);
                            }}
                            type='button'
                        >
                            <span className='repo-search-result__name'>
                                {repository.fullName}
                            </span>
                        </button>
                    ))}
                </>
            );
        }
    } else {
        results = (
            <p className='repo-search-results__message'>
                Connect GitHub to search accessible repositories.
            </p>
        );
    }

    return (
        <div className='modal-backdrop'>
            <form
                aria-labelledby='add-repository-title'
                className='modal-card'
                onSubmit={(event) => {
                    event.preventDefault();
                    onSubmit();
                }}
                role='dialog'
            >
                <div className='modal-header'>
                    <div>
                        <h2 className='modal-title' id='add-repository-title'>
                            Add repository
                        </h2>
                        <p className='modal-description'>
                            Add a GitHub repository to the queue.
                        </p>
                    </div>
                    <button
                        aria-label='Close add repository'
                        className='modal-icon-button'
                        onClick={onClose}
                        type='button'
                    >
                        <X aria-hidden='true' size={18} />
                    </button>
                </div>

                <label className='field-label' htmlFor='repo-input'>
                    Repository
                </label>
                <input
                    autoFocus
                    className='modal-input'
                    id='repo-input'
                    onChange={(event) => {
                        onUpdateRepoInput(event.target.value);
                    }}
                    placeholder='owner/repo or GitHub URL'
                    type='text'
                    value={repoInput}
                />

                <div className='repo-search-results' role='list'>
                    {results}
                </div>

                <label className='checkbox-row'>
                    <input
                        checked={continueAddingRepositories}
                        onChange={(event) => {
                            onToggleContinueAddingRepositories(
                                event.target.checked
                            );
                        }}
                        type='checkbox'
                    />
                    <span>Continue adding next</span>
                </label>

                <button
                    className='modal-primary-button'
                    disabled={isPending || !hasExactMatch}
                    type='submit'
                >
                    <span>{isPending ? 'Adding' : 'Add repository'}</span>
                    <Plus aria-hidden='true' size={20} />
                </button>
            </form>
        </div>
    );
}
