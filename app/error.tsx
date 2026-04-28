"use client";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="main">
      <section className="panel">
        <h1>KIDEX could not load</h1>
        <p className="muted">{error.message}</p>
        <button className="btn primary" onClick={reset}>Try again</button>
      </section>
    </main>
  );
}
