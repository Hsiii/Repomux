import type { JSX } from 'react';

export function App(): JSX.Element {
    return (
        <main className='app'>
            <section className='app__content'>
                <p className='app__eyebrow'>lazyhub</p>
                <h1 className='app__title'>Vite, React, and TypeScript.</h1>
                <p className='app__description'>
                    A clean baseline with strict tooling, useful tokens, and no
                    unnecessary UI noise.
                </p>
            </section>
        </main>
    );
}
