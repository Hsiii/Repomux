'use client';

import type { JSX, PointerEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    BookMarked,
    Check,
    CircleDot,
    Copy,
    Download,
    GitPullRequestArrow,
    MousePointer2,
    Move,
    PenTool,
    RotateCcw,
    Save,
} from 'lucide-react';

interface Point {
    x: number;
    y: number;
}

interface CubicSegment {
    c1: Point;
    c2: Point;
    end: Point;
}

interface CurveDraft {
    segments: CubicSegment[];
    start: Point;
}

type LayoutItemId =
    | 'automation-copy'
    | 'codex-node'
    | 'mux-copy'
    | 'mux-node'
    | 'prompt-card'
    | 'prompt-copy'
    | 'queue-card'
    | 'queue-copy'
    | 'repo-row'
    | 'result-card'
    | 'result-copy';

interface LayoutItem {
    height: number;
    id: LayoutItemId;
    label: string;
    width: number;
    x: number;
    y: number;
}

interface ToolDraft {
    curve: CurveDraft;
    layout: readonly LayoutItem[];
}

interface DragTarget {
    index: number;
    kind: 'c1' | 'c2' | 'end' | 'start';
}

interface LayoutDragTarget {
    id: LayoutItemId;
    offsetX: number;
    offsetY: number;
}

interface SnapGuide {
    axis: 'x' | 'y';
    value: number;
}

const canvasWidth = 1248;
const canvasHeight = 2600;
const snapThreshold = 12;
const legacyStorageKey = 'repomux:landing-line-tool:v1';
const storageKey = 'repomux:landing-line-tool:v2';

const defaultDraft: CurveDraft = {
    start: { x: 704, y: 612 },
    segments: [
        {
            c1: { x: 640, y: 780 },
            c2: { x: 328, y: 900 },
            end: { x: 440, y: 1060 },
        },
        {
            c1: { x: 464, y: 1236 },
            c2: { x: 628, y: 1220 },
            end: { x: 440, y: 1352 },
        },
        {
            c1: { x: 612, y: 1472 },
            c2: { x: 456, y: 1588 },
            end: { x: 608, y: 1704 },
        },
        {
            c1: { x: 704, y: 1856 },
            c2: { x: 824, y: 1912 },
            end: { x: 384, y: 2064 },
        },
        {
            c1: { x: 724, y: 2128 },
            c2: { x: 1248, y: 2320 },
            end: { x: 1248, y: 2376 },
        },
        {
            c1: { x: 1248, y: 2648 },
            c2: { x: 820, y: 2536 },
            end: { x: 648, y: 2476 },
        },
    ],
};

const toolQueueItems = [
    {
        icon: CircleDot,
        meta: 'Hsiii/repomux',
        number: 128,
        status: 'Ready',
        title: 'Polish landing page',
        type: 'issue',
    },
    {
        icon: CircleDot,
        meta: 'Hsiii/comux',
        number: 41,
        status: 'Prepared',
        title: 'Consider supporting Claude',
        type: 'issue',
    },
    {
        icon: GitPullRequestArrow,
        meta: 'Hsiii/create-hsi-app',
        number: 72,
        status: 'Assigned',
        title: 'Add user menu pop up',
        type: 'pr',
    },
] as const;

const toolRepositories = [
    { name: 'repomux', owner: 'Hsiii' },
    { name: 'create-hsi-app', owner: 'Hsiii' },
    { name: 'comux', owner: 'Hsiii' },
] as const;

const toolPromptLines = [
    'Redesign the benefit section to show repo multiplexing.',
    'Keep the queue, prompt handoff, and automation states easy to scan.',
    'Remove decorative clutter and keep the review path obvious.',
] as const;

