import type { JSX } from 'react';
import {
    ArrowLeft,
    Check,
    CircleArrowUp,
    CircleDot,
    GitPullRequestArrow,
} from 'lucide-react';

import type { WorkItem } from '../types/app.js';

interface WorkPanelProps {
    filteredWorkItems: readonly WorkItem[];
    githubToken: string;
    includeUnassignedIssues: boolean;
    isAssigning: boolean;
    onAssign: () => void;
    onSelectItem: (item: Readonly<WorkItem> | undefined) => void;
    onUpdateIncludeUnassignedIssues: (checked: boolean) => void;
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
    includeUnassignedIssues: boolean;
    onSelectItem: (item: Readonly<WorkItem>) => void;
    onUpdateIncludeUnassignedIssues: (checked: boolean) => void;
}): JSX.Element {
    const {
        filteredWorkItems,
        includeUnassignedIssues,
        onSelectItem,
        onUpdateIncludeUnassignedIssues,
    } = props;

    return (
        <>
            <div className='work-panel__header'>
                <h2 className='work-title'>Work queue</h2>
                <div className='work-filters'>
                    <label className='work-filter work-filter--check'>
                        <input
                            checked={includeUnassignedIssues}
                            onChange={(event) => {
                                onUpdateIncludeUnassignedIssues(
                                    event.target.checked
                                );
                            }}
                            type='checkbox'
                        />
                        <span>Include unassigned</span>
                    </label>
                </div>
            </div>

            <div
                className={
                    filteredWorkItems.length === 0
                        ? 'queue-list queue-list--empty'
                        : 'queue-list'
                }
            >
                {filteredWorkItems.length === 0 ? (
                    <p className='empty-state'>
                        No open issues or pull requests found.
                    </p>
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
        </>
    );
}

function WorkDetail(props: {
    githubToken: string;
    isAssigning: boolean;
    onAssign: () => void;
    onBack: () => void;
    onUpdatePrompt: (value: string) => void;
    selectedItem: Readonly<WorkItem>;
    selectedPrompt: string;
}): JSX.Element {
    const {
        githubToken,
        isAssigning,
        onAssign,
        onBack,
        onUpdatePrompt,
        selectedItem,
        selectedPrompt,
    } = props;

    return (
        <article className='detail-panel'>
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
                    ? 'No body provided.'
                    : selectedItem.body}
            </div>

            <label className='prompt-label' htmlFor='prompt'>
                Prompt / context
            </label>
            <textarea
                className='prompt-input'
                id='prompt'
                onChange={(event) => {
                    onUpdatePrompt(event.target.value);
                }}
                placeholder='Add any additional context or instructions for Codex...'
                value={selectedPrompt}
            />

            <button
                className='assign-button'
                disabled={
                    selectedPrompt.trim() === '' ||
                    githubToken.trim() === '' ||
                    isAssigning
                }
                onClick={onAssign}
                type='button'
            >
                <span>{isAssigning ? 'Assigning' : 'Assign to Codex'}</span>
                <CircleArrowUp aria-hidden='true' size={20} />
            </button>
        </article>
    );
}

export function WorkPanel(props: WorkPanelProps): JSX.Element {
    const {
        filteredWorkItems,
        githubToken,
        includeUnassignedIssues,
        isAssigning,
        onAssign,
        onSelectItem,
        onUpdateIncludeUnassignedIssues,
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
                    includeUnassignedIssues={includeUnassignedIssues}
                    onSelectItem={(item) => {
                        onSelectItem(item);
                    }}
                    onUpdateIncludeUnassignedIssues={
                        onUpdateIncludeUnassignedIssues
                    }
                />
            ) : (
                <WorkDetail
                    githubToken={githubToken}
                    isAssigning={isAssigning}
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
