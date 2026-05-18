"use client";

import {
  IconCategory,
  IconClipboard,
  IconCloudUpload,
  IconDatabase,
  IconHome,
  IconHanger,
  IconLoader2,
  IconPencil,
  IconPhoto,
  IconPlus,
  IconRefresh,
  IconSparkles,
  IconTags,
  IconTrash,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { AdminSelect } from "@/components/ui/admin-select";
import { AdminLogo, Sidebar, SidebarBody, SidebarLink, useSidebar } from "@/components/ui/sidebar";
import type { W2CProduct } from "@/types/w2c";

type LookupResult = {
  originalUrl: string;
  platform: string;
  productId: string;
  price: number;
  weight: number;
  name: string;
  imageUrl: string;
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

type ProductForm = {
  brand: string;
  category: string;
  gender: "men" | "women";
  image: string;
  link: string;
  name: string;
  priceCny: string;
  rating: string;
  season: string;
  weight: string;
};

type AdminTab = "products" | "categories";
type ProductMode = "list" | "form";
type CategoryMode = "list" | "form";

const initialForm: ProductForm = {
  brand: "",
  category: "",
  gender: "men",
  image: "",
  link: "",
  name: "",
  priceCny: "",
  rating: "4.5",
  season: "SS",
  weight: "",
};

const seasons = ["SS", "FW"];

export function AdminW2CPanel() {
  const [activeTab, setActiveTab] = useState<AdminTab>("products");
  const [productMode, setProductMode] = useState<ProductMode>("list");
  const [categoryMode, setCategoryMode] = useState<CategoryMode>("list");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(initialForm);
  const [categoryName, setCategoryName] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<W2CProduct[]>([]);
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  const categoryOptions = useMemo(() => categories.map((category) => category.name), [categories]);

  const readyToSave = useMemo(
    () =>
      Boolean(
        form.link &&
          form.name &&
          form.image &&
          form.brand &&
          form.category &&
          form.priceCny &&
          form.weight,
      ),
    [form],
  );

  const updateField = <Key extends keyof ProductForm>(key: Key, value: ProductForm[Key]) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const loadAdminData = async () => {
    setLoading(true);

    try {
      const [categoriesResponse, productsResponse] = await Promise.all([
        fetch("/api/admin/w2c/categories"),
        fetch("/api/admin/w2c/products"),
      ]);

      if (!categoriesResponse.ok) {
        throw new Error(await categoriesResponse.text());
      }

      if (!productsResponse.ok) {
        throw new Error(await productsResponse.text());
      }

      const categoriesData = (await categoriesResponse.json()) as { categories: Category[] };
      const productsData = (await productsResponse.json()) as { products: W2CProduct[] };

      setCategories(categoriesData.categories);
      setProducts(productsData.products);
      setForm((current) => ({
        ...current,
        category: current.category || categoriesData.categories[0]?.name || "",
      }));
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not load admin data.",
      });
    } finally {
      setLoading(false);
    }
  };

  const startAddProduct = () => {
    setEditingProductId(null);
    setLookupResult(null);
    setForm({
      ...initialForm,
      category: categoryOptions[0] ?? "",
    });
    setProductMode("form");
    setStatus(null);
  };

  const startEditProduct = (product: W2CProduct) => {
    setEditingProductId(product.id);
    setLookupResult(null);
    setForm({
      brand: product.metadata.brand,
      category: product.metadata.category,
      gender: product.metadata.gender,
      image: product.image,
      link: product.links.original,
      name: product.name,
      priceCny: String(product.priceCny),
      rating: String(product.rating),
      season: product.metadata.season,
      weight: String(product.metadata.weight),
    });
    setProductMode("form");
    setStatus(null);
  };

  const closeProductForm = () => {
    setProductMode("list");
    setEditingProductId(null);
    setLookupResult(null);
    setStatus(null);
  };

  const startAddCategory = () => {
    setEditingCategoryId(null);
    setCategoryName("");
    setCategoryMode("form");
    setStatus(null);
  };

  const startEditCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setCategoryName(category.name);
    setCategoryMode("form");
    setStatus(null);
  };

  const closeCategoryForm = () => {
    setEditingCategoryId(null);
    setCategoryName("");
    setCategoryMode("list");
    setStatus(null);
  };

  const lookupProduct = async () => {
    if (!form.link.trim()) {
      setStatus({ tone: "error", text: "Paste product link first." });
      return;
    }

    setLookupLoading(true);
    setStatus(null);

    try {
      const response = await fetch(`/api/admin/w2c/lookup?url=${encodeURIComponent(form.link)}`);

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = (await response.json()) as LookupResult;
      setLookupResult(data);
      setForm((current) => ({
        ...current,
        image: data.imageUrl || current.image,
        link: data.originalUrl || current.link,
        name: data.name || current.name,
        priceCny: data.price ? String(data.price) : current.priceCny,
        weight: data.weight ? String(data.weight) : current.weight,
      }));
      setStatus({ tone: "success", text: "Product data imported. Review metadata before saving." });
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Lookup failed.",
      });
    } finally {
      setLookupLoading(false);
    }
  };

  const saveCategory = async () => {
    const name = categoryName.trim();

    if (!name) {
      setStatus({ tone: "error", text: "Type category name first." });
      return;
    }

    setCategorySaving(true);
    setStatus(null);

    try {
      const response = await fetch(
        editingCategoryId
          ? `/api/admin/w2c/categories/${editingCategoryId}`
          : "/api/admin/w2c/categories",
        {
          method: editingCategoryId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name }),
        },
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await loadAdminData();
      setCategoryMode("list");
      setEditingCategoryId(null);
      setCategoryName("");
      setStatus({ tone: "success", text: editingCategoryId ? "Category updated." : "Category added." });
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not save category.",
      });
    } finally {
      setCategorySaving(false);
    }
  };

  const deleteCategory = async (category: Category) => {
    const confirmed = globalThis.confirm(
      `Delete "${category.name}"? Products in this category will be moved to Uncategorized.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(category.id);
    setStatus(null);

    try {
      const response = await fetch(`/api/admin/w2c/categories/${category.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await loadAdminData();
      setStatus({ tone: "success", text: "Category deleted." });
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not delete category.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const processImageUrl = async () => {
    if (!form.image.trim()) {
      setStatus({ tone: "error", text: "Add image URL first." });
      return;
    }

    await processImageSource(form.image);
  };

  const processUploadedImage = async (file: File | null | undefined) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setStatus({ tone: "error", text: "Selected file is not an image." });
      return;
    }

    await processImageSource(file);
  };

  const processImageSource = async (source: File | string) => {
    setImageProcessing(true);
    setStatus(null);

    try {
      const request =
        typeof source === "string"
          ? {
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                imageUrl: source,
                productName: form.name,
              }),
            }
          : {
              body: buildImageFormData(source, form.name),
            };

      const response = await fetch("/api/admin/w2c/image", {
        method: "POST",
        ...request,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = (await response.json()) as { imageUrl: string; publicId: string };
      setForm((current) => ({ ...current, image: data.imageUrl }));
      setStatus({ tone: "success", text: "Image cleaned with rembg and uploaded to Cloudinary." });
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Image processing failed.",
      });
    } finally {
      setImageProcessing(false);
    }
  };

  const saveProduct = async () => {
    if (!readyToSave) {
      setStatus({ tone: "error", text: "Fill required fields before saving." });
      return;
    }

    setSaving(true);
    setStatus(null);

    try {
      const response = await fetch(
        editingProductId ? `/api/admin/w2c/products/${editingProductId}` : "/api/admin/w2c/products",
        {
          method: editingProductId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        },
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await loadAdminData();
      setProductMode("list");
      setEditingProductId(null);
      setLookupResult(null);
      setStatus({ tone: "success", text: editingProductId ? "Product updated." : "Product added." });
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not save product.",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (product: W2CProduct) => {
    const confirmed = globalThis.confirm(`Delete "${product.name}"?`);

    if (!confirmed) {
      return;
    }

    setDeletingId(product.id);
    setStatus(null);

    try {
      const response = await fetch(`/api/admin/w2c/products/${product.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await loadAdminData();
      setStatus({ tone: "success", text: "Product deleted." });
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not delete product.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(70%_45%_at_50%_0%,rgba(41,52,255,0.34),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[430px] overflow-hidden opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_88%)]">
        <img
          src="https://framerusercontent.com/images/eVPQSYBoVqwchmpN78sjyYtovY.svg?width=513&height=272"
          width="513"
          height="272"
          alt=""
          decoding="async"
          className="h-full w-full object-cover object-center"
        />
      </div>

      <Sidebar>
        <div className="relative flex min-h-screen w-full flex-col md:flex-row">
          <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />

          <section className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {activeTab === "products" ? (
              <ProductsPage
                categories={categoryOptions}
                deletingId={deletingId}
                editingProductId={editingProductId}
                form={form}
                imageProcessing={imageProcessing}
                loading={loading}
                lookupLoading={lookupLoading}
                lookupResult={lookupResult}
                mode={productMode}
                products={products}
                readyToSave={readyToSave}
                saving={saving}
                status={status}
                onAdd={startAddProduct}
                onCancel={closeProductForm}
                onDelete={deleteProduct}
                onEdit={startEditProduct}
                onLookup={lookupProduct}
                onProcessImageUrl={processImageUrl}
                onProcessUploadedImage={processUploadedImage}
                onSave={saveProduct}
                onUpdateField={updateField}
              />
            ) : (
              <CategoriesPage
                categories={categories}
                categoryName={categoryName}
                categorySaving={categorySaving}
                deletingId={deletingId}
                editingCategoryId={editingCategoryId}
                loading={loading}
                mode={categoryMode}
                selectedCategory={form.category}
                status={status}
                onAdd={startAddCategory}
                onCancel={closeCategoryForm}
                onDelete={deleteCategory}
                onEdit={startEditCategory}
                onNameChange={setCategoryName}
                onSave={saveCategory}
                onSelectCategory={(category) => setForm((current) => ({ ...current, category }))}
              />
            )}
          </section>
        </div>
      </Sidebar>
    </main>
  );
}

function ProductsPage({
  categories,
  deletingId,
  editingProductId,
  form,
  imageProcessing,
  loading,
  lookupLoading,
  lookupResult,
  mode,
  products,
  readyToSave,
  saving,
  status,
  onAdd,
  onCancel,
  onDelete,
  onEdit,
  onLookup,
  onProcessImageUrl,
  onProcessUploadedImage,
  onSave,
  onUpdateField,
}: Readonly<{
  categories: string[];
  deletingId: string | null;
  editingProductId: string | null;
  form: ProductForm;
  imageProcessing: boolean;
  loading: boolean;
  lookupLoading: boolean;
  lookupResult: LookupResult | null;
  mode: ProductMode;
  products: W2CProduct[];
  readyToSave: boolean;
  saving: boolean;
  status: { tone: "error" | "success"; text: string } | null;
  onAdd: () => void;
  onCancel: () => void;
  onDelete: (product: W2CProduct) => void;
  onEdit: (product: W2CProduct) => void;
  onLookup: () => void;
  onProcessImageUrl: () => void;
  onProcessUploadedImage: (file: File) => void;
  onSave: () => void;
  onUpdateField: <Key extends keyof ProductForm>(key: Key, value: ProductForm[Key]) => void;
}>) {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <PageHeader
        description="Add, edit and remove catalog products."
        title="Products"
        action={
          mode === "list" ? (
            <Button onClick={onAdd} className="h-11 rounded-2xl">
              <IconPlus className="size-4" />
              Add product
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={onCancel}
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
        <div className="grid gap-6 lg:grid-cols-[1fr_390px]">
          <ProductFormPanel
            categories={categories}
            editing={Boolean(editingProductId)}
            form={form}
            imageProcessing={imageProcessing}
            lookupLoading={lookupLoading}
            lookupResult={lookupResult}
            readyToSave={readyToSave}
            saving={saving}
            onCancel={onCancel}
            onLookup={onLookup}
            onProcessImageUrl={onProcessImageUrl}
            onProcessUploadedImage={onProcessUploadedImage}
            onSave={onSave}
            onUpdateField={onUpdateField}
          />
          <ProductPreview form={form} />
        </div>
      ) : null}

      <ProductList
        deletingId={deletingId}
        loading={loading}
        products={products}
        onDelete={onDelete}
        onEdit={onEdit}
      />
    </div>
  );
}

function ProductFormPanel({
  categories,
  editing,
  form,
  imageProcessing,
  lookupLoading,
  lookupResult,
  readyToSave,
  saving,
  onCancel,
  onLookup,
  onProcessImageUrl,
  onProcessUploadedImage,
  onSave,
  onUpdateField,
}: Readonly<{
  categories: string[];
  editing: boolean;
  form: ProductForm;
  imageProcessing: boolean;
  lookupLoading: boolean;
  lookupResult: LookupResult | null;
  readyToSave: boolean;
  saving: boolean;
  onCancel: () => void;
  onLookup: () => void;
  onProcessImageUrl: () => void;
  onProcessUploadedImage: (file: File) => void;
  onSave: () => void;
  onUpdateField: <Key extends keyof ProductForm>(key: Key, value: ProductForm[Key]) => void;
}>) {
  return (
    <div className="grid gap-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl md:p-6">
      <section className="grid gap-4 rounded-3xl border border-white/10 bg-black/30 p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-blue-500/15 text-blue-200 ring-1 ring-white/10">
            <IconSparkles className="size-5" />
          </span>
          <div>
            <h2 className="font-semibold">{editing ? "Edit product" : "Product lookup"}</h2>
            <p className="text-sm text-slate-500">
              Paste a raw product link or an agent link to import available data.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <TextInput
            label="Product link"
            value={form.link}
            onChange={(value) => onUpdateField("link", value)}
            placeholder="Raw or agent link: ACBuy, USFans, Kakobuy..."
          />
          <Button onClick={onLookup} disabled={lookupLoading} className="self-end rounded-2xl">
            {lookupLoading ? <IconLoader2 className="size-4 animate-spin" /> : <IconRefresh className="size-4" />}
            Lookup
          </Button>
        </div>

        {lookupResult ? (
          <div className="grid gap-2 rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4 text-sm text-blue-100 md:grid-cols-3">
            <span>Platform: {lookupResult.platform}</span>
            <span>ID: {lookupResult.productId}</span>
            <span>Weight: {lookupResult.weight || 0}g</span>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 rounded-3xl border border-white/10 bg-black/30 p-4">
        <SectionTitle title="Product card data" />
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput
            label="Product name"
            value={form.name}
            onChange={(value) => onUpdateField("name", value)}
          />
          <TextInput
            label="Price CNY"
            value={form.priceCny}
            onChange={(value) => onUpdateField("priceCny", value)}
            inputMode="decimal"
          />
          <TextInput
            label="Rating"
            value={form.rating}
            onChange={(value) => onUpdateField("rating", value)}
            inputMode="decimal"
          />
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <TextInput
              label="Image URL"
              value={form.image}
              onChange={(value) => onUpdateField("image", value)}
            />
            <Button
              variant="outline"
              onClick={onProcessImageUrl}
              disabled={imageProcessing || !form.image}
              className="self-end rounded-2xl border-blue-400/20 bg-blue-500/10 text-blue-100 hover:bg-blue-500/20"
            >
              {imageProcessing ? (
                <IconLoader2 className="size-4 animate-spin" />
              ) : (
                <IconCloudUpload className="size-4" />
              )}
              Process URL
            </Button>
          </div>
        </div>

        <ImageUploadBox disabled={imageProcessing} onFile={onProcessUploadedImage} />
      </section>

      <section className="grid gap-4 rounded-3xl border border-white/10 bg-black/30 p-4">
        <SectionTitle title="Metadata for filtering" />
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput
            label="Brand"
            value={form.brand}
            onChange={(value) => onUpdateField("brand", value)}
            placeholder="Nike, Supreme, Stussy..."
          />
          <SelectInput
            label="Category"
            value={form.category}
            options={categories}
            onChange={(value) => onUpdateField("category", value)}
            placeholder="Add category first"
          />
          <SelectInput
            label="Gender"
            value={form.gender}
            options={["men", "women"]}
            onChange={(value) => onUpdateField("gender", value as ProductForm["gender"])}
          />
          <SelectInput
            label="Season"
            value={form.season}
            options={seasons}
            onChange={(value) => onUpdateField("season", value)}
          />
          <TextInput
            label="Weight g"
            value={form.weight}
            onChange={(value) => onUpdateField("weight", value)}
            inputMode="numeric"
          />
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={onSave} disabled={saving || !readyToSave} className="h-12 rounded-2xl">
          {saving ? <IconLoader2 className="size-4 animate-spin" /> : <IconDatabase className="size-4" />}
          {editing ? "Save changes" : "Save product"}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          className="h-12 rounded-2xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ProductList({
  deletingId,
  loading,
  products,
  onDelete,
  onEdit,
}: {
  deletingId: string | null;
  loading: boolean;
  products: W2CProduct[];
  onDelete: (product: W2CProduct) => void;
  onEdit: (product: W2CProduct) => void;
}) {
  return (
    <section className="grid gap-4 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl md:p-6">
      <SectionTitle title="Product list" />
      {loading ? <EmptyState text="Loading products..." /> : null}
      {!loading && !products.length ? <EmptyState text="No products yet. Add the first one above." /> : null}
      <div className="grid gap-3">
        {products.map((product) => (
          <article
            key={product.id}
            className="grid gap-4 rounded-3xl border border-white/10 bg-black/30 p-3 md:grid-cols-[86px_1fr_auto]"
          >
            <div className="aspect-square overflow-hidden rounded-2xl bg-white/[0.04]">
              <img src={product.image} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 self-center">
              <h3 className="truncate text-base font-semibold text-white">{product.name}</h3>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-white/[0.04] px-3 py-1">{product.metadata.category}</span>
                <span className="rounded-full bg-white/[0.04] px-3 py-1">{product.metadata.gender}</span>
                <span className="rounded-full bg-white/[0.04] px-3 py-1">{product.priceCny} CNY</span>
                <span className="rounded-full bg-white/[0.04] px-3 py-1">{product.metadata.clicks.allTime} views</span>
                <span className="rounded-full bg-white/[0.04] px-3 py-1">{product.metadata.purchases ?? 0} buys</span>
              </div>
            </div>
            <div className="flex items-center gap-2 md:justify-end">
              <IconButton label="Edit product" onClick={() => onEdit(product)}>
                <IconPencil className="size-4" />
              </IconButton>
              <IconButton
                label="Delete product"
                onClick={() => onDelete(product)}
                danger
                disabled={deletingId === product.id}
              >
                {deletingId === product.id ? (
                  <IconLoader2 className="size-4 animate-spin" />
                ) : (
                  <IconTrash className="size-4" />
                )}
              </IconButton>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CategoriesPage({
  categories,
  categoryName,
  categorySaving,
  deletingId,
  editingCategoryId,
  loading,
  mode,
  selectedCategory,
  status,
  onAdd,
  onCancel,
  onDelete,
  onEdit,
  onNameChange,
  onSave,
  onSelectCategory,
}: Readonly<{
  categories: Category[];
  categoryName: string;
  categorySaving: boolean;
  deletingId: string | null;
  editingCategoryId: string | null;
  loading: boolean;
  mode: CategoryMode;
  selectedCategory: string;
  status: { tone: "error" | "success"; text: string } | null;
  onAdd: () => void;
  onCancel: () => void;
  onDelete: (category: Category) => void;
  onEdit: (category: Category) => void;
  onNameChange: (value: string) => void;
  onSave: () => void;
  onSelectCategory: (category: string) => void;
}>) {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <PageHeader
        description="Add, edit and remove W2C product categories."
        title="Categories"
        action={
          mode === "list" ? (
            <Button onClick={onAdd} className="h-11 rounded-2xl">
              <IconPlus className="size-4" />
              Add category
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={onCancel}
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
        <section className="grid gap-5 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl md:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-indigo-500/15 text-indigo-200 ring-1 ring-white/10">
              <IconCategory className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold">{editingCategoryId ? "Edit category" : "Add category"}</h2>
              <p className="text-sm text-slate-500">Categories are stored in MongoDB and appear in W2C filters.</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <TextInput
              label="Category name"
              value={categoryName}
              onChange={onNameChange}
              placeholder="T-shirts, Shoes, Accessories..."
            />
            <Button
              variant="outline"
              onClick={onSave}
              disabled={categorySaving}
              className="self-end rounded-2xl border-blue-400/20 bg-blue-500/10 text-blue-100 hover:bg-blue-500/20"
            >
              {categorySaving ? <IconLoader2 className="size-4 animate-spin" /> : <IconTags className="size-4" />}
              {editingCategoryId ? "Save changes" : "Add category"}
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              className="self-end rounded-2xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
            >
              Cancel
            </Button>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl md:p-6">
        <SectionTitle title="Category list" />
        {loading ? <EmptyState text="Loading categories..." /> : null}
        {!loading && !categories.length ? <EmptyState text="No categories yet. Add the first one above." /> : null}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => {
            const active = selectedCategory === category.name;

            return (
              <article
                key={category.id}
                className={`rounded-3xl border p-4 transition ${
                  active
                    ? "border-blue-300/60 bg-blue-500/15 shadow-[0_0_32px_rgba(41,52,255,0.20)]"
                    : "border-white/10 bg-black/30"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectCategory(category.name)}
                  className="block w-full text-left"
                >
                  <span className="grid size-9 place-items-center rounded-2xl bg-white/[0.06] text-blue-200 ring-1 ring-white/10">
                    <IconTags className="size-4" />
                  </span>
                  <span className="mt-4 block font-semibold text-white">{category.name}</span>
                  <span className="mt-1 block text-sm text-slate-500">{category.slug}</span>
                </button>
                <div className="mt-4 flex gap-2">
                  <IconButton label="Edit category" onClick={() => onEdit(category)}>
                    <IconPencil className="size-4" />
                  </IconButton>
                  <IconButton
                    label="Delete category"
                    onClick={() => onDelete(category)}
                    danger
                    disabled={deletingId === category.id}
                  >
                    {deletingId === category.id ? (
                      <IconLoader2 className="size-4 animate-spin" />
                    ) : (
                      <IconTrash className="size-4" />
                    )}
                  </IconButton>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function PageHeader({
  action,
  description,
  title,
}: {
  action: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <header className="flex flex-col gap-4 py-2 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-sm font-semibold text-blue-300">Admin / W2C</p>
        <h1 className="mt-2 font-['Poppins'] text-4xl font-medium md:text-5xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 md:text-base">{description}</p>
      </div>
      {action}
    </header>
  );
}

function buildImageFormData(file: File, productName: string) {
  const formData = new FormData();

  formData.append("image", file);
  formData.append("productName", productName);

  return formData;
}

function getPastedImage(event: React.ClipboardEvent<HTMLElement>) {
  return getPastedImageFromClipboard(event.clipboardData);
}

function getPastedImageFromClipboard(clipboardData: DataTransfer | null) {
  if (!clipboardData) {
    return undefined;
  }

  const files = Array.from(clipboardData.files);
  const fileFromList = files.find((file) => file.type.startsWith("image/"));

  if (fileFromList) {
    return fileFromList;
  }

  return Array.from(clipboardData.items)
    .map((item) => item.getAsFile())
    .find((file): file is File => Boolean(file?.type.startsWith("image/")));
}

function AdminSidebar({
  activeTab,
  onTabChange,
}: {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}) {
  const { open, setOpen } = useSidebar();
  const links: Array<{
    href: string;
    icon: React.ReactNode;
    label: string;
    tab?: AdminTab;
  }> = [
    {
      href: "#products",
      icon: <IconDatabase className="size-5 shrink-0" />,
      label: "Products",
      tab: "products",
    },
    {
      href: "#categories",
      icon: <IconTags className="size-5 shrink-0" />,
      label: "Categories",
      tab: "categories",
    },
    {
      href: "/admin/outfits",
      icon: <IconHanger className="size-5 shrink-0" />,
      label: "Outfits",
    },
  ];

  return (
    <SidebarBody className="justify-between gap-10">
      <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
        <AdminLogo compact={!open} />
        <div className="mt-8 flex flex-col gap-2">
          {links.map((link) => {
            const active = Boolean(link.tab && activeTab === link.tab);

            return (
              <SidebarLink
                key={link.href}
                link={{
                  href: link.href,
                  icon: (
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-2xl transition ${
                        active
                          ? "bg-blue-500/20 text-blue-100 ring-1 ring-blue-300/30"
                          : "bg-white/[0.04] text-neutral-400 ring-1 ring-white/10"
                      }`}
                    >
                      {link.icon}
                    </span>
                  ),
                  label: link.label,
                }}
                className={active ? "bg-blue-500/15" : ""}
                onClick={(event) => {
                  if (link.tab) {
                    event.preventDefault();
                    onTabChange(link.tab);
                  }
                  setOpen(false);
                }}
              />
            );
          })}
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

function ImageUploadBox({
  disabled,
  onFile,
}: Readonly<{
  disabled: boolean;
  onFile: (file: File) => void;
}>) {
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (disabled) {
      return;
    }

    const handleDocumentPaste = (event: ClipboardEvent) => {
      const image = getPastedImageFromClipboard(event.clipboardData);

      if (!image) {
        return;
      }

      event.preventDefault();
      onFile(image);
    };

    document.addEventListener("paste", handleDocumentPaste);

    return () => {
      document.removeEventListener("paste", handleDocumentPaste);
    };
  }, [disabled, onFile]);

  return (
    <div
      tabIndex={0}
      onPaste={(event) => {
        const image = getPastedImage(event);

        if (!image) {
          return;
        }

        event.preventDefault();
        onFile(image);
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const image = Array.from(event.dataTransfer.files).find((file) =>
          file.type.startsWith("image/"),
        );

        if (image) {
          onFile(image);
        }
      }}
      className={`relative grid gap-4 rounded-3xl border border-dashed p-5 outline-none transition ${
        dragging
          ? "border-blue-300/70 bg-blue-500/15"
          : "border-white/10 bg-white/[0.03] focus:border-blue-300/60 focus:bg-blue-500/10"
      } ${disabled ? "pointer-events-none opacity-60" : ""}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-blue-500/15 text-blue-200 ring-1 ring-blue-300/20">
            {disabled ? <IconLoader2 className="size-5 animate-spin" /> : <IconUpload className="size-5" />}
          </span>
          <div>
            <h3 className="font-semibold text-white">Upload or paste image</h3>
            <p className="text-sm text-slate-500">
              Drop a file here, click upload, or focus this box and paste an image.
            </p>
          </div>
        </div>

        <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.09]">
          <IconPhoto className="size-4" />
          Choose file
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={disabled}
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                onFile(file);
              }

              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/30 px-3 py-1">
          <IconClipboard className="size-3.5" />
          Ctrl + V anywhere
        </span>
        <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1">
          PNG, JPG, WEBP
        </span>
        <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1">
          rembg + Cloudinary
        </span>
      </div>
    </div>
  );
}

function StatusMessage({
  status,
}: {
  status: { tone: "error" | "success"; text: string } | null;
}) {
  if (!status) {
    return null;
  }

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
    <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function IconButton({
  children,
  danger,
  disabled,
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
      onClick={onClick}
      disabled={disabled}
      className={`grid size-10 place-items-center rounded-2xl border transition disabled:cursor-not-allowed disabled:opacity-60 ${
        danger
          ? "border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
          : "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
      }`}
    >
      {children}
    </button>
  );
}

function TextInput({
  inputMode,
  label,
  onChange,
  placeholder,
  value,
}: {
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-slate-300">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode={inputMode}
        placeholder={placeholder}
        className="h-11 min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/60 focus:bg-white/[0.07]"
      />
    </label>
  );
}

function SelectInput({
  label,
  onChange,
  options,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  value: string;
}) {
  return (
    <AdminSelect
      label={label}
      value={value}
      options={options}
      placeholder={placeholder}
      onChange={onChange}
    />
  );
}

function ProductPreview({ form }: { form: ProductForm }) {
  return (
    <aside className="sticky top-6 h-fit rounded-[28px] border border-white/10 bg-[#0b0c12] p-4 shadow-2xl shadow-black/30">
      <div className="relative aspect-[1/1.08] overflow-hidden rounded-[22px] bg-white/[0.04]">
        {form.image ? (
          <img src={form.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-slate-600">
            <IconPhoto className="size-12" />
          </div>
        )}
      </div>
      <div className="grid gap-4 p-2 pt-5">
        <h3 className="line-clamp-2 min-h-12 text-xl font-bold text-white">
          {form.name || "Product name"}
        </h3>
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          {form.category ? <span className="rounded-full bg-white/[0.04] px-3 py-1">{form.category}</span> : null}
          {form.brand ? <span className="rounded-full bg-white/[0.04] px-3 py-1">{form.brand}</span> : null}
          {form.weight ? <span className="rounded-full bg-white/[0.04] px-3 py-1">{form.weight}g</span> : null}
        </div>
        <div className="border-t border-white/10 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Price
          </p>
          <span className="mt-1 block text-2xl font-black text-white">
            {form.priceCny ? `${form.priceCny} CNY` : "0 CNY"}
          </span>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-bold text-black">
          Buy Now
        </div>
      </div>
    </aside>
  );
}
