import type { JSX } from 'react';
import { Trash2, X } from 'lucide-react';

import type { Repository } from '../../types/app.js';

interface RemoveRepositoryModalProps {
    isPending: boolean;
    onClose: () => void;
    onRemove: () => void;
    repository: Readonly<Repository>;
}

export function RemoveRepositoryModal(
    props: RemoveRepositoryModalProps
): JSX.Element {
    const { isPending, onClose, onRemove, repository } = props;

    return (
        <div className='modal-backdrop'>
            <div
                aria-labelledby='remove-repository-title'
                className='modal-card'
                role='dialog'
            >
                <div className='modal-header'>
                    <div>
                        <h2
                            className='modal-title'
                            id='remove-repository-title'
                        >
                            Remove repository
                        </h2>
                        <p className='modal-description'>
                            Remove {repository.fullName} from the active queue.
                        </p>
                    </div>
                    <button
                        aria-label='Close remove repository'
                        className='modal-icon-button'
                        onClick={onClose}
                        type='button'
                    >
                        <X aria-hidden='true' size={18} />
                    </button>
                </div>

                <div className='modal-actions'>
                    <button
                        className='modal-secondary-button'
                        onClick={onClose}
                        type='button'
                    >
                        Cancel
                    </button>
                    <button
                        className='modal-danger-button'
                        disabled={isPending}
                        onClick={onRemove}
                        type='button'
                    >
                        <span>{isPending ? 'Removing' : 'Remove'}</span>
                        <Trash2 aria-hidden='true' size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
