import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import { getGitHubOAuthScope } from '../lib/github-auth.js';
import {
    clearStoredGitHubToken,
    getStoredGitHubToken,
    setStoredGitHubToken,
} from '../lib/github-session.js';
import { fetchGitHubUser, getOAuthRedirectUri } from '../lib/github.js';
import { supabase } from '../lib/supabase.js';
import type { GitHubUser } from '../types/app.js';

interface UseGitHubConnectionResult {
    connectGitHub: () => void;
    disconnectGitHub: () => void;
    githubSession: Session | undefined;
    githubToken: string;
    githubUserQuery: UseQueryResult<GitHubUser>;
}

export function useGitHubConnection(
    setStatusMessage: Dispatch<SetStateAction<string>>
): UseGitHubConnectionResult {
    const [githubSession, setGitHubSession] = useState<Session | undefined>(
        undefined
    );
    const [githubToken, setGithubToken] = useState(getStoredGitHubToken);

    const githubUserQuery = useQuery({
        enabled: githubSession !== undefined && githubToken.trim() !== '',
        queryFn: async () => await fetchGitHubUser(githubToken.trim()),
        retry: false,
        queryKey: ['github-user', githubToken],
    });

    useEffect(() => {
        if (supabase === undefined) {
            return undefined;
        }

        supabase.auth
            .getSession()
            .then(({ data, error }) => {
                if (error !== null) {
                    setStatusMessage(error.message);
                    return;
                }

                setGitHubSession(data.session ?? undefined);

                if (
                    typeof data.session?.provider_token === 'string' &&
                    data.session.provider_token !== ''
                ) {
                    setStoredGitHubToken(data.session.provider_token);
                    setGithubToken(data.session.provider_token);
                    return;
                }

                if (data.session === null) {
                    clearStoredGitHubToken();
                    setGithubToken('');
                }
            })
            .catch((error: unknown) => {
                setStatusMessage(
                    error instanceof Error
                        ? error.message
                        : 'Unable to restore GitHub session.'
                );
            });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            setGitHubSession(session ?? undefined);

            if (event === 'SIGNED_OUT' || session === null) {
                clearStoredGitHubToken();
                setGithubToken('');
                return;
            }

            if (
                typeof session.provider_token === 'string' &&
                session.provider_token !== ''
            ) {
                setStoredGitHubToken(session.provider_token);
                setGithubToken(session.provider_token);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [setStatusMessage]);

    function connectGitHub() {
        if (supabase === undefined) {
            setStatusMessage('Supabase is required for GitHub auth.');
            return;
        }

        supabase.auth
            .signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: getOAuthRedirectUri(),
                    scopes: getGitHubOAuthScope(),
                },
            })
            .then(({ error }) => {
                if (error !== null) {
                    setStatusMessage(error.message);
                }
            })
            .catch((error: unknown) => {
                setStatusMessage(
                    error instanceof Error
                        ? error.message
                        : 'Unable to start GitHub auth.'
                );
            });
    }

    function disconnectGitHub() {
        if (supabase === undefined) {
            clearStoredGitHubToken();
            setGithubToken('');
            return;
        }

        supabase.auth
            .signOut()
            .then(({ error }) => {
                if (error !== null) {
                    setStatusMessage(error.message);
                    return;
                }

                setStatusMessage('');
                clearStoredGitHubToken();
                setGithubToken('');
            })
            .catch((error: unknown) => {
                setStatusMessage(
                    error instanceof Error
                        ? error.message
                        : 'Unable to disconnect GitHub.'
                );
            });
    }

    return {
        connectGitHub,
        disconnectGitHub,
        githubSession,
        githubToken,
        githubUserQuery,
    };
}
