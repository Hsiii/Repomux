'use client';

import type { JSX, PointerEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Copy,
    Download,
    MousePointer2,
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

interface DragTarget {
    index: number;
    kind: 'c1' | 'c2' | 'end' | 'start';
}

const canvasWidth = 1248;
const canvasHeight = 2600;
const storageKey = 'repomux:landing-line-tool:v1';

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

const layoutBlocks = [
    { height: 124, label: 'repo cards', width: 536, x: 504, y: 104 },
    { height: 168, label: 'repomux mark', width: 192, x: 608, y: 528 },
    { height: 216, label: 'work queue', width: 552, x: 108, y: 972 },
    { height: 308, label: 'prompt card', width: 480, x: 552, y: 1576 },
    { height: 136, label: 'codex mark', width: 136, x: 316, y: 1996 },
    { height: 96, label: 'returned PR', width: 520, x: 392, y: 2396 },
] as const;

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

function createExport(draft: Readonly<CurveDraft>): string {
    return JSON.stringify(
        {
            canvas: {
                height: canvasHeight,
                width: canvasWidth,
            },
            normalized: {
                segments: draft.segments.map((segment) => ({
                    c1: normalizePoint(segment.c1),
                    c2: normalizePoint(segment.c2),
                    end: normalizePoint(segment.end),
                })),
                start: normalizePoint(draft.start),
            },
            path: createPath(draft),
            points: draft,
        },
        undefined,
        2
    );
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

export function LandingLineTool(): JSX.Element {
    const [draft, setDraft] = useState(defaultDraft);
    const [mode, setMode] = useState<'node' | 'pen'>('node');
    const [dragTarget, setDragTarget] = useState<DragTarget | undefined>();
    const [status, setStatus] = useState('Unsaved');
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const savedDraft = localStorage.getItem(storageKey);

        if (savedDraft === null) {
            return;
        }

        try {
            setDraft(JSON.parse(savedDraft) as CurveDraft);
            setStatus('Loaded saved draft');
        } catch {
            setStatus('Saved draft could not be loaded');
        }
    }, []);

    const path = useMemo(() => createPath(draft), [draft]);
    const exportValue = useMemo(() => createExport(draft), [draft]);

    function saveDraft() {
        localStorage.setItem(storageKey, JSON.stringify(draft));
        setStatus('Saved in this browser');
    }

    function resetDraft() {
        setDraft(cloneDraft(defaultDraft));
        setStatus('Reset to current landing curve');
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

        if (svg === null || event.target !== svg) {
            return;
        }

        const point = getSvgPoint(svg, event);

        setDraft((currentDraft) => {
            const previous =
                currentDraft.segments.at(-1)?.end ?? currentDraft.start;

            return {
                ...currentDraft,
                segments: [
                    ...currentDraft.segments,
                    createSegment(previous, point),
                ],
            };
        });
        setStatus('Point added');
    }

    function startDrag(target: DragTarget) {
        setDragTarget(target);
        setMode('node');
    }

    function updateDrag(event: PointerEvent<SVGSVGElement>) {
        const svg = svgRef.current;

        if (svg === null || dragTarget === undefined) {
            return;
        }

        const nextPoint = getSvgPoint(svg, event);

        setDraft((currentDraft) => {
            const nextDraft = cloneDraft(currentDraft);

            if (dragTarget.kind === 'start') {
                const delta = {
                    x: nextPoint.x - nextDraft.start.x,
                    y: nextPoint.y - nextDraft.start.y,
                };

                nextDraft.start = nextPoint;

                const firstSegment = nextDraft.segments.at(0);

                if (firstSegment !== undefined) {
                    firstSegment.c1.x += delta.x;
                    firstSegment.c1.y += delta.y;
                }

                return nextDraft;
            }

            const segment = nextDraft.segments.at(dragTarget.index);

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

                const nextSegment = nextDraft.segments.at(dragTarget.index + 1);

                if (nextSegment !== undefined) {
                    nextSegment.c1.x += delta.x;
                    nextSegment.c1.y += delta.y;
                }
            } else {
                segment[dragTarget.kind] = nextPoint;
            }

            return nextDraft;
        });
    }

    function finishDrag() {
        if (dragTarget === undefined) {
            return;
        }

        setDragTarget(undefined);
        setStatus('Adjusted curve');
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
                        className='line-tool__canvas-bg'
                        height={canvasHeight}
                        width={canvasWidth}
                    />
                    {layoutBlocks.map((block) => (
                        <g key={block.label}>
                            <rect
                                className='line-tool__layout-block'
                                height={block.height}
                                rx='8'
                                width={block.width}
                                x={block.x}
                                y={block.y}
                            />
                            <text
                                className='line-tool__layout-label'
                                x={block.x + 16}
                                y={block.y + 32}
                            >
                                {block.label}
                            </text>
                        </g>
                    ))}

                    <path className='line-tool__curve-shadow' d={path} />
                    <path className='line-tool__curve' d={path} />

                    {draft.segments.map((segment, index) => {
                        const previousAnchor = getPreviousAnchor(draft, index);

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
                        cx={draft.start.x}
                        cy={draft.start.y}
                        onPointerDown={(event) => {
                            event.stopPropagation();
                            startDrag({ index: 0, kind: 'start' });
                        }}
                        r='12'
                    />
                </svg>
            </section>
        </main>
    );
}