const defaultLayout: readonly LayoutItem[] = [
    {
        height: 176,
        id: 'mux-copy',
        label: 'Workspace copy',
        width: 392,
        x: 80,
        y: 104,
    },
    {
        height: 112,
        id: 'repo-row',
        label: 'Repository cards',
        width: 536,
        x: 632,
        y: 104,
    },
    {
        height: 168,
        id: 'mux-node',
        label: 'Repomux node',
        width: 168,
        x: 620,
        y: 528,
    },
    {
        height: 216,
        id: 'queue-card',
        label: 'Work queue',
        width: 552,
        x: 80,
        y: 972,
    },
    {
        height: 144,
        id: 'queue-copy',
        label: 'Queue copy',
        width: 392,
        x: 696,
        y: 1008,
    },
    {
        height: 160,
        id: 'prompt-copy',
        label: 'Prompt copy',
        width: 392,
        x: 80,
        y: 1512,
    },
    {
        height: 308,
        id: 'prompt-card',
        label: 'Prompt card',
        width: 480,
        x: 688,
        y: 1512,
    },
    {
        height: 112,
        id: 'codex-node',
        label: 'Codex node',
        width: 112,
        x: 340,
        y: 1944,
    },
    {
        height: 144,
        id: 'automation-copy',
        label: 'Automation copy',
        width: 360,
        x: 704,
        y: 1932,
    },
    {
        height: 152,
        id: 'result-copy',
        label: 'Result copy',
        width: 392,
        x: 80,
        y: 2296,
    },
    {
        height: 96,
        id: 'result-card',
        label: 'Returned PR',
        width: 520,
        x: 588,
        y: 2396,
    },
];

function cloneDraft(draft: Readonly<CurveDraft>): CurveDraft {
    return {
        segments: draft.segments.map((segment) => ({
            c1: { ...segment.c1 },
            c2: { ...segment.c2 },
            end: { ...segment.end },
        })),
        start: { ...draft.start },
    };
}

function cloneLayout(layout: readonly LayoutItem[]): readonly LayoutItem[] {
    return layout.map((item) => ({ ...item }));
}

function normalizeLayoutItem(item: Readonly<LayoutItem>) {
    return {
        ...item,
        height: Number((item.height / canvasHeight).toFixed(4)),
        width: Number((item.width / canvasWidth).toFixed(4)),
        x: Number((item.x / canvasWidth).toFixed(4)),
        y: Number((item.y / canvasHeight).toFixed(4)),
    };
}

function formatPoint(point: Readonly<Point>): string {
    return `${Math.round(point.x)} ${Math.round(point.y)}`;
}

function createPath(draft: Readonly<CurveDraft>): string {
    return [
        `M ${formatPoint(draft.start)}`,
        ...draft.segments.map(
            (segment) =>
                `C ${formatPoint(segment.c1)} ${formatPoint(segment.c2)} ${formatPoint(segment.end)}`
        ),
    ].join(' ');
}

function normalizePoint(point: Readonly<Point>): Point {
    return {
        x: Number((point.x / canvasWidth).toFixed(4)),
        y: Number((point.y / canvasHeight).toFixed(4)),
    };
}

function createExport(draft: Readonly<ToolDraft>): string {
    return JSON.stringify(
        {
            canvas: {
                height: canvasHeight,
                width: canvasWidth,
            },
            layout: draft.layout,
            normalized: {
                curve: {
                    segments: draft.curve.segments.map((segment) => ({
                        c1: normalizePoint(segment.c1),
                        c2: normalizePoint(segment.c2),
                        end: normalizePoint(segment.end),
                    })),
                    start: normalizePoint(draft.curve.start),
                },
                layout: draft.layout.map(normalizeLayoutItem),
            },
            path: createPath(draft.curve),
            points: draft.curve,
        },
        undefined,
        2
    );
}

function createInitialDraft(): ToolDraft {
    return {
        curve: cloneDraft(defaultDraft),
        layout: cloneLayout(defaultLayout),
    };
}

function getPreviousAnchor(
    draft: Readonly<CurveDraft>,
    segmentIndex: number
): Point {
    if (segmentIndex === 0) {
        return draft.start;
    }

    return draft.segments[segmentIndex - 1].end;
}

function getSvgPoint(
    svg: Readonly<SVGSVGElement>,
    event: Readonly<PointerEvent<SVGSVGElement>>
): Point {
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;

    const matrix = svg.getScreenCTM();

    if (matrix === null) {
        return { x: 0, y: 0 };
    }

    const transformedPoint = point.matrixTransform(matrix.inverse());

    return {
        x: Math.min(Math.max(transformedPoint.x, 0), canvasWidth),
        y: Math.min(Math.max(transformedPoint.y, 0), canvasHeight),
    };
}

