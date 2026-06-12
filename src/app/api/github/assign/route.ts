import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
    assignToCodex,
    getGitHubTokenFromRequest,
} from '../../../../lib/server/github';

export async function POST(request: NextRequest): Promise<NextResponse> {
    const token = getGitHubTokenFromRequest(request);

    if (token === undefined || token === '') {
        return NextResponse.json(
            { error: 'GitHub connection required.' },
            { status: 401 }
        );
    }

    const payload = (await request.json()) as {
        number?: number;
        prompt?: string;
        repo?: string;
    };

    if (
        typeof payload.repo !== 'string' ||
        payload.repo.trim() === '' ||
        typeof payload.number !== 'number' ||
        !Number.isInteger(payload.number) ||
        typeof payload.prompt !== 'string'
    ) {
        return NextResponse.json(
            { error: 'Invalid assignment payload.' },
            { status: 400 }
        );
    }

    try {
        await assignToCodex(
            token,
            {
                number: payload.number,
                repo: payload.repo.trim(),
            },
            payload.prompt
        );

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Unable to assign work.',
            },
            { status: 500 }
        );
    }
}
