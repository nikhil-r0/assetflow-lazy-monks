/**
 * Screen 4 — Register asset (auto tag AF-####, category custom fields).
 */
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { apiClient } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";

type CustomField = {
  id: number;
  field_name: string;
  field_type: "text" | "number" | "date" | "boolean";
};

type Category = {
  id: number;
  name: string;
  custom_fields?: CustomField[];
};

function errMsg(err: unknown) {
  const ax = err as { response?: { data?: { error?: { message?: string } } } };
  return ax.response?.data?.error?.message ?? "Request failed";
}

export function AssetFormPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canRegister =
    user?.role === "admin" || user?.role === "asset_manager";

  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [serial, setSerial] = useState("");
  const [location, setLocation] = useState("");
  const [condition, setCondition] = useState("");
  const [isBookable, setIsBookable] = useState(false);
  const [customValues, setCustomValues] = useState<Record<string, string | boolean>>(
    {},
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = useMemo(
    () => categories.find((c) => String(c.id) === categoryId) ?? null,
    [categories, categoryId],
  );

  useEffect(() => {
    void (async () => {
      try {
        const res = await apiClient.get("/categories");
        setCategories(res.data?.data ?? []);
      } catch (err) {
        setError(errMsg(err));
      }
    })();
  }, []);

  useEffect(() => {
    setCustomValues({});
  }, [categoryId]);

  if (!canRegister) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900">Register Asset</h1>
        <p className="mt-2 text-sm text-gray-500">
          Only Admin and Asset Manager can register assets.
        </p>
        <Link to="/assets" className="mt-4 inline-block text-sm text-purple-700">
          ← Back to registry
        </Link>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const fields = selectedCategory?.custom_fields ?? [];
      const custom_fields: Record<string, unknown> = {};
      for (const f of fields) {
        const raw = customValues[f.field_name];
        if (raw === undefined || raw === "") continue;
        if (f.field_type === "number") custom_fields[f.field_name] = Number(raw);
        else if (f.field_type === "boolean") custom_fields[f.field_name] = Boolean(raw);
        else custom_fields[f.field_name] = raw;
      }

      const res = await apiClient.post("/assets", {
        name: name.trim(),
        category_id: Number(categoryId),
        serial_number: serial.trim() || undefined,
        location: location.trim() || undefined,
        condition: condition.trim() || undefined,
        is_bookable: isBookable,
        custom_fields: Object.keys(custom_fields).length ? custom_fields : undefined,
      });

      navigate("/assets", {
        replace: true,
        state: { createdTag: res.data?.asset_tag },
      });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-8">
      <Link
        to="/assets"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Registry
      </Link>
      <h1 className="text-3xl font-bold text-gray-900">Register Asset</h1>
      <p className="mt-1 text-sm text-gray-500">
        Tag is assigned automatically (AF-0001…). Category drives custom fields.
      </p>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="mt-6 grid max-w-xl gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
      >
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-gray-700">Name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
            placeholder="MacBook Pro 14"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium text-gray-700">Category</span>
          <select
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-purple-300"
          >
            <option value="">Select category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium text-gray-700">Serial number</span>
          <input
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-purple-300"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium text-gray-700">Location</span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-purple-300"
            placeholder="Floor 2 / Bay"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium text-gray-700">Condition</span>
          <input
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-purple-300"
            placeholder="Good"
          />
        </label>

        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isBookable}
            onChange={(e) => setIsBookable(e.target.checked)}
            className="rounded border-gray-300"
          />
          Shared / bookable resource
        </label>

        {(selectedCategory?.custom_fields?.length ?? 0) > 0 && (
          <fieldset className="grid gap-3 rounded-xl border border-dashed border-gray-200 p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Custom fields
            </legend>
            {selectedCategory!.custom_fields!.map((f) => (
              <label key={f.id} className="grid gap-1 text-sm">
                <span className="font-medium text-gray-700">
                  {f.field_name}{" "}
                  <span className="font-normal text-gray-400">({f.field_type})</span>
                </span>
                {f.field_type === "boolean" ? (
                  <input
                    type="checkbox"
                    checked={Boolean(customValues[f.field_name])}
                    onChange={(e) =>
                      setCustomValues((prev) => ({
                        ...prev,
                        [f.field_name]: e.target.checked,
                      }))
                    }
                  />
                ) : (
                  <input
                    type={
                      f.field_type === "number"
                        ? "number"
                        : f.field_type === "date"
                          ? "date"
                          : "text"
                    }
                    value={String(customValues[f.field_name] ?? "")}
                    onChange={(e) =>
                      setCustomValues((prev) => ({
                        ...prev,
                        [f.field_name]: e.target.value,
                      }))
                    }
                    className="rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-purple-300"
                  />
                )}
              </label>
            ))}
          </fieldset>
        )}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Register asset
        </button>
      </form>
    </div>
  );
}
