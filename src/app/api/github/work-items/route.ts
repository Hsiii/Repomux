import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
    fetchWorkItems,
    getGitHubTokenFromRequest,
} from '../../../../lib/server/github';

export async function GET(request: NextRequest): Promise<NextResponse> {
    const token = getGitHubTokenFromRequest(request);

    if (token === undefined || token === '') {
        return NextResponse.json(
            { error: 'GitHub connection required.' },
            { status: 401 }
        );
    }

    const repositories = request.nextUrl.searchParams
        .getAll('repo')
        .map((repository) => repository.trim())
        .filter((repository) => repository !== '');

    if (repositories.length === 0) {
        return NextResponse.json([]);
    }

    try {
        const items = await fetchWorkItems(repositories, token);

        return NextResponse.json(items);
    } catch (error: unknown) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Unable to load work items.',
            },
            { status: 500 }
        );
    }
}
