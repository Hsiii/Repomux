import { corsHeaders } from '../_shared/cors.ts';

interface GitHubTokenResponse {
    access_token?: string;
    error?: string;
    error_description?: string;
    scope?: string;
    token_type?: string;
}

interface TokenRequestBody {
    code?: string;
    redirectUri?: string;
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
    return Response.json(body, {
        ...init,
        headers: {
            ...corsHeaders,
            ...init.headers,
        },
    });
}

Deno.serve(async (request) => {
    if (request.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
    }

    const clientId = Deno.env.get('GITHUB_CLIENT_ID');
    const clientSecret = Deno.env.get('GITHUB_CLIENT_SECRET');

    if (clientId === undefined || clientSecret === undefined) {
        return jsonResponse(
            { error: 'GitHub OAuth is not configured.' },
            { status: 500 }
        );
    }

    let body: TokenRequestBody;

    try {
        body = (await request.json()) as TokenRequestBody;
    } catch {
        return jsonResponse({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    if (body.code === undefined || body.redirectUri === undefined) {
        return jsonResponse(
            { error: 'Missing OAuth code or redirect URI.' },
            { status: 400 }
        );
    }

    const tokenResponse = await fetch(
        'https://github.com/login/oauth/access_token',
        {
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code: body.code,
                redirect_uri: body.redirectUri,
            }),
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            method: 'POST',
        }
    );

    const tokenPayload = (await tokenResponse.json()) as GitHubTokenResponse;

    if (!tokenResponse.ok || tokenPayload.access_token === undefined) {
        return jsonResponse(
            {
                error:
                    tokenPayload.error_description ??
                    tokenPayload.error ??
                    'GitHub token exchange failed.',
            },
            { status: 400 }
        );
    }

    return jsonResponse({
        accessToken: tokenPayload.access_token,
        scope: tokenPayload.scope ?? '',
        tokenType: tokenPayload.token_type ?? 'bearer',
    });
});
