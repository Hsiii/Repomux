import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function assertSameOriginRequest(
    request: NextRequest
): NextResponse | undefined {
    const origin = request.headers.get('origin');

    if (origin === null || origin !== request.nextUrl.origin) {
        return NextResponse.json(
            { error: 'Same-origin request required.' },
            { status: 403 }
        );
    }

    return undefined;
}