function createSegment(start: Readonly<Point>, end: Readonly<Point>) {
    const xDistance = end.x - start.x;

    return {
        c1: {
            x: start.x + xDistance * 0.38,
            y: start.y + (end.y - start.y) * 0.18,
        },
        c2: {
            x: end.x - xDistance * 0.38,
            y: end.y - (end.y - start.y) * 0.18,
        },
        end: { ...end },
    };
}

function getAnchors(item: Readonly<LayoutItem>) {
    return {
        bottom: item.y + item.height,
        centerX: item.x + item.width / 2,
        centerY: item.y + item.height / 2,
        left: item.x,
        right: item.x + item.width,
        top: item.y,
    };
}

function getFramePoint(
    frame: Readonly<HTMLDivElement>,
    event: Readonly<PointerEvent<HTMLElement>>
): Point {
    const rect = frame.getBoundingClientRect();

    return {
        x: ((event.clientX - rect.left) / rect.width) * canvasWidth,
        y: ((event.clientY - rect.top) / rect.height) * canvasHeight,
    };
}

function snapLayoutItem(
    item: Readonly<LayoutItem>,
    layout: readonly LayoutItem[]
) {
    let xGuide: SnapGuide | undefined;
    let yGuide: SnapGuide | undefined;
    const anchors = getAnchors(item);
    let nextX = item.x;
    let nextY = item.y;
    let bestXDistance = snapThreshold + 1;
    let bestYDistance = snapThreshold + 1;

    for (const candidate of layout) {
        if (candidate.id === item.id) {
            continue;
        }

        const candidateAnchors = getAnchors(candidate);
        const xPairs = [
            [anchors.left, candidateAnchors.left],
            [anchors.left, candidateAnchors.centerX],
            [anchors.left, candidateAnchors.right],
            [anchors.centerX, candidateAnchors.left],
            [anchors.centerX, candidateAnchors.centerX],
            [anchors.centerX, candidateAnchors.right],
            [anchors.right, candidateAnchors.left],
            [anchors.right, candidateAnchors.centerX],
            [anchors.right, candidateAnchors.right],
        ] as const;
        const yPairs = [
            [anchors.top, candidateAnchors.top],
            [anchors.top, candidateAnchors.centerY],
            [anchors.top, candidateAnchors.bottom],
            [anchors.centerY, candidateAnchors.top],
            [anchors.centerY, candidateAnchors.centerY],
            [anchors.centerY, candidateAnchors.bottom],
            [anchors.bottom, candidateAnchors.top],
            [anchors.bottom, candidateAnchors.centerY],
            [anchors.bottom, candidateAnchors.bottom],
        ] as const;

        for (const [source, target] of xPairs) {
            const distance = Math.abs(source - target);

            if (distance <= snapThreshold && distance < bestXDistance) {
                nextX += target - source;
                bestXDistance = distance;
                xGuide = { axis: 'x', value: target };
            }
        }

        for (const [source, target] of yPairs) {
            const distance = Math.abs(source - target);

            if (distance <= snapThreshold && distance < bestYDistance) {
                nextY += target - source;
                bestYDistance = distance;
                yGuide = { axis: 'y', value: target };
            }
        }
    }

    return {
        guides: [xGuide, yGuide].filter(
            (guide): guide is SnapGuide => guide !== undefined
        ),
        item: {
            ...item,
            x: Math.round(
                Math.min(Math.max(nextX, 0), canvasWidth - item.width)
            ),
            y: Math.round(
                Math.min(Math.max(nextY, 0), canvasHeight - item.height)
            ),
        },
    };
}

