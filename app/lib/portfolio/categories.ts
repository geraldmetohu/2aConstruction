// Public names and copy for each portfolio category.
// The slugs match the live Category enum exactly (including "extention"), so nothing in the database changes.

export type CategorySlug = "general" | "refurbishment" | "loft" | "extention" | "roof" | "painting" | "flooring" | "plumbing" | "electrical";
export type PortfolioFilter = CategorySlug | "all";

export interface CategoryMeta {
  slug: CategorySlug;
  number: string;
  title: string;
  short: string;
  image: string;
  tagline: string;
  intro: string;
  typicalScope: string[];
}

export const CATEGORY_META: Record<CategorySlug, CategoryMeta> = {
  extention: {
    slug: "extention", number: "01", title: "House Extensions", short: "Extensions", image: "/images/ext.jpeg",
    tagline: "More room, more light, built to belong to the house.",
    intro: "Rear, side-return, wraparound and double-storey extensions. We take care of the structure, steels, drainage, roofing and glazing, and we make sure the new part sits naturally with the original house.",
    typicalScope: ["Foundations & drainage", "Structural steels", "Blockwork & brickwork", "Flat or pitched roof", "Bi-fold / sliding glazing", "Underfloor heating", "Building Control sign-off"],
  },
  loft: {
    slug: "loft", number: "02", title: "Loft Conversions", short: "Lofts", image: "/images/loft.jpg",
    tagline: "The space you already own, made into rooms you'll use.",
    intro: "Rear dormer, L-shape, hip-to-gable, mansard and Velux conversions. We build the new floor, stairs, dormer, insulation and fire protection, and we usually add a bedroom and an en-suite.",
    typicalScope: ["Steel & floor joists", "Dormer construction", "New staircase", "Fire doors & protected escape", "Insulation to Part L", "En-suite bathroom", "Velux / dormer windows"],
  },
  refurbishment: {
    slug: "refurbishment", number: "03", title: "Refurbishments", short: "Refurbishments", image: "/images/refurb.jpg",
    tagline: "Whole homes rethought, room by room.",
    intro: "Full and partial refurbishments, from strip-out to final decoration. That covers reconfigured layouts, new kitchens and bathrooms, rewiring, re-plumbing, plastering and joinery, all run in a sensible order by one team.",
    typicalScope: ["Strip-out & making good", "Layout changes", "First & second fix electrics", "Plumbing & heating", "Plastering", "Kitchens & bathrooms", "Decoration"],
  },
  roof: {
    slug: "roof", number: "04", title: "Roofing", short: "Roofing", image: "/images/roof_edmonton.jpg",
    tagline: "Roofs detailed properly, so they last.",
    intro: "Re-roofs in slate and tile, GRP and EPDM flat roofs, leadwork, fascias, soffits and guttering. Every roof gets the right underlay, ventilation and flashing details.",
    typicalScope: ["Scaffold & strip", "Breathable membrane & battens", "Slate / tile / GRP / EPDM", "Leadwork & flashings", "Fascia, soffit & gutters", "Ridge & hip systems"],
  },
  general: {
    slug: "general", number: "05", title: "General Building", short: "General", image: "/images/general.jpg",
    tagline: "The everyday building work, done carefully.",
    intro: "Structural alterations, knock-throughs, brickwork, groundworks and repairs. These are the smaller jobs that still need proper planning and a tidy site.",
    typicalScope: ["Wall removal & steels", "Brickwork & repointing", "Groundworks", "Repairs & making good", "Garden walls & paving"],
  },
  painting: {
    slug: "painting", number: "06", title: "Painting & Decorating", short: "Decorating", image: "/images/handover.jpg",
    tagline: "Clean preparation, crisp lines and finishes that last.",
    intro: "Interior and exterior decorating, with the preparation done properly: filling, sanding, priming and mist coats, then durable finishes and sharp cutting-in.",
    typicalScope: ["Preparation & filling", "Mist coat on new plaster", "Walls & ceilings", "Woodwork in eggshell / satin", "Exterior masonry"],
  },
  flooring: {
    slug: "flooring", number: "07", title: "Flooring", short: "Flooring", image: "/images/build.jpg",
    tagline: "Level floors, tight joints, tidy thresholds.",
    intro: "We fit engineered wood, laminate, LVT and tile on properly prepared bases: levelling, ply or underlay where needed, and neat beading and thresholds.",
    typicalScope: ["Subfloor levelling", "Ply / underlay", "Engineered wood & LVT", "Floor tiling", "Thresholds & beading"],
  },
  plumbing: {
    slug: "plumbing", number: "08", title: "Plumbing & Heating", short: "Plumbing", image: "/images/site_insp.jpg",
    tagline: "Pipework planned before the walls close up.",
    intro: "Bathroom and kitchen plumbing, radiators, towel rails, mains upgrades and wastes. Everything is pressure tested and neatly routed.",
    typicalScope: ["First & second fix", "Wastes & soil", "Radiators & towel rails", "Mains water upgrades", "Pressure testing"],
  },
  electrical: {
    slug: "electrical", number: "09", title: "Electrical", short: "Electrical", image: "/images/quote.jpg",
    tagline: "Safe, certified and laid out for how you live.",
    intro: "Rewires, consumer units, lighting design, sockets and data, tested and certified. The circuits, switch positions and spotlight layouts are planned with you room by room.",
    typicalScope: ["Rewires", "Consumer unit & RCBOs", "Downlights & pendants", "Sockets, data & TV", "Testing & certification"],
  },
};

export const CATEGORY_ORDER: CategorySlug[] = ["extention", "loft", "refurbishment", "roof", "general", "painting", "flooring", "plumbing", "electrical"];

export const isCategory = (s: string): s is CategorySlug => s in CATEGORY_META;

export function categoryTitle(slug: string): string {
  return isCategory(slug) ? CATEGORY_META[slug].short : slug.charAt(0).toUpperCase() + slug.slice(1);
}

const NOUN: Record<CategorySlug, string> = {
  extention: "Extension", loft: "Loft conversion", refurbishment: "Refurbishment", roof: "Roofing", general: "Building work",
  painting: "Decorating", flooring: "Flooring", plumbing: "Plumbing", electrical: "Electrical",
};
/** "Extension in Enfield, June 2025" style credit line. */
export function creditLine(category: string, location: string, completed: string): string {
  const noun = isCategory(category) ? NOUN[category] : categoryTitle(category);
  return `${noun}${location ? ` in ${location}` : ""}${completed ? `, ${completed}` : ""}`;
}
