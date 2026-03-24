"use client";

import { useCallback, useEffect, useState } from "react";
import { clientApi } from "@/lib/client-api";

interface SettingRow {
  id: string;
  key: string;
  valueJson: Record<string, unknown>;
  description?: string;
  updatedAt: string;
  updatedBy?: {
    id: string;
    email: string;
    role: string;
  };
}

interface SettingsResponse {
  items: SettingRow[];
}

export function AdminSettingsManager() {
  const [items, setItems] = useState<SettingRow[]>([]);
  const [keyInput, setKeyInput] = useState("");
  const [valueInput, setValueInput] = useState("{\n  \"enabled\": true\n}");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await clientApi<SettingsResponse>("/api/admin/settings");
      setItems(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveSetting = async () => {
    const key = keyInput.trim().toLowerCase();
    if (!key) {
      setError("Setting key is required");
      return;
    }

    let valueJson: Record<string, unknown>;
    try {
      const parsed = JSON.parse(valueInput) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setError("valueJson must be a JSON object");
        return;
      }
      valueJson = parsed as Record<string, unknown>;
    } catch {
      setError("Invalid JSON value");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await clientApi(`/api/admin/settings/${encodeURIComponent(key)}`, {
        method: "PUT",
        body: JSON.stringify({
          valueJson,
          description: descriptionInput.trim() || undefined,
        }),
      });
      setKeyInput("");
      setDescriptionInput("");
      setValueInput("{\n  \"enabled\": true\n}");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save setting");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-brand-200 bg-white/95 p-4 shadow-panel">
        <h2 className="text-xl font-semibold text-brand-900">System Settings</h2>
        <p className="mt-1 text-sm text-brand-700">
          Persisted key/value settings editable by authorized admins.
        </p>

        <div className="mt-4 grid gap-2">
          <input
            value={keyInput}
            onChange={(event) => setKeyInput(event.target.value)}
            placeholder="setting.key"
            className="rounded-xl border border-brand-200 px-3 py-2 text-sm"
          />
          <input
            value={descriptionInput}
            onChange={(event) => setDescriptionInput(event.target.value)}
            placeholder="Description (optional)"
            className="rounded-xl border border-brand-200 px-3 py-2 text-sm"
          />
          <textarea
            value={valueInput}
            onChange={(event) => setValueInput(event.target.value)}
            rows={8}
            className="rounded-xl border border-brand-200 px-3 py-2 font-mono text-xs"
          />
        </div>

        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}

        <button
          type="button"
          disabled={saving}
          onClick={() => void saveSetting()}
          className="mt-3 rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save setting"}
        </button>
      </div>

      <div className="rounded-2xl border border-brand-200 bg-white/95 p-4 shadow-panel">
        <h3 className="text-lg font-semibold text-brand-900">Current settings</h3>
        {loading ? (
          <p className="mt-3 text-sm text-brand-700">Loading settings...</p>
        ) : items.length === 0 ? (
          <p className="mt-3 text-sm text-brand-700">No settings saved yet.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-brand-200 bg-white p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-brand-900">{item.key}</p>
                    {item.description ? (
                      <p className="text-sm text-brand-700">{item.description}</p>
                    ) : null}
                  </div>
                  <p className="text-xs text-brand-700">
                    {new Date(item.updatedAt).toLocaleString()}
                    {item.updatedBy ? ` • ${item.updatedBy.email}` : ""}
                  </p>
                </div>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-brand-50 p-2 text-xs text-brand-900">
                  {JSON.stringify(item.valueJson, null, 2)}
                </pre>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
