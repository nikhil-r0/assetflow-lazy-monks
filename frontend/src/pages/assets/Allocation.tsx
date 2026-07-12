/**
 * Screen 5 — Allocation & Transfer (shell).
 * Money-shot UX: 409 conflict → "held by X" → Request Transfer.
 */
export function AllocationPage() {
  return (
    <main style={{ padding: "1.5rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Allocation & Transfer</h1>
      <p>Screen 5 shell — allocate, return, transfer workflow.</p>
      <section>
        <h2>Demo path (when APIs ready)</h2>
        <ol>
          <li>Allocate available asset to employee</li>
          <li>Second allocate → 409 + holder name + Transfer CTA</li>
          <li>Approve transfer → history updates</li>
        </ol>
      </section>
      <p style={{ color: "#666" }}>Blocked on: Track A auth + users/departments</p>
    </main>
  );
}
