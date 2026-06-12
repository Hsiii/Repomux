import type { JSX } from 'react';
import {
    ArrowLeft,
    Check,
    CircleArrowUp,
    CircleDot,
    GitPullRequestArrow,
} from 'lucide-react';

import type { WorkItem } from '../types/app';

interface WorkPanelProps {
    filteredWorkItems: readonly WorkItem[];
    isGitHubConnected: boolean;
    isAssigning: boolean;
    onAssign: () => void;
    onSelectItem: (item: Readonly<WorkItem> | undefined) => void;
    onUpdatePrompt: (value: string) => void;
    selectedItem: Readonly<WorkItem> | undefined;
    selectedPrompt: string;
    statusText: string;
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
    onSelectItem: (item: Readonly<WorkItem>) => void;
}): JSX.Element {
    const { filteredWorkItems, onSelectItem } = props;

    return (
        <>
            <div className='work-panel__header'>
                <h2 className='work-title'>Work queue</h2>
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
        isGitHubConnected,
        isAssigning,
        onAssign,
        onSelectItem,
        onUpdatePrompt,
        selectedItem,
        selectedPrompt,
        statusText,
    } = props;

    return (
        <section className='work-panel'>
            {selectedItem === undefined ? (
                <WorkQueue
                    filteredWorkItems={filteredWorkItems}
                    onSelectItem={(item) => {
                        onSelectItem(item);
                    }}
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
