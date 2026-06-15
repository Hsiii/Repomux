'use client';

import type { CSSProperties, JSX, PointerEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    BookMarked,
    Check,
    CircleDot,
    GitPullRequestArrow,
    MousePointer2,
    PenTool,
    RotateCcw,
    Save,
} from 'lucide-react';

import { BrandLogo } from './BrandLogo';
import { CodexMark } from './CodexMark';

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

type RepoCurveId = 'repo-1' | 'repo-2' | 'repo-3';

type CurveTargetId = 'main' | RepoCurveId;

interface RepoCurve {
    curve: CurveDraft;
    id: RepoCurveId;
    label: string;
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
    layer?: number;
    width: number;
    x: number;
    y: number;
}

interface SnapRect {
    height: number;
    width: number;
    x: number;
    y: number;
}

interface ToolDraft {
    curve: CurveDraft;
    layout: readonly LayoutItem[];
    lineColors: Readonly<Record<CurveTargetId, string>>;
    repoCurves: readonly RepoCurve[];
}

interface StoredToolDraft {
    curve: CurveDraft;
    layout: readonly LayoutItem[];
    lineColors?: Readonly<Record<CurveTargetId, string>>;
    repoCurves?: readonly RepoCurve[];
}

interface DragTarget {
    curveId: CurveTargetId;
    index: number;
    kind: 'c1' | 'c2' | 'end' | 'start';
}

