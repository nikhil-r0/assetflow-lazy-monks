/**
 * Screen 4 — Asset Registration & Directory (shell).
 * Wire TanStack Query + forms once Track A auth + categories APIs land.
 */
export function RegistryPage() {
  return (
    <main style={{ padding: "1.5rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Asset Registry</h1>
      <p>Screen 4 shell — register assets, search/filter, lifecycle badges.</p>
      <section>
        <h2>Coming next</h2>
        <ul>
          <li>Register form (auto tag AF-0001, custom fields, bookable flag)</li>
          <li>Directory table + filters</li>
          <li>Per-asset history</li>
        </ul>
      </section>
      <p style={{ color: "#666" }}>Blocked on: Track A auth + GET /categories</p>
    </main>
  );
}
