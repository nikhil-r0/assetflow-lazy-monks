/**
 * Screen 4 — Asset create/edit form shell (dynamic custom fields later).
 */
export function AssetFormPage() {
  return (
    <main style={{ padding: "1.5rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Register Asset</h1>
      <p>Form shell — category select will drive custom fields from Org Setup.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
        style={{ display: "grid", gap: "0.75rem", maxWidth: 420 }}
      >
        <label>
          Name
          <input name="name" disabled placeholder="Laptop" />
        </label>
        <label>
          Category
          <select name="category_id" disabled>
            <option>Waiting for /categories…</option>
          </select>
        </label>
        <label>
          <input type="checkbox" name="is_bookable" disabled /> Shared / bookable
        </label>
        <button type="submit" disabled>
          Register (API soon)
        </button>
      </form>
    </main>
  );
}