interface SelectedNode {
    curveId: CurveTargetId;
    index: number;
    kind: 'end' | 'start';
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

interface PointSnapResult {
    guides: readonly SnapGuide[];
    point: Point;
}

const canvasWidth = 1248;
const canvasHeight = 2600;
const defaultLineColors: Readonly<Record<CurveTargetId, string>> = {
    'main': '#a78bfa',
    'repo-1': '#04a5e5',
    'repo-2': '#ff7ab6',
    'repo-3': '#8839ef',
};
const lineColorOptions = Object.values(defaultLineColors);
const repoCardGap = 16;
const snapThreshold = 12;
const legacyStorageKeys: readonly string[] = [];
const storageKey = 'repomux:landing-line-tool:v7';

const defaultDraft: CurveDraft = {
    start: { x: 575, y: 726 },
    segments: [
        {
            c1: { x: 563, y: 898 },
            c2: { x: 235, y: 941 },
            end: { x: 301, y: 1077 },
        },
        {
            c1: { x: 311, y: 1265 },
            c2: { x: 955, y: 1388 },
            end: { x: 914, y: 1578 },
        },
        {
            c1: { x: 1086, y: 1698 },
            c2: { x: 715, y: 1434 },
            end: { x: 913, y: 1579 },
        },
        {
            c1: { x: 921, y: 1829 },
            c2: { x: 52, y: 2188 },
            end: { x: -260, y: 2260 },
        },
        {
            c1: { x: -664, y: 2360 },
            c2: { x: -608, y: 2540 },
            end: { x: -284, y: 2540 },
        },
        {
            c1: { x: 116, y: 2540 },
            c2: { x: 620, y: 2552 },
            end: { x: 829, y: 2424 },
        },
    ],
};

const defaultRepoCurves: readonly RepoCurve[] = [
    {
        curve: {
            segments: [
                {
                    c1: { x: 700, y: 371 },
                    c2: { x: 577, y: 438 },
                    end: { x: 575, y: 566 },
                },
            ],
            start: { x: 700, y: 227 },
        },
        id: 'repo-1',
        label: 'Repo 1 to mux',
    },
    {
        curve: {
            segments: [
                {
                    c1: { x: 884, y: 356 },
                    c2: { x: 562, y: 448 },
                    end: { x: 575, y: 566 },
                },
            ],
            start: { x: 880, y: 229 },
        },
        id: 'repo-2',
        label: 'Repo 2 to mux',
    },
    {
        curve: {
            segments: [
                {
                    c1: { x: 1060, y: 371 },
                    c2: { x: 576, y: 449 },
                    end: { x: 575, y: 562 },
                },
            ],
            start: { x: 1060, y: 227 },
        },
        id: 'repo-3',
        label: 'Repo 3 to mux',
    },
];

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
        height: 84,
        id: 'repo-row',
        label: 'Repository cards',
        width: 536,
        x: 632,
        y: 150,
    },
    {
        height: 168,
        id: 'mux-node',
        label: 'Repomux node',
        width: 168,
        x: 504,
        y: 575,
    },
    {
        height: 278,
        id: 'queue-card',
        label: 'Work queue',
        width: 552,
        x: 80,
        y: 958,
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
        x: 240,
        y: 1544,
    },
    {
        height: 416,
        id: 'prompt-card',
        label: 'Prompt card',
        width: 480,
        x: 688,
        y: 1432,
    },
    {
        height: 112,
        id: 'codex-node',
        label: 'Codex node',
        width: 112,
        x: 244,
        y: 2076,
    },
    {
        height: 144,
        id: 'automation-copy',
        label: 'Automation copy',
        width: 360,
        x: 524,
        y: 2071,
    },
    {
        height: 152,
        id: 'result-copy',
        label: 'Result copy',
        width: 392,
        x: 116,
        y: 2362,
    },
    {
        height: 92,
        id: 'result-card',
        label: 'Returned PR',
        width: 518,
        x: 589,
        y: 2392,
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

function cloneRepoCurves(
    repoCurves: readonly RepoCurve[]
): readonly RepoCurve[] {
    return repoCurves.map((repoCurve) => ({
        ...repoCurve,
        curve: cloneDraft(repoCurve.curve),
    }));
}

function cloneLayout(layout: readonly LayoutItem[]): readonly LayoutItem[] {
    return layout.map((item) => ({ ...item }));
}

function getDefaultLayoutLayer(itemId: LayoutItemId): number {
    return defaultLayout.findIndex(({ id }) => id === itemId) + 1;
}

function alignLayoutDimensions(
    layout: readonly LayoutItem[]
): readonly LayoutItem[] {
    return layout.map((item) => {
        const defaultItem = defaultLayout.find(({ id }) => id === item.id);

        if (defaultItem === undefined) {
            return { ...item };
        }

        return {
            ...item,
            height: defaultItem.height,
            layer: item.layer ?? getDefaultLayoutLayer(item.id),
            width: defaultItem.width,
        };
    });
}

function raiseLayoutItem(
    layout: readonly LayoutItem[],
    itemId: LayoutItemId
): readonly LayoutItem[] {
    const highestLayer = Math.max(
        ...layout.map((item) => item.layer ?? getDefaultLayoutLayer(item.id))
    );

    return layout.map((item) =>
        item.id === itemId ? { ...item, layer: highestLayer + 1 } : item
    );
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

function createInitialDraft(): ToolDraft {
    return {
        curve: cloneDraft(defaultDraft),
        layout: cloneLayout(defaultLayout),
        lineColors: { ...defaultLineColors },
        repoCurves: cloneRepoCurves(defaultRepoCurves),
    };
}

function getStoredDraft(): string | undefined {
    const savedDraft = localStorage.getItem(storageKey);

    if (savedDraft !== null) {
        return savedDraft;
    }

    for (const key of legacyStorageKeys) {
        const legacyDraft = localStorage.getItem(key);

        if (legacyDraft !== null) {
            return legacyDraft;
        }
    }

    return undefined;
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

function updateCurveWithDrag(
    curve: Readonly<CurveDraft>,
    target: Readonly<DragTarget>,
    nextPoint: Readonly<Point>
): CurveDraft {
    const nextCurve = cloneDraft(curve);

    if (target.kind === 'start') {
        const delta = {
            x: nextPoint.x - nextCurve.start.x,
            y: nextPoint.y - nextCurve.start.y,
        };

        nextCurve.start = { ...nextPoint };

        const firstSegment = nextCurve.segments.at(0);

        if (firstSegment !== undefined) {
            firstSegment.c1.x += delta.x;
            firstSegment.c1.y += delta.y;
        }

        return nextCurve;
    }

    const segment = nextCurve.segments.at(target.index);

    if (segment === undefined) {
        return nextCurve;
    }

    if (target.kind === 'end') {
        const delta = {
            x: nextPoint.x - segment.end.x,
            y: nextPoint.y - segment.end.y,
        };

        segment.end = { ...nextPoint };
        segment.c2.x += delta.x;
        segment.c2.y += delta.y;

        const nextSegment = nextCurve.segments.at(target.index + 1);

        if (nextSegment !== undefined) {
            nextSegment.c1.x += delta.x;
            nextSegment.c1.y += delta.y;
        }
    } else {
        segment[target.kind] = { ...nextPoint };
    }

    return nextCurve;
}

function deleteNodeFromCurve(
    curve: Readonly<CurveDraft>,
    target: Readonly<SelectedNode>
): CurveDraft {
    const nextCurve = cloneDraft(curve);

    if (target.kind === 'start') {
        const firstSegment = nextCurve.segments.at(0);

        if (firstSegment === undefined) {
            return nextCurve;
        }

        nextCurve.start = { ...firstSegment.end };
        nextCurve.segments = nextCurve.segments.slice(1);

        return nextCurve;
    }

    nextCurve.segments = nextCurve.segments.filter(
        (_segment, index) => index !== target.index
    );

    return nextCurve;
}

function getAnchors(item: Readonly<SnapRect>) {
    return {
        bottom: item.y + item.height,
        centerX: item.x + item.width / 2,
        centerY: item.y + item.height / 2,
        left: item.x,
        right: item.x + item.width,
        top: item.y,
    };
}

function getBorderCenterPoints(item: Readonly<SnapRect>): readonly Point[] {
    const anchors = getAnchors(item);

    return [
        { x: anchors.centerX, y: anchors.top },
        { x: anchors.right, y: anchors.centerY },
        { x: anchors.centerX, y: anchors.bottom },
        { x: anchors.left, y: anchors.centerY },
    ];
}

function getSnapRects(layout: readonly LayoutItem[]): readonly SnapRect[] {
    return layout.flatMap((item) => {
        if (item.id !== 'repo-row') {
            return [item];
        }

        const repoCount = toolRepositories.length;
        const repoCardWidth =
            (item.width - repoCardGap * (repoCount - 1)) / repoCount;

        return Array.from({ length: repoCount }, (_, index) => ({
            height: item.height,
            width: repoCardWidth,
            x: item.x + index * (repoCardWidth + repoCardGap),
            y: item.y,
        }));
    });
}

function getElementSnapRects(
    frame: Readonly<HTMLDivElement>,
    coordinateElement: Readonly<Element>
): readonly SnapRect[] {
    const svgRect = coordinateElement.getBoundingClientRect();
    const snapElements = frame.querySelectorAll<HTMLElement>(
        '.line-tool__layout-item, .line-tool__repo-snap-target'
    );

    return [...snapElements].map((element) => {
        const rect = element.getBoundingClientRect();

        return {
            height: (rect.height / svgRect.height) * canvasHeight,
            width: (rect.width / svgRect.width) * canvasWidth,
            x: ((rect.left - svgRect.left) / svgRect.width) * canvasWidth,
            y: ((rect.top - svgRect.top) / svgRect.height) * canvasHeight,
        };
    });
}

function snapPointToRects(
    point: Readonly<Point>,
    snapRects: readonly SnapRect[]
): PointSnapResult {
    let snappedPoint = { ...point };
    let shortestDistance = snapThreshold + 1;

    for (const item of snapRects) {
        for (const snapPoint of getBorderCenterPoints(item)) {
            const xDistance = point.x - snapPoint.x;
            const yDistance = point.y - snapPoint.y;
            const distance = Math.hypot(xDistance, yDistance);

            if (distance <= snapThreshold && distance < shortestDistance) {
                snappedPoint = { ...snapPoint };
                shortestDistance = distance;
            }
        }
    }

    return {
        guides:
            shortestDistance <= snapThreshold
                ? [
                      { axis: 'x', value: snappedPoint.x },
                      { axis: 'y', value: snappedPoint.y },
                  ]
                : [],
        point: snappedPoint,
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
    const [mode, setMode] = useState<'node' | 'pen'>('node');
    const [activeCurveId, setActiveCurveId] = useState<CurveTargetId>('main');
    const [dragTarget, setDragTarget] = useState<DragTarget | undefined>();
    const [layoutDragTarget, setLayoutDragTarget] = useState<
        LayoutDragTarget | undefined
    >();
    const [selectedNode, setSelectedNode] = useState<
        SelectedNode | undefined
    >();
    const [snapGuides, setSnapGuides] = useState<readonly SnapGuide[]>([]);
    const [status, setStatus] = useState('Unsaved');
    const frameRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const savedDraft = getStoredDraft();

        if (savedDraft === undefined) {
            return;
        }

        try {
            const parsedDraft = JSON.parse(savedDraft) as
                | CurveDraft
                | StoredToolDraft;

            if ('curve' in parsedDraft) {
                setDraft({
                    curve: parsedDraft.curve,
                    layout: alignLayoutDimensions(parsedDraft.layout),
                    lineColors: {
                        ...defaultLineColors,
                        ...parsedDraft.lineColors,
                    },
                    repoCurves:
                        parsedDraft.repoCurves ??
                        cloneRepoCurves(defaultRepoCurves),
                });
            } else {
                setDraft({
                    curve: parsedDraft,
                    layout: alignLayoutDimensions(defaultLayout),
                    lineColors: { ...defaultLineColors },
                    repoCurves: cloneRepoCurves(defaultRepoCurves),
                });
            }

            setStatus('Loaded saved draft');
        } catch {
            setStatus('Saved draft could not be loaded');
        }
    }, []);

    const path = useMemo(() => createPath(draft.curve), [draft.curve]);
    const activeLineColor = draft.lineColors[activeCurveId];

    useEffect(() => {
        function deleteSelectedNode(event: KeyboardEvent) {
            if (
                selectedNode === undefined ||
                (event.key !== 'Backspace' && event.key !== 'Delete')
            ) {
                return;
            }

            const { target } = event;

            if (
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                target instanceof HTMLSelectElement
            ) {
                return;
            }

            event.preventDefault();
            setDraft((currentDraft) => {
                if (selectedNode.curveId === 'main') {
                    return {
                        ...currentDraft,
                        curve: deleteNodeFromCurve(
                            currentDraft.curve,
                            selectedNode
                        ),
                    };
                }

                return {
                    ...currentDraft,
                    repoCurves: currentDraft.repoCurves.map((repoCurve) =>
                        repoCurve.id === selectedNode.curveId
                            ? {
                                  ...repoCurve,
                                  curve: deleteNodeFromCurve(
                                      repoCurve.curve,
                                      selectedNode
                                  ),
                              }
                            : repoCurve
                    ),
                };
            });
            setSelectedNode(undefined);
            setSnapGuides([]);
            setStatus('Deleted node');
        }

        globalThis.addEventListener('keydown', deleteSelectedNode);

        return () => {
            globalThis.removeEventListener('keydown', deleteSelectedNode);
        };
    }, [selectedNode]);

    function saveDraft() {
        localStorage.setItem(storageKey, JSON.stringify(draft));
        setStatus('Saved context');
    }

    function resetDraft() {
        setDraft(createInitialDraft());
        setActiveCurveId('main');
        setSelectedNode(undefined);
        setSnapGuides([]);
        setStatus('Reset to current landing curve and layout');
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
        setActiveCurveId(target.curveId);
        setSelectedNode(
            target.kind === 'start' || target.kind === 'end'
                ? {
                      curveId: target.curveId,
                      index: target.index,
                      kind: target.kind,
                  }
                : undefined
        );
        setSnapGuides([]);
        setMode('node');
    }

    function updateActiveLineColor(color: string) {
        setDraft((currentDraft) => ({
            ...currentDraft,
            lineColors: {
                ...currentDraft.lineColors,
                [activeCurveId]: color,
            },
        }));
        setStatus('Changed line color');
    }

    function getLineStyle(curveId: CurveTargetId): CSSProperties {
        const color = draft.lineColors[curveId];

        return {
            color,
            stroke: color,
        };
    }

    function getNodeClassName(
        curveId: CurveTargetId,
        kind: SelectedNode['kind'],
        index: number
    ) {
        const isSelected =
            selectedNode?.curveId === curveId &&
            selectedNode.kind === kind &&
            selectedNode.index === index;
        const classNames = ['line-tool__node'];

        if (kind === 'start') {
            classNames.push('line-tool__node--start');
        }

        if (isSelected) {
            classNames.push('line-tool__node--selected');
        }

        return classNames.join(' ');
    }

    function updateCurveDrag(rawPoint: Readonly<Point>) {
        if (dragTarget === undefined) {
            return;
        }

        const svg = svgRef.current;
        const frame = frameRef.current;

        setDraft((currentDraft) => {
            const { guides, point: nextPoint } =
                dragTarget.kind === 'start' || dragTarget.kind === 'end'
                    ? snapPointToRects(
                          rawPoint,
                          frame === null
                              ? getSnapRects(currentDraft.layout)
                              : getElementSnapRects(frame, svg ?? frame)
                      )
                    : { guides: [], point: rawPoint };

            setSnapGuides(guides);

            if (dragTarget.curveId === 'main') {
                return {
                    ...currentDraft,
                    curve: updateCurveWithDrag(
                        currentDraft.curve,
                        dragTarget,
                        nextPoint
                    ),
                };
            }

            return {
                ...currentDraft,
                repoCurves: currentDraft.repoCurves.map((repoCurve) =>
                    repoCurve.id === dragTarget.curveId
                        ? {
                              ...repoCurve,
                              curve: updateCurveWithDrag(
                                  repoCurve.curve,
                                  dragTarget,
                                  nextPoint
                              ),
                          }
                        : repoCurve
                ),
            };
        });
    }

    function updateDrag(event: PointerEvent<SVGSVGElement>) {
        const svg = svgRef.current;

        if (svg === null || dragTarget === undefined) {
            return;
        }

        updateCurveDrag(getSvgPoint(svg, event));
    }

    function updateFrameDrag(event: PointerEvent<HTMLDivElement>) {
        const frame = frameRef.current;

        if (frame === null) {
            return;
        }

        if (dragTarget !== undefined) {
            updateCurveDrag(getFramePoint(frame, event));
            return;
        }

        updateLayoutDrag(event);
    }

    function finishFrameDrag() {
        if (dragTarget !== undefined) {
            finishDrag();
            return;
        }

        finishLayoutDrag();
    }

    function finishDrag() {
        if (dragTarget === undefined) {
            return;
        }

        setDragTarget(undefined);
        setSnapGuides([]);
        setStatus('Adjusted curve');
    }

    function startLayoutDrag(
        item: Readonly<LayoutItem>,
        event: PointerEvent<HTMLElement>
    ) {
        const frame = frameRef.current;

        if (frame === null || mode !== 'node') {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        const point = getFramePoint(frame, event);

        setDragTarget(undefined);
        setLayoutDragTarget({
            id: item.id,
            offsetX: point.x - item.x,
            offsetY: point.y - item.y,
        });
        setDraft((currentDraft) => ({
            ...currentDraft,
            layout: raiseLayoutItem(currentDraft.layout, item.id),
        }));
        setSelectedNode(undefined);
        setStatus(`Moving ${item.label}`);
    }

    function updateLayoutDrag(event: PointerEvent<HTMLElement>) {
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

    function renderCurveControls(
        curve: Readonly<CurveDraft>,
        curveId: CurveTargetId
    ) {
        return (
            <>
                {curve.segments.map((segment, index) => {
                    const previousAnchor = getPreviousAnchor(curve, index);

                    return (
                        <g
                            key={`${curveId}-${index}-${segment.end.x}-${segment.end.y}`}
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
                                    event.currentTarget.setPointerCapture(
                                        event.pointerId
                                    );
                                    startDrag({ curveId, index, kind: 'c1' });
                                }}
                                r='8'
                            />
                            <circle
                                className='line-tool__handle'
                                cx={segment.c2.x}
                                cy={segment.c2.y}
                                onPointerDown={(event) => {
                                    event.stopPropagation();
                                    event.currentTarget.setPointerCapture(
                                        event.pointerId
                                    );
                                    startDrag({ curveId, index, kind: 'c2' });
                                }}
                                r='8'
                            />
                            <circle
                                className={getNodeClassName(
                                    curveId,
                                    'end',
                                    index
                                )}
                                cx={segment.end.x}
                                cy={segment.end.y}
                                onPointerDown={(event) => {
                                    event.stopPropagation();
                                    event.currentTarget.setPointerCapture(
                                        event.pointerId
                                    );
                                    startDrag({ curveId, index, kind: 'end' });
                                }}
                                r='12'
                            />
                        </g>
                    );
                })}
                <circle
                    className={getNodeClassName(curveId, 'start', 0)}
                    cx={curve.start.x}
                    cy={curve.start.y}
                    onPointerDown={(event) => {
                        event.stopPropagation();
                        event.currentTarget.setPointerCapture(event.pointerId);
                        startDrag({ curveId, index: 0, kind: 'start' });
                    }}
                    r='12'
                />
            </>
        );
    }

    function renderCurveHitControls(
        curve: Readonly<CurveDraft>,
        curveId: CurveTargetId
    ) {
        const createControlStyle = (point: Readonly<Point>): CSSProperties => ({
            left: `${(point.x / canvasWidth) * 100}%`,
            top: `${(point.y / canvasHeight) * 100}%`,
        });

        return (
            <>
                {curve.segments.map((segment, index) => (
                    <span
                        className='line-tool__control-hit-group'
                        key={`${curveId}-${index}-hit`}
                    >
                        <button
                            aria-label='Move curve handle'
                            className='line-tool__control-hit line-tool__control-hit--handle'
                            onPointerDown={(event) => {
                                event.stopPropagation();
                                event.currentTarget.setPointerCapture(
                                    event.pointerId
                                );
                                startDrag({ curveId, index, kind: 'c1' });
                            }}
                            style={createControlStyle(segment.c1)}
                            type='button'
                        />
                        <button
                            aria-label='Move curve handle'
                            className='line-tool__control-hit line-tool__control-hit--handle'
                            onPointerDown={(event) => {
                                event.stopPropagation();
                                event.currentTarget.setPointerCapture(
                                    event.pointerId
                                );
                                startDrag({ curveId, index, kind: 'c2' });
                            }}
                            style={createControlStyle(segment.c2)}
                            type='button'
                        />
                        <button
                            aria-label='Move curve node'
                            className='line-tool__control-hit line-tool__control-hit--node'
                            onPointerDown={(event) => {
                                event.stopPropagation();
                                event.currentTarget.setPointerCapture(
                                    event.pointerId
                                );
                                startDrag({ curveId, index, kind: 'end' });
                            }}
                            style={createControlStyle(segment.end)}
                            type='button'
                        />
                    </span>
                ))}
                <button
                    aria-label='Move curve start node'
                    className='line-tool__control-hit line-tool__control-hit--node'
                    onPointerDown={(event) => {
                        event.stopPropagation();
                        event.currentTarget.setPointerCapture(event.pointerId);
                        startDrag({ curveId, index: 0, kind: 'start' });
                    }}
                    style={createControlStyle(curve.start)}
                    type='button'
                />
            </>
        );
    }

    function renderLayoutItemContent(item: Readonly<LayoutItem>) {
        switch (item.id) {
            case 'automation-copy': {
                return (
                    <div className='login-wall__feature-copy line-tool__landing-copy'>
                        <h2 className='login-wall__feature-heading--nowrap'>
                            Let Codex pick it up
                        </h2>
                        <p>
                            Set up automation with a single prompt in seconds.
                        </p>
                    </div>
                );
            }

            case 'codex-node': {
                return (
                    <div className='line-tool__codex-node'>
                        <CodexMark className='login-wall__mux-codex' />
                    </div>
                );
            }

            case 'mux-copy': {
                return (
                    <div className='login-wall__feature-copy line-tool__landing-copy'>
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
                        <BrandLogo
                            alt='Repomux'
                            className='login-wall__flow-mux-logo'
                        />
                    </div>
                );
            }

            case 'prompt-card': {
                return (
                    <div className='login-wall__prompt-card line-tool__prompt-card'>
                        <div className='login-wall__prompt-issue'>
                            <span className='login-wall__prompt-issue-label'>
                                GitHub issue #128
                            </span>
                            <span className='login-wall__prompt-issue-title'>
                                Polish landing page benefit section
                            </span>
                        </div>
                        <div className='login-wall__prompt-editor'>
                            <div className='prompt-input login-wall__prompt-preview line-tool__prompt-preview'>
                                {toolPromptLines.map((line) => (
                                    <span key={line}>{line}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            }

            case 'prompt-copy': {
                return (
                    <div className='login-wall__feature-copy line-tool__landing-copy'>
                        <h2>Add your prompt.</h2>
                        <p>
                            Write the handoff, send it to Codex, then step away.
                        </p>
                    </div>
                );
            }

            case 'queue-card': {
                return (
                    <section className='work-panel login-wall__work-panel-preview line-tool__work-panel-preview'>
                        <div className='custom-scrollbar work-panel__queue-scroll'>
                            <div className='queue-list'>
                                {toolQueueItems.map(
                                    ({
                                        icon: Icon,
                                        meta,
                                        number,
                                        status: itemStatus,
                                        title,
                                        type,
                                    }) => (
                                        <div className='queue-row' key={title}>
                                            <span className='queue-row__type'>
                                                <Icon
                                                    aria-label={
                                                        type === 'issue'
                                                            ? 'Issue'
                                                            : 'Pull request'
                                                    }
                                                    size={18}
                                                />
                                            </span>
                                            <span className='queue-row__content'>
                                                <span className='queue-row__title'>
                                                    {title}
                                                </span>
                                                <span className='queue-row__meta'>
                                                    <span className='queue-row__repo'>
                                                        {meta}
                                                    </span>
                                                    <span className='queue-row__number'>
                                                        #{number}
                                                    </span>
                                                </span>
                                            </span>
                                            <span className='readiness'>
                                                {itemStatus === 'Ready' ? (
                                                    <Check size={18} />
                                                ) : (
                                                    <span className='readiness__empty' />
                                                )}
                                            </span>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </section>
                );
            }

            case 'queue-copy': {
                return (
                    <div className='login-wall__feature-copy line-tool__landing-copy'>
                        <h2>One queue for active work.</h2>
                        <p>Check work items at a glance.</p>
                    </div>
                );
            }

            case 'repo-row': {
                return (
                    <div className='login-wall__repo-row line-tool__repo-row'>
                        {toolRepositories.map(({ name, owner }) => (
                            <div
                                className='login-wall__mux-repo line-tool__repo-snap-target'
                                key={name}
                            >
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
                    <div className='queue-list line-tool__result-list'>
                        <div className='queue-row login-wall__pr-card line-tool__result-card'>
                            <span className='queue-row__type'>
                                <GitPullRequestArrow
                                    aria-label='Pull request'
                                    size={18}
                                />
                            </span>
                            <span className='queue-row__content'>
                                <span className='queue-row__title'>
                                    Add user menu pop up
                                </span>
                                <span className='queue-row__meta'>
                                    <span className='queue-row__repo'>
                                        Hsiii/create-hsi-app
                                    </span>
                                    <span className='queue-row__number'>
                                        #72
                                    </span>
                                </span>
                            </span>
                            <span className='readiness'>
                                <Check size={18} />
                            </span>
                        </div>
                    </div>
                );
            }

            case 'result-copy': {
                return (
                    <div className='login-wall__feature-copy line-tool__landing-copy'>
                        <h2 className='login-wall__feature-heading--nowrap'>
                            Come back to PRs.
                        </h2>
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
            <section className='line-tool__workspace'>
                <div className='line-tool__toolbar'>
                    <div
                        aria-label='Tool mode'
                        className='line-tool__toolbar-group'
                        role='group'
                    >
                        <button
                            aria-label='Pen tool'
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
                        </button>
                        <button
                            aria-label='Node tool'
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
                        </button>
                    </div>
                    <div
                        aria-label='Draft actions'
                        className='line-tool__toolbar-group'
                        role='group'
                    >
                        {lineColorOptions.map((color) => (
                            <button
                                aria-label={`Set line color ${color}`}
                                className={
                                    activeLineColor === color
                                        ? 'line-tool__color-swatch line-tool__color-swatch--active'
                                        : 'line-tool__color-swatch'
                                }
                                key={color}
                                onClick={() => {
                                    updateActiveLineColor(color);
                                }}
                                style={{ backgroundColor: color }}
                                title={`Set line color ${color}`}
                                type='button'
                            />
                        ))}
                        <button
                            aria-label='Save context'
                            className='line-tool__button'
                            onClick={saveDraft}
                            title='Save context'
                            type='button'
                        >
                            <Save aria-hidden='true' size={16} />
                        </button>
                        <button
                            aria-label='Reset draft'
                            className='line-tool__button'
                            onClick={resetDraft}
                            title='Reset draft'
                            type='button'
                        >
                            <RotateCcw aria-hidden='true' size={16} />
                        </button>
                    </div>
                    <p className='line-tool__status'>{status}</p>
                </div>

                <div
                    className={
                        mode === 'node'
                            ? 'line-tool__canvas-frame line-tool__canvas-frame--node'
                            : 'line-tool__canvas-frame'
                    }
                    onPointerLeave={finishFrameDrag}
                    onPointerMove={updateFrameDrag}
                    onPointerUp={finishFrameDrag}
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
                                role='button'
                                style={{
                                    height: item.height,
                                    left: item.x,
                                    top: item.y,
                                    width: item.width,
                                    zIndex:
                                        item.layer ??
                                        getDefaultLayoutLayer(item.id),
                                }}
                                tabIndex={mode === 'node' ? 0 : -1}
                            >
                                <span className='line-tool__layout-label'>
                                    {item.label}
                                </span>
                                {renderLayoutItemContent(item)}
                                <span
                                    aria-hidden='true'
                                    className='line-tool__layout-drag-hit'
                                    onLostPointerCapture={finishLayoutDrag}
                                    onPointerDown={(event) => {
                                        startLayoutDrag(item, event);
                                    }}
                                    onPointerMove={updateLayoutDrag}
                                    onPointerUp={finishLayoutDrag}
                                />
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
                        {draft.repoCurves.map((repoCurve) => (
                            <path
                                className={`line-tool__repo-curve line-tool__repo-curve--${repoCurve.id}`}
                                d={createPath(repoCurve.curve)}
                                key={repoCurve.id}
                                style={getLineStyle(repoCurve.id)}
                            />
                        ))}
                        <path
                            className='line-tool__curve-shadow'
                            d={path}
                            style={getLineStyle('main')}
                        />
                        <path
                            className='line-tool__curve'
                            d={path}
                            style={getLineStyle('main')}
                        />

                        {draft.repoCurves.map((repoCurve) => (
                            <g key={`${repoCurve.id}-controls`}>
                                {renderCurveControls(
                                    repoCurve.curve,
                                    repoCurve.id
                                )}
                            </g>
                        ))}
                        {renderCurveControls(draft.curve, 'main')}
                    </svg>
                    <div className='line-tool__control-layer'>
                        {draft.repoCurves.map((repoCurve) => (
                            <span key={`${repoCurve.id}-hit-controls`}>
                                {renderCurveHitControls(
                                    repoCurve.curve,
                                    repoCurve.id
                                )}
                            </span>
                        ))}
                        {renderCurveHitControls(draft.curve, 'main')}
                    </div>
                </div>
            </section>
        </main>
    );
}
