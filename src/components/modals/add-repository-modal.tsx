import type { JSX } from 'react';
import { Plus, X } from 'lucide-react';

interface AddRepositoryModalProps {
    continueAddingRepositories: boolean;
    isPending: boolean;
    onClose: () => void;
    onSubmit: () => void;
    onToggleContinueAddingRepositories: (checked: boolean) => void;
    onUpdateRepoInput: (value: string) => void;
    repoInput: string;
}

export function AddRepositoryModal(
    props: AddRepositoryModalProps
): JSX.Element {
    const {
        continueAddingRepositories,
        isPending,
        onClose,
        onSubmit,
        onToggleContinueAddingRepositories,
        onUpdateRepoInput,
        repoInput,
    } = props;

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
                    disabled={isPending}
                    type='submit'
                >
                    <span>{isPending ? 'Adding' : 'Add repository'}</span>
                    <Plus aria-hidden='true' size={20} />
                </button>
            </form>
        </div>
    );
}
