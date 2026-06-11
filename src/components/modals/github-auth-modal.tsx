import type { JSX } from 'react';
import { X } from 'lucide-react';

interface GitHubAuthModalProps {
    onClose: () => void;
    onSubmit: () => void;
}

export function GitHubAuthModal(props: GitHubAuthModalProps): JSX.Element {
    const { onClose, onSubmit } = props;

    return (
        <div className='modal-backdrop'>
            <form
                aria-labelledby='github-auth-title'
                className='modal-card'
                onSubmit={(event) => {
                    event.preventDefault();
                    onSubmit();
                }}
                role='dialog'
            >
                <div className='modal-header'>
                    <div>
                        <h2 className='modal-title' id='github-auth-title'>
                            GitHub account
                        </h2>
                        <p className='modal-description'>
                            Connect a GitHub token for queue reads and Codex
                            assignment.
                        </p>
                    </div>
                    <button
                        aria-label='Close GitHub account'
                        className='modal-icon-button'
                        onClick={onClose}
                        type='button'
                    >
                        <X aria-hidden='true' size={18} />
                    </button>
                </div>

                <button className='modal-primary-button' type='submit'>
                    <span>Continue with GitHub</span>
                    <span aria-hidden='true' className='github-mark'>
                        GH
                    </span>
                </button>
            </form>
        </div>
    );
}
