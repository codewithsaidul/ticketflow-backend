import { Model } from "mongoose";


export async function isSlugExists<T extends { slug?: string }>(
  model: Model<T>,
  slug: string
) {
  const existing = await model.findOne({ slug }).lean().exec();
  return !!existing;
}


export function slugifyText(text: string, maxLength = 50) {
  if (!text) return "";

  let slug = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-") 
    .replace(/^-+|-+$/g, ""); 

  if (slug.length > maxLength) {
    const cutIndex = slug.lastIndexOf("-", maxLength);
    slug = slug.slice(0, cutIndex > 0 ? cutIndex : maxLength);
  }

  return slug;
}


export async function slugifyUnique<T extends { slug?: string }>(
  values: string[],
  model: Model<T>,
  maxLength = 50
) {
  if (!values || values.length === 0) return "";

  const combined = values.filter(Boolean).join(" ");
  let slug = slugifyText(combined, maxLength);

  let uniqueSlug = slug;
  let counter = 1;

  while (await isSlugExists(model, uniqueSlug)) {
    uniqueSlug = `${slug}-${counter++}`;

    if (uniqueSlug.length > maxLength) {
      const allowedLength = maxLength - (`-${counter - 1}`).length;
      const cutIndex = slug.lastIndexOf("-", allowedLength);
      slug = slug.slice(0, cutIndex > 0 ? cutIndex : allowedLength);
      uniqueSlug = `${slug}-${counter - 1}`;
    }
  }

  return uniqueSlug;
}