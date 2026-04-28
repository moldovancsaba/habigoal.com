import Link from "next/link";

export default function NotFound() {
  return (
    <main className="main">
      <section className="panel">
        <h1>Page not found</h1>
        <p className="muted">The requested KIDEX page does not exist.</p>
        <Link className="btn primary" href="/">Back to assessment</Link>
      </section>
    </main>
  );
}