export function LandingLineTool(): JSX.Element {
    const [draft, setDraft] = useState<ToolDraft>(createInitialDraft);
    const [mode, setMode] = useState<'layout' | 'node' | 'pen'>('node');
    const [dragTarget, setDragTarget] = useState<DragTarget | undefined>();
    const [layoutDragTarget, setLayoutDragTarget] = useState<
        LayoutDragTarget | undefined
    >();
    const [snapGuides, setSnapGuides] = useState<readonly SnapGuide[]>([]);
    const [status, setStatus] = useState('Unsaved');
    const frameRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const savedDraft =
            localStorage.getItem(storageKey) ??
            localStorage.getItem(legacyStorageKey);

        if (savedDraft === null) {
            return;
        }

        try {
            const parsedDraft = JSON.parse(savedDraft) as
                | CurveDraft
                | ToolDraft;

            if ('curve' in parsedDraft) {
                setDraft({
                    curve: parsedDraft.curve,
                    layout: parsedDraft.layout,
                });
            } else {
                setDraft({
                    curve: parsedDraft,
                    layout: cloneLayout(defaultLayout),
                });
            }

            setStatus('Loaded saved draft');
        } catch {
            setStatus('Saved draft could not be loaded');
        }
    }, []);

    const path = useMemo(() => createPath(draft.curve), [draft.curve]);
    const exportValue = useMemo(() => createExport(draft), [draft]);

    function saveDraft() {
        localStorage.setItem(storageKey, JSON.stringify(draft));
        setStatus('Saved in this browser');
    }

    function resetDraft() {
        setDraft(createInitialDraft());
        setSnapGuides([]);
        setStatus('Reset to current landing curve and layout');
    }

    function copyExport() {
        navigator.clipboard
            .writeText(exportValue)
            .then(() => {
                setStatus('Copied export JSON');
            })
            .catch(() => {
                setStatus('Clipboard access failed');
            });
    }

    function downloadExport() {
        const url = URL.createObjectURL(
            new Blob([exportValue], { type: 'application/json' })
        );
        const link = document.createElement('a');
        link.download = 'repomux-landing-line.json';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        setStatus('Downloaded export JSON');
    }

    function addPoint(event: PointerEvent<SVGSVGElement>) {
        const svg = svgRef.current;

        if (svg === null) {
            return;
        }

        const point = getSvgPoint(svg, event);

        setDraft((currentDraft) => {
            const previous =
                currentDraft.curve.segments.at(-1)?.end ??
                currentDraft.curve.start;

            return {
                ...currentDraft,
                curve: {
                    ...currentDraft.curve,
                    segments: [
                        ...currentDraft.curve.segments,
                        createSegment(previous, point),
                    ],
                },
            };
        });
        setStatus('Point added');
    }

    function startDrag(target: DragTarget) {
        setDragTarget(target);
        setLayoutDragTarget(undefined);
        setMode('node');
    }

    function updateDrag(event: PointerEvent<SVGSVGElement>) {
        const svg = svgRef.current;

        if (svg === null || dragTarget === undefined) {
            return;
        }

        const nextPoint = getSvgPoint(svg, event);

        setDraft((currentDraft) => {
            const nextCurve = cloneDraft(currentDraft.curve);

            if (dragTarget.kind === 'start') {
                const delta = {
                    x: nextPoint.x - nextCurve.start.x,
                    y: nextPoint.y - nextCurve.start.y,
                };

                nextCurve.start = nextPoint;

                const firstSegment = nextCurve.segments.at(0);

                if (firstSegment !== undefined) {
                    firstSegment.c1.x += delta.x;
                    firstSegment.c1.y += delta.y;
                }

                return {
                    ...currentDraft,
                    curve: nextCurve,
                };
            }

            const segment = nextCurve.segments.at(dragTarget.index);

            if (segment === undefined) {
                return currentDraft;
            }

            if (dragTarget.kind === 'end') {
                const delta = {
                    x: nextPoint.x - segment.end.x,
                    y: nextPoint.y - segment.end.y,
                };

                segment.end = nextPoint;
                segment.c2.x += delta.x;
                segment.c2.y += delta.y;

                const nextSegment = nextCurve.segments.at(dragTarget.index + 1);

                if (nextSegment !== undefined) {
                    nextSegment.c1.x += delta.x;
                    nextSegment.c1.y += delta.y;
                }
            } else {
                segment[dragTarget.kind] = nextPoint;
            }

            return {
                ...currentDraft,
                curve: nextCurve,
            };
        });
    }

    function finishDrag() {
        if (dragTarget === undefined) {
            return;
        }

        setDragTarget(undefined);
        setStatus('Adjusted curve');
    }

    function startLayoutDrag(
        item: Readonly<LayoutItem>,
        event: PointerEvent<HTMLElement>
    ) {
        const frame = frameRef.current;

        if (frame === null || mode !== 'layout') {
            return;
        }

        const point = getFramePoint(frame, event);

        setDragTarget(undefined);
        setLayoutDragTarget({
            id: item.id,
            offsetX: point.x - item.x,
            offsetY: point.y - item.y,
        });
        setStatus(`Moving ${item.label}`);
    }

    function updateLayoutDrag(event: PointerEvent<HTMLDivElement>) {
        const frame = frameRef.current;

        if (frame === null || layoutDragTarget === undefined) {
            return;
        }

        const point = getFramePoint(frame, event);

        setDraft((currentDraft) => {
            const currentItem = currentDraft.layout.find(
                (item) => item.id === layoutDragTarget.id
            );

            if (currentItem === undefined) {
                return currentDraft;
            }

            const rawItem = {
                ...currentItem,
                x: Math.round(point.x - layoutDragTarget.offsetX),
                y: Math.round(point.y - layoutDragTarget.offsetY),
            };
            const { guides, item: snappedItem } = snapLayoutItem(
                rawItem,
                currentDraft.layout
            );

            setSnapGuides(guides);

            return {
                ...currentDraft,
                layout: currentDraft.layout.map((item) =>
                    item.id === snappedItem.id ? snappedItem : item
                ),
            };
        });
    }

    function finishLayoutDrag() {
        if (layoutDragTarget === undefined) {
            return;
        }

        setLayoutDragTarget(undefined);
        setSnapGuides([]);
        setStatus('Adjusted layout');
    }

    function renderLayoutItemContent(item: Readonly<LayoutItem>) {
        switch (item.id) {
            case 'automation-copy': {
                return (
                    <div className='line-tool__copy'>
                        <h2>Let Codex pick up the work.</h2>
                        <p>
                            Set up automation with a single prompt in seconds.
                        </p>
                    </div>
                );
            }

            case 'codex-node': {
                return (
                    <div className='line-tool__codex-node'>
                        <span>Codex</span>
                    </div>
                );
            }

            case 'mux-copy': {
                return (
                    <div className='line-tool__copy'>
                        <h2>One workspace for every repo.</h2>
                        <p>
                            Repomux connects your GitHub repositories and
                            surfaces the scattered issues and PRs you need to
                            work through.
                        </p>
                    </div>
                );
            }

            case 'mux-node': {
                return (
                    <div className='line-tool__mux-node'>
                        <img alt='' src='/repomux-logo.svg' />
                    </div>
                );
            }

            case 'prompt-card': {
                return (
                    <div className='line-tool__prompt-card'>
                        <div className='line-tool__prompt-issue'>
                            <span>GitHub issue #128</span>
                            <strong>Polish landing page benefit section</strong>
                        </div>
                        <div className='line-tool__prompt-preview'>
                            {toolPromptLines.map((line) => (
                                <span key={line}>{line}</span>
                            ))}
                        </div>
                    </div>
                );
            }

            case 'prompt-copy': {
                return (
                    <div className='line-tool__copy'>
                        <h2>Add your prompt.</h2>
                        <p>
                            Write the handoff, send it to Codex, then step away.
                        </p>
                    </div>
                );
            }

            case 'queue-card': {
                return (
                    <div className='line-tool__queue-card'>
                        {toolQueueItems.map(
                            ({
                                icon: Icon,
                                meta,
                                number,
                                status: itemStatus,
                                title,
                                type,
                            }) => (
                                <div
                                    className='line-tool__queue-row'
                                    key={title}
                                >
                                    <span className='line-tool__queue-type'>
                                        <Icon
                                            aria-label={
                                                type === 'issue'
                                                    ? 'Issue'
                                                    : 'Pull request'
                                            }
                                            size={18}
                                        />
                                    </span>
                                    <span className='line-tool__queue-content'>
                                        <span className='line-tool__queue-title'>
                                            {title}
                                        </span>
                                        <span className='line-tool__queue-meta'>
                                            {meta} #{number}
                                        </span>
                                    </span>
                                    <span className='line-tool__readiness'>
                                        {itemStatus === 'Ready' ? (
                                            <Check size={18} />
                                        ) : (
                                            <span />
                                        )}
                                    </span>
                                </div>
                            )
                        )}
                    </div>
                );
            }

            case 'queue-copy': {
                return (
                    <div className='line-tool__copy'>
                        <h2>One queue for active work.</h2>
                        <p>
                            See issues and PRs from active repos in one queue.
                        </p>
                    </div>
                );
            }

            case 'repo-row': {
                return (
                    <div className='line-tool__repo-row'>
                        {toolRepositories.map(({ name, owner }) => (
                            <div className='line-tool__repo-card' key={name}>
                                <BookMarked size={18} />
                                <span>{owner}</span>
                                <strong>{name}</strong>
                            </div>
                        ))}
                    </div>
                );
            }

            case 'result-card': {
                return (
                    <div className='line-tool__result-card'>
                        <GitPullRequestArrow size={18} />
                        <span>
                            <strong>Add user menu pop up</strong>
                            <small>Hsiii/create-hsi-app #72</small>
                        </span>
                        <Check size={18} />
                    </div>
                );
            }

            case 'result-copy': {
                return (
                    <div className='line-tool__copy'>
                        <h2>Come back to PRs.</h2>
                        <p>
                            Review the PRs submitted by Codex without leaving
                            the dashboard.
                        </p>
                    </div>
                );
            }
        }
    }

    return (
        <main className='line-tool'>
            <aside className='line-tool__sidebar'>
                <div className='line-tool__header'>
                    <span className='line-tool__eyebrow'>Repomux</span>
                    <h1>Landing line tool</h1>
                </div>

                <div className='line-tool__controls'>
                    <button
                        className={
                            mode === 'pen'
                                ? 'line-tool__button line-tool__button--active'
                                : 'line-tool__button'
                        }
                        onClick={() => {
                            setMode('pen');
                        }}
                        title='Pen tool'
                        type='button'
                    >
                        <PenTool aria-hidden='true' size={16} />
                        <span>Pen</span>
                    </button>
                    <button
                        className={
                            mode === 'node'
                                ? 'line-tool__button line-tool__button--active'
                                : 'line-tool__button'
                        }
                        onClick={() => {
                            setMode('node');
                        }}
                        title='Node tool'
                        type='button'
                    >
                        <MousePointer2 aria-hidden='true' size={16} />
                        <span>Node</span>
                    </button>
                    <button
                        className={
                            mode === 'layout'
                                ? 'line-tool__button line-tool__button--active'
                                : 'line-tool__button'
                        }
                        onClick={() => {
                            setMode('layout');
                        }}
                        title='Layout tool'
                        type='button'
                    >
                        <Move aria-hidden='true' size={16} />
                        <span>Layout</span>
                    </button>
                    <button
                        className='line-tool__button'
                        onClick={saveDraft}
                        title='Save in browser'
                        type='button'
                    >
                        <Save aria-hidden='true' size={16} />
                        <span>Save</span>
                    </button>
                    <button
                        className='line-tool__button'
                        onClick={resetDraft}
                        title='Reset'
                        type='button'
                    >
                        <RotateCcw aria-hidden='true' size={16} />
                        <span>Reset</span>
                    </button>
                    <button
                        className='line-tool__button'
                        onClick={copyExport}
                        title='Copy export'
                        type='button'
                    >
                        <Copy aria-hidden='true' size={16} />
                        <span>Copy</span>
                    </button>
                    <button
                        className='line-tool__button'
                        onClick={downloadExport}
                        title='Download export'
                        type='button'
                    >
                        <Download aria-hidden='true' size={16} />
                        <span>JSON</span>
                    </button>
                </div>

                <p className='line-tool__status'>{status}</p>

                <textarea
                    className='line-tool__export custom-scrollbar'
                    readOnly
                    value={exportValue}
                />
            </aside>

            <section className='line-tool__workspace'>
                <div
                    className={
                        mode === 'layout'
                            ? 'line-tool__canvas-frame line-tool__canvas-frame--layout'
                            : 'line-tool__canvas-frame'
                    }
                    onPointerLeave={finishLayoutDrag}
                    onPointerMove={updateLayoutDrag}
                    onPointerUp={finishLayoutDrag}
                    ref={frameRef}
                >
                    <div className='line-tool__mockup'>
                        {draft.layout.map((item) => (
                            <div
                                aria-label={item.label}
                                className={
                                    layoutDragTarget?.id === item.id
                                        ? 'line-tool__layout-item line-tool__layout-item--active'
                                        : 'line-tool__layout-item'
                                }
                                key={item.id}
                                onPointerDown={(event) => {
                                    startLayoutDrag(item, event);
                                }}
                                role='button'
                                style={{
                                    height: item.height,
                                    left: item.x,
                                    top: item.y,
                                    width: item.width,
                                }}
                                tabIndex={mode === 'layout' ? 0 : -1}
                            >
                                <span className='line-tool__layout-label'>
                                    {item.label}
                                </span>
                                {renderLayoutItemContent(item)}
                            </div>
                        ))}
                    </div>

                    {snapGuides.map((guide) => (
                        <span
                            className={
                                guide.axis === 'x'
                                    ? 'line-tool__snap-guide line-tool__snap-guide--x'
                                    : 'line-tool__snap-guide line-tool__snap-guide--y'
                            }
                            key={`${guide.axis}-${guide.value}`}
                            style={
                                guide.axis === 'x'
                                    ? { left: guide.value }
                                    : { top: guide.value }
                            }
                        />
                    ))}

                    <svg
                        className={
                            mode === 'pen'
                                ? 'line-tool__canvas line-tool__canvas--pen'
                                : 'line-tool__canvas'
                        }
                        height={canvasHeight}
                        onPointerDown={(event) => {
                            if (mode === 'pen') {
                                addPoint(event);
                            }
                        }}
                        onPointerMove={updateDrag}
                        onPointerUp={finishDrag}
                        ref={svgRef}
                        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
                        width={canvasWidth}
                    >
                        <rect
                            className='line-tool__canvas-hit-area'
                            height={canvasHeight}
                            width={canvasWidth}
                        />
                        <path className='line-tool__curve-shadow' d={path} />
                        <path className='line-tool__curve' d={path} />

                        {draft.curve.segments.map((segment, index) => {
                            const previousAnchor = getPreviousAnchor(
                                draft.curve,
                                index
                            );

                            return (
                                <g
                                    key={`${index}-${segment.end.x}-${segment.end.y}`}
                                >
                                    <line
                                        className='line-tool__handle-line'
                                        x1={previousAnchor.x}
                                        x2={segment.c1.x}
                                        y1={previousAnchor.y}
                                        y2={segment.c1.y}
                                    />
                                    <line
                                        className='line-tool__handle-line'
                                        x1={segment.end.x}
                                        x2={segment.c2.x}
                                        y1={segment.end.y}
                                        y2={segment.c2.y}
                                    />
                                    <circle
                                        className='line-tool__handle'
                                        cx={segment.c1.x}
                                        cy={segment.c1.y}
                                        onPointerDown={(event) => {
                                            event.stopPropagation();
                                            startDrag({ index, kind: 'c1' });
                                        }}
                                        r='8'
                                    />
                                    <circle
                                        className='line-tool__handle'
                                        cx={segment.c2.x}
                                        cy={segment.c2.y}
                                        onPointerDown={(event) => {
                                            event.stopPropagation();
                                            startDrag({ index, kind: 'c2' });
                                        }}
                                        r='8'
                                    />
                                    <circle
                                        className='line-tool__node'
                                        cx={segment.end.x}
                                        cy={segment.end.y}
                                        onPointerDown={(event) => {
                                            event.stopPropagation();
                                            startDrag({ index, kind: 'end' });
                                        }}
                                        r='12'
                                    />
                                </g>
                            );
                        })}
                        <circle
                            className='line-tool__node line-tool__node--start'
                            cx={draft.curve.start.x}
                            cy={draft.curve.start.y}
                            onPointerDown={(event) => {
                                event.stopPropagation();
                                startDrag({ index: 0, kind: 'start' });
                            }}
                            r='12'
                        />
                    </svg>
                </div>
            </section>
        </main>
    );
}
