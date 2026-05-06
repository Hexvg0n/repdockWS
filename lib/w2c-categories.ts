export function normalizeCategoryName(value: string) {
  return value.trim().replaceAll(/\s+/g, " ");
}

export function slugifyCategory(value: string) {
  return normalizeCategoryName(value)
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}
