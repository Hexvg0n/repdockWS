"use client";

import SmartImage from "@/components/SmartImage";
import {
  IconArrowLeft,
  IconBrandTiktok,
  IconDatabase,
  IconHanger,
  IconHome,
  IconLoader2,
  IconPencil,
  IconPhoto,
  IconPlus,
  IconRobot,
  IconShieldCheck,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { AdminSelect } from "@/components/ui/admin-select";
import { AdminLogo, Sidebar, SidebarBody, SidebarLink, useSidebar } from "@/components/ui/sidebar";
import type { Outfit, OutfitItem, OutfitStatus } from "@/types/outfits";

type OutfitForm = {
  createdBy: string;
  description: string;
  image: string;
  items: OutfitItem[];
  status: OutfitStatus;
  title: string;
};

const emptyItem = (): OutfitItem => ({
  id: crypto.randomUUID(),
  image: "",
  link: "",
  priceCny: 0,
  title: "",
});

const initialForm: OutfitForm = {
  createdBy: "",
  description: "",
  image: "",
  items: [emptyItem()],
  status: "pending",
  title: "",
};

const statuses: OutfitStatus[] = ["pending", "approved", "rejected"];

export function AdminOutfitsPanel() {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [form, setForm] = useState<OutfitForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mode, setMode] = useState<"list" | "form">("list");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    void loadOutfits();
  }, []);

  const readyToSave = useMemo(
    () =>
      Boolean(
        form.title.trim() &&
          form.image.trim() &&
          form.items.some((item) => item.title.trim() && item.image.trim() && item.link.trim()),
      ),
    [form],
  );

  const loadOutfits = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/outfits");

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = (await response.json()) as { outfits: Outfit[] };
      setOutfits(data.outfits);
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not load outfits.",
      });
    } finally {
      setLoading(false);
    }
  };

  const startAdd = () => {
    setEditingId(null);
    setForm({ ...initialForm, items: [emptyItem()] });
    setMode("form");
    setStatus(null);
  };

  const startEdit = (outfit: Outfit) => {
    setEditingId(outfit.id);
    setForm({
      createdBy: outfit.createdBy,
      description: outfit.description,
      image: outfit.image,
      items: outfit.items.length ? outfit.items.map((item) => ({ ...item })) : [emptyItem()],
      status: outfit.status,
      title: outfit.title,
    });
    setMode("form");
    setStatus(null);
  };

  const closeForm = () => {
    setEditingId(null);
    setForm({ ...initialForm, items: [emptyItem()] });
    setMode("list");
    setStatus(null);
  };

  const saveOutfit = async () => {
    if (!readyToSave) {
      setStatus({ tone: "error", text: "Fill title, cover image and at least one complete item." });
      return;
    }

    setSaving(true);
    setStatus(null);

    try {
      const response = await fetch(editingId ? `/api/admin/outfits/${editingId}` : "/api/admin/outfits", {
        body: JSON.stringify(form),
        headers: {
          "Content-Type": "application/json",
        },
        method: editingId ? "PATCH" : "POST",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await loadOutfits();
      setMode("list");
      setEditingId(null);
      setStatus({ tone: "success", text: editingId ? "Outfit updated." : "Outfit added." });
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not save outfit.",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteOutfit = async (outfit: Outfit) => {
    if (!globalThis.confirm(`Delete "${outfit.title}"?`)) {
      return;
    }

    setDeletingId(outfit.id);
    setStatus(null);

    try {
      const response = await fetch(`/api/admin/outfits/${outfit.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await loadOutfits();
      setStatus({ tone: "success", text: "Outfit deleted." });
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not delete outfit.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const updateItem = <Key extends keyof OutfitItem>(id: string, key: Key, value: OutfitItem[Key]) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    }));
  };
// 
  const removeItem = (id: string) => {
    setForm((current) => ({
      ...current,
      items: current.items.length === 1 ? current.items : current.items.filter((item) => item.id !== id),
    }));
  };

  return (
    <main className="relative min-h-screen bg-black text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(70%_45%_at_50%_0%,rgba(41,52,255,0.34),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(230,236,255,0.024)_1px,transparent_1px),linear-gradient(90deg,rgba(230,236,255,0.024)_1px,transparent_1px)] bg-[size:120px_120px] opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />

      <Sidebar>
        <div className="relative flex min-h-screen w-full flex-col md:flex-row">
          <AdminOutfitsSidebar />

          <section className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto grid w-full max-w-7xl gap-6">
              <PageHeader
                title="Outfits"
                description="Moderate community outfit posts and manage linked outfit pieces."
                action={
                  mode === "list" ? (
                    <Button onClick={startAdd} className="h-11 rounded-2xl">
                      <IconPlus className="size-4" />
                      Add outfit
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={closeForm}
                      className="h-11 rounded-2xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                    >
                      <IconX className="size-4" />
                      Close form
                    </Button>
                  )
                }
              />

              <StatusMessage status={status} />

              {mode === "form" ? (
                <OutfitFormPanel
                  editing={Boolean(editingId)}
                  form={form}
                  readyToSave={readyToSave}
                  saving={saving}
                  onAddItem={() => setForm((current) => ({ ...current, items: [...current.items, emptyItem()] }))}
                  onCancel={closeForm}
                  onRemoveItem={removeItem}
                  onSave={saveOutfit}
                  onUpdateField={(key, value) => setForm((current) => ({ ...current, [key]: value }))}
                  onUpdateItem={updateItem}
                />
              ) : (
                <OutfitsList
                  deletingId={deletingId}
                  loading={loading}
                  outfits={outfits}
                  onDelete={deleteOutfit}
                  onEdit={startEdit}
                />
              )}
            </div>
          </section>
        </div>
      </Sidebar>
    </main>
  );
}

function AdminOutfitsSidebar() {
  const { open, setOpen } = useSidebar();

  return (
    <SidebarBody className="justify-between gap-10">
      <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
        <AdminLogo compact={!open} />
        <div className="mt-8 flex flex-col gap-2">
          <SidebarLink
            link={{
              href: "/admin",
              icon: (
                <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-white/[0.04] text-neutral-400 ring-1 ring-white/10">
                  <IconDatabase className="size-5" />
                </span>
              ),
              label: "Products",
            }}
          />
          <SidebarLink
            link={{
              href: "/admin/outfits",
              icon: (
                <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-blue-500/20 text-blue-100 ring-1 ring-blue-300/30">
                  <IconHanger className="size-5" />
                </span>
              ),
              label: "Outfits",
            }}
            className="bg-blue-500/15"
            onClick={() => setOpen(false)}
          />
          <SidebarLink
            link={{
              href: "/admin/tiktok-items",
              icon: (
                <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-white/[0.04] text-neutral-400 ring-1 ring-white/10">
                  <IconBrandTiktok className="size-5" />
                </span>
              ),
              label: "TikTok Items",
            }}
            onClick={() => setOpen(false)}
          />
          <SidebarLink
            link={{
              href: "/admin/bot",
              icon: (
                <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-white/[0.04] text-neutral-400 ring-1 ring-white/10">
                  <IconRobot className="size-5" />
                </span>
              ),
              label: "Bot",
            }}
          />
          <SidebarLink
            link={{
              href: "/admin/restore",
              icon: (
                <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-white/[0.04] text-neutral-400 ring-1 ring-white/10">
                  <IconShieldCheck className="size-5" />
                </span>
              ),
              label: "Restore",
            }}
            onClick={() => setOpen(false)}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <SidebarLink
          link={{
            href: "/",
            icon: (
              <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-white/[0.04] text-neutral-400 ring-1 ring-white/10">
                <IconHome className="size-5" />
              </span>
            ),
            label: "Back to site",
          }}
        />
      </div>
    </SidebarBody>
  );
}

function OutfitFormPanel({
  editing,
  form,
  readyToSave,
  saving,
  onAddItem,
  onCancel,
  onRemoveItem,
  onSave,
  onUpdateField,
  onUpdateItem,
}: {
  editing: boolean;
  form: OutfitForm;
  readyToSave: boolean;
  saving: boolean;
  onAddItem: () => void;
  onCancel: () => void;
  onRemoveItem: (id: string) => void;
  onSave: () => void;
  onUpdateField: <Key extends keyof OutfitForm>(key: Key, value: OutfitForm[Key]) => void;
  onUpdateItem: <Key extends keyof OutfitItem>(id: string, key: Key, value: OutfitItem[Key]) => void;
}) {
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-5 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl md:p-6">
        <SectionTitle title={editing ? "Edit outfit" : "Add outfit"} />
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput label="Title" value={form.title} onChange={(value) => onUpdateField("title", value)} />
          <TextInput label="Creator" value={form.createdBy} onChange={(value) => onUpdateField("createdBy", value)} placeholder="Optional" />
          <TextInput label="Cover image URL" value={form.image} onChange={(value) => onUpdateField("image", value)} className="md:col-span-2" />
          <SelectInput label="Status" value={form.status} options={statuses} onChange={(value) => onUpdateField("status", value as OutfitStatus)} />
          <TextArea label="Description" value={form.description} onChange={(value) => onUpdateField("description", value)} className="md:col-span-2" />
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <SectionTitle title="Outfit pieces" />
            <Button variant="outline" onClick={onAddItem} className="rounded-2xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]">
              <IconPlus className="size-4" />
              Add item
            </Button>
          </div>

          {form.items.map((item, index) => (
            <div key={item.id} className="grid gap-3 rounded-3xl border border-white/10 bg-black/25 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Piece {index + 1}</p>
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  className="grid size-9 place-items-center rounded-2xl border border-red-400/20 bg-red-500/10 text-red-200 transition hover:bg-red-500/20"
                >
                  <IconTrash className="size-4" />
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <TextInput label="Title" value={item.title} onChange={(value) => onUpdateItem(item.id, "title", value)} />
                <TextInput
                  label="Price CNY"
                  value={String(item.priceCny || "")}
                  onChange={(value) => onUpdateItem(item.id, "priceCny", Number(value))}
                  type="number"
                />
                <TextInput label="Image URL" value={item.image} onChange={(value) => onUpdateItem(item.id, "image", value)} />
                <TextInput label="Link" value={item.link} onChange={(value) => onUpdateItem(item.id, "link", value)} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={onSave} disabled={saving || !readyToSave} className="h-12 rounded-2xl">
            {saving ? <IconLoader2 className="size-4 animate-spin" /> : <IconShieldCheck className="size-4" />}
            {editing ? "Save changes" : "Save outfit"}
          </Button>
          <Button variant="outline" onClick={onCancel} className="h-12 rounded-2xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]">
            Cancel
          </Button>
        </div>
      </div>

      <aside className="sticky top-6 h-fit overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0c12] shadow-2xl shadow-black/30">
        <div className="aspect-[4/5] bg-white/[0.04]">
          {form.image ? (
            <SmartImage src={form.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-slate-600">
              <IconPhoto className="size-10" />
            </div>
          )}
        </div>
        <div className="p-5">
          <h3 className="line-clamp-2 text-xl font-semibold text-white">{form.title || "Outfit title"}</h3>
          <p className="mt-2 line-clamp-3 text-sm text-slate-500">{form.description || "Outfit description preview"}</p>
          <p className="mt-4 text-xs text-slate-500">{form.items.length} linked items</p>
        </div>
      </aside>
    </section>
  );
}

function OutfitsList({
  deletingId,
  loading,
  outfits,
  onDelete,
  onEdit,
}: {
  deletingId: string | null;
  loading: boolean;
  outfits: Outfit[];
  onDelete: (outfit: Outfit) => void;
  onEdit: (outfit: Outfit) => void;
}) {
  return (
    <section className="grid gap-4 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl md:p-6">
      <SectionTitle title="Outfit list" />
      {loading ? <EmptyState text="Loading outfits..." /> : null}
      {!loading && !outfits.length ? <EmptyState text="No outfits yet. Add the first one above." /> : null}
      <div className="grid gap-3">
        {outfits.map((outfit) => (
          <article key={outfit.id} className="grid gap-4 rounded-3xl border border-white/10 bg-black/30 p-3 md:grid-cols-[86px_1fr_auto]">
            <div className="aspect-square overflow-hidden rounded-2xl bg-white/[0.04]">
              <SmartImage src={outfit.image} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 self-center">
              <h3 className="truncate text-base font-semibold text-white">{outfit.title}</h3>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-white/[0.04] px-3 py-1">{outfit.status}</span>
                <span className="rounded-full bg-white/[0.04] px-3 py-1">{outfit.items.length} items</span>
                <span className="rounded-full bg-white/[0.04] px-3 py-1">{outfit.createdBy}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 md:justify-end">
              <IconButton label="Edit outfit" onClick={() => onEdit(outfit)}>
                <IconPencil className="size-4" />
              </IconButton>
              <IconButton label="Delete outfit" onClick={() => onDelete(outfit)} danger disabled={deletingId === outfit.id}>
                {deletingId === outfit.id ? <IconLoader2 className="size-4 animate-spin" /> : <IconTrash className="size-4" />}
              </IconButton>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PageHeader({
  action,
  description,
  title,
}: {
  action?: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <a href="/admin" className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-white">
          <IconArrowLeft className="size-4" />
          W2C admin
        </a>
        <h1 className="font-poppins text-4xl font-medium tracking-normal md:text-5xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">{description}</p>
      </div>
      {action}
    </div>
  );
}

function TextInput({
  className = "",
  label,
  onChange,
  placeholder = "",
  type = "text",
  value,
}: {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <label className={`grid gap-2 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 rounded-2xl border border-white/10 bg-black/25 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-300/50 focus:bg-blue-500/10"
      />
    </label>
  );
}

function TextArea({
  className = "",
  label,
  onChange,
  value,
}: {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className={`grid gap-2 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-300/50 focus:bg-blue-500/10"
      />
    </label>
  );
}

function SelectInput({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <AdminSelect label={label} value={value} options={options} onChange={onChange} />
  );
}

function IconButton({
  children,
  danger = false,
  disabled = false,
  label,
  onClick,
}: {
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid size-10 place-items-center rounded-2xl border transition disabled:cursor-not-allowed disabled:opacity-60 ${
        danger
          ? "border-red-400/20 bg-red-500/10 text-red-200 hover:bg-red-500/20"
          : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function StatusMessage({
  status,
}: {
  status: { tone: "error" | "success"; text: string } | null;
}) {
  if (!status) return null;

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${
        status.tone === "success"
          ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
          : "border-red-400/20 bg-red-500/10 text-red-100"
      }`}
    >
      {status.text}
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</h2>;
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
