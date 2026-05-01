import type { Upeg } from "../types";

export interface NamedSet {
  slug: string;          // URL slug, e.g. "bichrome"
  title: string;         // human-readable name
  description: string;   // 1-line explanation shown on the cards
  badge?: string;        // optional inline marker (emoji or short text)
  predicate: (u: Upeg) => boolean;
}

const has = (u: Upeg, key: string) => u.traits[key] === 1;

export const NAMED_SETS: readonly NamedSet[] = [
  {
    slug: "bichrome",
    title: "Bichrome",
    description: "Visually rendered with only 2 distinct colors. The rarest visual minimalism.",
    badge: "🌗",
    predicate: (u) => u.traits.n_distinct_colors === 2,
  },
  {
    slug: "full-set",
    title: "Full Set",
    description: "Has all five optional features: horn, accessories, wings, hair, tail.",
    badge: "✨",
    predicate: (u) =>
      has(u, "has_horn") &&
      has(u, "has_accessories") &&
      has(u, "has_wings") &&
      has(u, "has_hair") &&
      has(u, "has_tail"),
  },
  {
    slug: "naked",
    title: "Naked",
    description: "None of the five optional features. Pure body, eyes, and legs.",
    badge: "🦴",
    predicate: (u) =>
      !has(u, "has_horn") &&
      !has(u, "has_accessories") &&
      !has(u, "has_wings") &&
      !has(u, "has_hair") &&
      !has(u, "has_tail"),
  },
  {
    slug: "trichrome",
    title: "Trichrome",
    description: "Rendered in exactly 3 distinct colors.",
    badge: "🎨",
    predicate: (u) => u.traits.n_distinct_colors === 3,
  },
  {
    slug: "full-spectrum",
    title: "Full Spectrum",
    description: "Maximum visual variety — 7 distinct rendered colors.",
    badge: "🌈",
    predicate: (u) => u.traits.n_distinct_colors === 7,
  },
];

export function getSet(slug: string): NamedSet | undefined {
  return NAMED_SETS.find((s) => s.slug === slug);
}

export function setMembers(set: NamedSet, items: Upeg[]): Upeg[] {
  return items.filter(set.predicate);
}
