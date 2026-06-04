"use client";

import SmartImage from "@/components/SmartImage";
import {
  IconArrowLeft,
  IconBrandTiktok,
  IconCheck,
  IconDatabase,
  IconHanger,
  IconHome,
  IconLoader2,
  IconPencil,
  IconPhoto,
  IconPlus,
  IconRobot,
  IconSearch,
  IconShieldCheck,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { AdminSelect } from "@/components/ui/admin-select";
import { AdminLogo, Sidebar, SidebarBody, SidebarLink, useSidebar } from "@/components/ui/sidebar";
import { getWebpImageUrl } from "@/lib/cloudinary-image";
import type { TikTokAttachedProduct, TikTokItemPost, TikTokItemStatus } from "@/types/tiktok-items";
import type { W2CProduct } from "@/types/w2c";

type TikTokItemForm = {
  coverImage: string;
  description: string;
  productIds: string[];
  status: TikTokItemStatus;
  tiktokUrl: string;
  title: string;
};

type PickerProduct = {
  id: string;
  image: string;
  name: string;
  priceCny: number;
  metadata: {
    brand: string;
    category: string;
  };
};

const statuses: TikTokItemStatus[] = ["approved", "pending", "rejected"];

const initialForm: TikTokItemForm = {
  coverImage: "",
  description: "",
  productIds: [],
  status: "approved",
  tiktokUrl: "",
  title: "",
};

export function AdminTikTokItemsPanel() {
  const [items, setItems] = useState<TikTokItemPost[]>([]);
  const [form, setForm] = useState<TikTokItemForm>(initialForm);
  const [selectedProducts, setSelectedProducts] = useState<PickerProduct[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mode, setMode] = useState<"list" | "form">("list");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    void loadItems();
  }, []);

  const readyToSave = useMemo(
    () => Boolean(form.title.trim() && form.tiktokUrl.trim() && form.productIds.length > 0),
    [form],
  );

  const loadItems = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/tiktok-items");

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = (await response.json()) as { items: TikTokItemPost[] };
      setItems(data.items);
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not load TikTok items.",
      });
    } finally {
      setLoading(false);
    }
  };

  const startAdd = () => {
    setEditingId(null);
    setForm(initialForm);
    setSelectedProducts([]);
    setMode("form");
    setStatus(null);
  };

  const startEdit = (item: TikTokItemPost) => {
    setEditingId(item.id);
    setForm({
      coverImage: item.coverImage,
      description: item.description,
      productIds: item.products.map((product) => product.productId),
      status: item.status,
      tiktokUrl: item.tiktokUrl,
      title: item.title,
    });
    setSelectedProducts(item.products.map(mapAttachedProductToPicker));
    setMode("form");
    setStatus(null);
  };

  const closeForm = () => {
    setEditingId(null);
    setForm(initialForm);
    setSelectedProducts([]);
    setMode("list");
    setStatus(null);
  };

  const saveItem = async () => {
    if (!readyToSave) {
      setStatus({ tone: "error", text: "Fill title, TikTok URL and attach at least one W2C item." });
      return;
    }

    setSaving(true);
    setStatus(null);

    try {
      const response = await fetch(editingId ? `/api/admin/tiktok-items/${editingId}` : "/api/admin/tiktok-items", {
        body: JSON.stringify(form),
        headers: {
          "Content-Type": "application/json",
        },
        method: editingId ? "PATCH" : "POST",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await loadItems();
      setMode("list");
      setEditingId(null);
      setSelectedProducts([]);
      setForm(initialForm);
      setStatus({ tone: "success", text: editingId ? "TikTok item updated." : "TikTok item added." });
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not save TikTok item.",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (item: TikTokItemPost) => {
    if (!globalThis.confirm(`Delete "${item.title}"?`)) {
      return;
    }

    setDeletingId(item.id);
    setStatus(null);

    try {
      const response = await fetch(`/api/admin/tiktok-items/${item.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await loadItems();
      setStatus({ tone: "success", text: "TikTok item deleted." });
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not delete TikTok item.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const toggleProduct = (product: PickerProduct) => {
    setSelectedProducts((current) => {
      if (current.some((currentProduct) => currentProduct.id === product.id)) {
        setForm((currentForm) => ({
          ...currentForm,
          productIds: currentForm.productIds.filter((productId) => productId !== product.id),
        }));
        return current.filter((currentProduct) => currentProduct.id !== product.id);
      }

      if (current.length >= 12) {
        return current;
      }

      setForm((currentForm) => ({
        ...currentForm,
        productIds: [...currentForm.productIds, product.id],
      }));
      return [...current, product];
    });
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts((current) => current.filter((product) => product.id !== productId));
    setForm((current) => ({
      ...current,
      productIds: current.productIds.filter((id) => id !== productId),
    }));
  };

  return (
    <main className="relative min-h-screen bg-black text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(70%_45%_at_50%_0%,rgba(41,52,255,0.34),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(230,236,255,0.024)_1px,transparent_1px),linear-gradient(90deg,rgba(230,236,255,0.024)_1px,transparent_1px)] bg-[size:120px_120px] opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />

      <Sidebar>
        <div className="relative flex min-h-screen w-full flex-col md:flex-row">
          <AdminTikTokSidebar />

          <section className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto grid w-full max-w-7xl gap-6">
              <PageHeader
                title="TikTok Items"
                description="Manage TikTok videos and attach W2C products shown in each clip."
                action={
                  mode === "list" ? (
                    <Button onClick={startAdd} className="h-11 rounded-2xl">
                      <IconPlus className="size-4" />
                      Add TikTok
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
                <TikTokItemFormPanel
                  editing={Boolean(editingId)}
                  form={form}
                  readyToSave={readyToSave}
                  saving={saving}
                  selectedProducts={selectedProducts}
                  onCancel={closeForm}
                  onRemoveProduct={removeProduct}
                  onSave={saveItem}
                  onToggleProduct={toggleProduct}
                  onUpdateField={(key, value) => setForm((current) => ({ ...current, [key]: value }))}
                />
              ) : (
                <TikTokItemsList
                  deletingId={deletingId}
                  items={items}
                  loading={loading}
                  onDelete={deleteItem}
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

function TikTokItemFormPanel({
  editing,
  form,
  onCancel,
  onRemoveProduct,
  onSave,
  onToggleProduct,
  onUpdateField,
  readyToSave,
  saving,
  selectedProducts,
}: {
  editing: boolean;
  form: TikTokItemForm;
  onCancel: () => void;
  onRemoveProduct: (productId: string) => void;
  onSave: () => void;
  onToggleProduct: (product: PickerProduct) => void;
  onUpdateField: <Key extends keyof TikTokItemForm>(key: Key, value: TikTokItemForm[Key]) => void;
  readyToSave: boolean;
  saving: boolean;
  selectedProducts: PickerProduct[];
}) {
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-5 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl md:p-6">
        <SectionTitle title={editing ? "Edit TikTok" : "Add TikTok"} />
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput label="Title" value={form.title} onChange={(value) => onUpdateField("title", value)} />
          <TextInput label="TikTok URL" value={form.tiktokUrl} onChange={(value) => onUpdateField("tiktokUrl", value)} />
          <TextInput
            className="md:col-span-2"
            label="Cover image URL"
            placeholder="Optional. First product image will be used if empty."
            value={form.coverImage}
            onChange={(value) => onUpdateField("coverImage", value)}
          />
          <SelectInput
            label="Status"
            options={statuses}
            value={form.status}
            onChange={(value) => onUpdateField("status", value as TikTokItemStatus)}
          />
          <TextArea
            className="md:col-span-2"
            label="Description"
            value={form.description}
            onChange={(value) => onUpdateField("description", value)}
          />
        </div>

        <ProductPicker
          selectedProducts={selectedProducts}
          onRemoveProduct={onRemoveProduct}
          onToggleProduct={onToggleProduct}
        />

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={onSave} disabled={saving || !readyToSave} className="h-12 rounded-2xl">
            {saving ? <IconLoader2 className="size-4 animate-spin" /> : <IconShieldCheck className="size-4" />}
            {editing ? "Save changes" : "Save TikTok"}
          </Button>
          <Button variant="outline" onClick={onCancel} className="h-12 rounded-2xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]">
            Cancel
          </Button>
        </div>
      </div>

      <aside className="sticky top-6 h-fit overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0c12] shadow-2xl shadow-black/30">
        <div className="aspect-[9/16] bg-white/[0.04]">
          {form.coverImage || selectedProducts[0]?.image ? (
            <SmartImage src={getWebpImageUrl(form.coverImage || selectedProducts[0]?.image || "")} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-slate-600">
              <IconPhoto className="size-10" />
            </div>
          )}
        </div>
        <div className="p-5">
          <h3 className="line-clamp-2 text-xl font-semibold text-white">{form.title || "TikTok title"}</h3>
          <p className="mt-2 line-clamp-3 text-sm text-slate-500">{form.description || "TikTok description preview"}</p>
          <p className="mt-4 text-xs text-slate-500">{selectedProducts.length} linked W2C items</p>
        </div>
      </aside>
    </section>
  );
}

function ProductPicker({
  onRemoveProduct,
  onToggleProduct,
  selectedProducts,
}: {
  onRemoveProduct: (productId: string) => void;
  onToggleProduct: (product: PickerProduct) => void;
  selectedProducts: PickerProduct[];
}) {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<PickerProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const selectedIds = useMemo(() => new Set(selectedProducts.map((product) => product.id)), [selectedProducts]);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        const response = await fetch(`/api/tiktok-items/products?${params.toString()}`);
        const data = (await response.json()) as { products?: W2CProduct[] };

        if (!cancelled) {
          setProducts((data.products ?? []).map(mapW2CProductToPicker));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [search]);

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle title="Linked W2C items" />
        <span className="text-xs text-slate-500">{selectedProducts.length}/12</span>
      </div>

      {selectedProducts.length > 0 ? (
        <div className="grid gap-2">
          {selectedProducts.map((product) => (
            <div key={product.id} className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-2">
              <SmartImage src={getWebpImageUrl(product.image)} alt="" className="size-14 rounded-xl object-cover" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{product.name}</p>
                <p className="truncate text-xs text-slate-500">{product.metadata.brand} / {product.metadata.category}</p>
              </div>
              <IconButton label="Remove item" danger onClick={() => onRemoveProduct(product.id)}>
                <IconTrash className="size-4" />
              </IconButton>
            </div>
          ))}
        </div>
      ) : null}

      <label className="relative block">
        <IconSearch className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search W2C products..."
          className="h-12 w-full rounded-2xl border border-white/10 bg-black/25 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-300/50 focus:bg-blue-500/10"
        />
      </label>

      <div className="grid max-h-80 gap-2 overflow-y-auto pr-1">
        {loading ? <EmptyState text="Loading products..." /> : null}
        {!loading && products.length === 0 ? <EmptyState text="No W2C products found." /> : null}
        {!loading
          ? products.map((product) => {
              const selected = selectedIds.has(product.id);

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onToggleProduct(product)}
                  className={`grid grid-cols-[60px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-2 text-left transition ${
                    selected
                      ? "border-blue-300/40 bg-blue-500/10"
                      : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
                  }`}
                >
                  <SmartImage src={getWebpImageUrl(product.image)} alt="" className="size-[60px] rounded-xl object-cover" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">{product.name}</span>
                    <span className="mt-1 block truncate text-xs text-slate-500">
                      {product.metadata.brand} / {product.metadata.category}
                    </span>
                  </span>
                  <span
                    className={`grid size-9 place-items-center rounded-2xl border ${
                      selected
                        ? "border-blue-300/30 bg-blue-500/20 text-blue-100"
                        : "border-white/10 bg-white/[0.04] text-slate-500"
                    }`}
                  >
                    {selected ? <IconCheck className="size-4" /> : <IconPlus className="size-4" />}
                  </span>
                </button>
              );
            })
          : null}
      </div>
    </div>
  );
}

function TikTokItemsList({
  deletingId,
  items,
  loading,
  onDelete,
  onEdit,
}: {
  deletingId: string | null;
  items: TikTokItemPost[];
  loading: boolean;
  onDelete: (item: TikTokItemPost) => void;
  onEdit: (item: TikTokItemPost) => void;
}) {
  return (
    <section className="grid gap-4 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl md:p-6">
      <SectionTitle title="TikTok list" />
      {loading ? <EmptyState text="Loading TikTok items..." /> : null}
      {!loading && !items.length ? <EmptyState text="No TikTok items yet. Add the first one above." /> : null}
      <div className="grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="grid gap-4 rounded-3xl border border-white/10 bg-black/30 p-3 md:grid-cols-[70px_1fr_auto]">
            <div className="aspect-[9/16] overflow-hidden rounded-2xl bg-white/[0.04]">
              {item.coverImage || item.products[0]?.image ? (
                <SmartImage src={getWebpImageUrl(item.coverImage || item.products[0]?.image || "")} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-slate-600">
                  <IconBrandTiktok className="size-7" />
                </div>
              )}
            </div>
            <div className="min-w-0 self-center">
              <h3 className="truncate text-base font-semibold text-white">{item.title}</h3>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-white/[0.04] px-3 py-1">{item.status}</span>
                <span className="rounded-full bg-white/[0.04] px-3 py-1">{item.products.length} items</span>
                <span className="rounded-full bg-white/[0.04] px-3 py-1">{item.stats.views} views</span>
                <span className="rounded-full bg-white/[0.04] px-3 py-1">{item.createdBy}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 md:justify-end">
              <IconButton label="Edit TikTok item" onClick={() => onEdit(item)}>
                <IconPencil className="size-4" />
              </IconButton>
              <IconButton label="Delete TikTok item" onClick={() => onDelete(item)} danger disabled={deletingId === item.id}>
                {deletingId === item.id ? <IconLoader2 className="size-4 animate-spin" /> : <IconTrash className="size-4" />}
              </IconButton>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AdminTikTokSidebar() {
  const { open, setOpen } = useSidebar();
  const links = [
    { href: "/admin", icon: <IconDatabase className="size-5" />, label: "Products" },
    { href: "/admin/tiktok-items", icon: <IconBrandTiktok className="size-5" />, label: "TikTok Items", active: true },
    { href: "/admin/outfits", icon: <IconHanger className="size-5" />, label: "Outfits" },
    { href: "/admin/bot", icon: <IconRobot className="size-5" />, label: "Bot" },
    { href: "/admin/restore", icon: <IconShieldCheck className="size-5" />, label: "Restore" },
  ];

  return (
    <SidebarBody className="justify-between gap-10">
      <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
        <AdminLogo compact={!open} />
        <div className="mt-8 flex flex-col gap-2">
          {links.map((link) => (
            <SidebarLink
              key={link.href}
              link={{
                href: link.href,
                icon: (
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-2xl ring-1 ${
                      link.active
                        ? "bg-blue-500/20 text-blue-100 ring-blue-300/30"
                        : "bg-white/[0.04] text-neutral-400 ring-white/10"
                    }`}
                  >
                    {link.icon}
                  </span>
                ),
                label: link.label,
              }}
              className={link.active ? "bg-blue-500/15" : ""}
              onClick={() => setOpen(false)}
            />
          ))}
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
  value,
}: {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className={`grid gap-2 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <input
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
  return <AdminSelect label={label} value={value} options={options} onChange={onChange} />;
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

function mapW2CProductToPicker(product: W2CProduct): PickerProduct {
  return {
    id: product.id,
    image: product.image,
    name: product.name,
    priceCny: product.priceCny,
    metadata: {
      brand: product.metadata.brand,
      category: product.metadata.category,
    },
  };
}

function mapAttachedProductToPicker(product: TikTokAttachedProduct): PickerProduct {
  return {
    id: product.productId,
    image: product.image,
    name: product.name,
    priceCny: product.priceCny,
    metadata: {
      brand: product.metadata.brand,
      category: product.metadata.category,
    },
  };
}
