// Areas we cover, used for the area pages, the footer, the sitemap and structured data for search engines.
// Keep the wording factual and specific to each place: thin, copy-paste location pages hurt rankings.

export interface Area {
  slug: string;
  name: string;
  region: "London" | "North London" | "South East";
  kind: "hub" | "borough" | "county";
  postcodes: string;
  homes: string;      // the housing you typically find there
  projects: string;   // what people there usually ask us for
  planning: string;   // practical planning / Building Control note
  nearby: string[];   // other area slugs to link to
  match: string[];    // words that identify projects in this area (location field)
}

export const AREAS: Area[] = [
  { slug: "london", name: "London", region: "London", kind: "hub", postcodes: "N, NW, E, EN, HA, IG",
    homes: "Victorian and Edwardian terraces, inter-war semis and purpose-built flats make up most of the homes we work on across the capital.",
    projects: "Rear and side-return extensions, loft conversions, full refurbishments and re-roofs are the bulk of our London work.",
    planning: "Each borough runs its own planning department and conservation areas, so we check the rules for your street before drawings start.",
    nearby: ["north-london", "south-east"], match: ["london", "n", "nw", "e", "en", "ha", "ig"] },
  { slug: "north-london", name: "North London", region: "North London", kind: "hub", postcodes: "N, NW, EN, HA",
    homes: "North London is mostly Victorian and Edwardian terraces in the inner boroughs and 1930s semi-detached houses further out.",
    projects: "Hip-to-gable and rear dormer lofts, kitchen extensions and whole-house refurbishments are what we build most here.",
    planning: "Many lofts and single-storey rear extensions fall under permitted development, but conservation areas and flats need full planning permission.",
    nearby: ["enfield", "barnet", "haringey", "islington", "camden"], match: ["north london", "n", "nw", "en", "ha"] },
  { slug: "enfield", name: "Enfield", region: "North London", kind: "borough", postcodes: "EN1–EN3, N9, N13, N14, N18, N21",
    homes: "Enfield has a large stock of 1930s semi-detached and terraced houses, with Victorian streets around Enfield Town and Edmonton.",
    projects: "Hip-to-gable loft conversions, wraparound and rear kitchen extensions, and re-roofing of original tiled roofs.",
    planning: "Most loft dormers here are permitted development; we confirm with a Lawful Development Certificate before work starts.",
    nearby: ["barnet", "haringey", "hertfordshire", "waltham-forest"], match: ["enfield", "edmonton", "palmers green", "winchmore hill", "southgate", "en1", "en2", "en3", "n9", "n13", "n14", "n18", "n21"] },
  { slug: "barnet", name: "Barnet", region: "North London", kind: "borough", postcodes: "EN4, EN5, N2, N3, N11, N12, N20, NW4, NW7, NW11",
    homes: "Barnet mixes Edwardian terraces in Finchley with inter-war semis and larger detached houses in Mill Hill and Totteridge.",
    projects: "Double-storey and side extensions, loft conversions with en-suites, and full refurbishments of family houses.",
    planning: "Parts of Barnet sit in conservation areas and the Hampstead Garden Suburb, where extensions need careful design and full planning.",
    nearby: ["enfield", "haringey", "camden", "harrow"], match: ["barnet", "finchley", "mill hill", "totteridge", "whetstone", "hendon", "golders green", "en4", "en5", "n2", "n3", "n11", "n12", "n20", "nw4", "nw7", "nw11"] },
  { slug: "haringey", name: "Haringey", region: "North London", kind: "borough", postcodes: "N4, N6, N8, N10, N15, N17, N22",
    homes: "Haringey is dominated by Victorian and Edwardian terraces in Crouch End, Muswell Hill, Hornsey and Tottenham.",
    projects: "Side-return kitchen extensions, rear dormer lofts and full refurbishments of period terraces.",
    planning: "Large conservation areas in Crouch End and Muswell Hill mean extensions are often designed to match original brick and joinery.",
    nearby: ["enfield", "islington", "barnet", "hackney"], match: ["haringey", "crouch end", "muswell hill", "hornsey", "tottenham", "wood green", "n4", "n6", "n8", "n10", "n15", "n17", "n22"] },
  { slug: "islington", name: "Islington", region: "North London", kind: "borough", postcodes: "N1, N5, N7, N19, EC1",
    homes: "Islington is Georgian and Victorian terraces, converted flats and mansion blocks, many in conservation areas.",
    projects: "Rear extensions, lower-ground and basement refurbishments, mansard roofs and high-end full refurbishments.",
    planning: "Much of the borough is conservation area, so most external changes need full planning permission and sympathetic materials.",
    nearby: ["camden", "hackney", "haringey"], match: ["islington", "highbury", "holloway", "archway", "angel", "n1", "n5", "n7", "n19"] },
  { slug: "camden", name: "Camden", region: "North London", kind: "borough", postcodes: "NW1, NW3, NW5, NW6, N6, WC1",
    homes: "Camden has Victorian villas and terraces in Kentish Town and Tufnell Park, and larger period houses in Hampstead.",
    projects: "Mansard and dormer lofts, rear extensions and full refurbishments, often with careful party wall work.",
    planning: "Camden has many conservation areas and listed buildings; we plan drawings and party wall notices early to protect the programme.",
    nearby: ["islington", "barnet", "brent", "haringey"], match: ["camden", "kentish town", "hampstead", "tufnell park", "west hampstead", "nw1", "nw3", "nw5", "nw6"] },
  { slug: "hackney", name: "Hackney", region: "North London", kind: "borough", postcodes: "E2, E5, E8, E9, N1, N16",
    homes: "Hackney is mostly Victorian terraces and conversions in Stoke Newington, Clapton and Dalston.",
    projects: "Side-return extensions, loft conversions and refurbishments of terraced houses and flats.",
    planning: "Conservation areas cover parts of Stoke Newington and De Beauvoir, which affects materials and roof extensions.",
    nearby: ["islington", "haringey", "waltham-forest"], match: ["hackney", "stoke newington", "clapton", "dalston", "e5", "e8", "e9", "n16"] },
  { slug: "waltham-forest", name: "Waltham Forest", region: "North London", kind: "borough", postcodes: "E4, E10, E11, E17",
    homes: "Waltham Forest has rows of Victorian and Edwardian terraces, including the well-known 'Warner' homes in Walthamstow.",
    projects: "Loft conversions, rear kitchen extensions and full refurbishments of terraced family houses.",
    planning: "Some Warner estates and conservation areas have specific design guidance for dormers and extensions.",
    nearby: ["enfield", "hackney", "essex"], match: ["waltham forest", "walthamstow", "leyton", "chingford", "leytonstone", "e4", "e10", "e11", "e17"] },
  { slug: "harrow", name: "Harrow", region: "North London", kind: "borough", postcodes: "HA1–HA3, HA5, HA7",
    homes: "Harrow is largely 1930s semi-detached and detached houses with generous gardens.",
    projects: "Double-storey side extensions, large rear extensions and hip-to-gable loft conversions.",
    planning: "Bigger extensions here usually go through householder planning; we prepare the drawings and the application.",
    nearby: ["barnet", "brent", "hertfordshire"], match: ["harrow", "pinner", "stanmore", "wealdstone", "ha1", "ha2", "ha3", "ha5", "ha7"] },
  { slug: "brent", name: "Brent", region: "North London", kind: "borough", postcodes: "HA0, HA9, NW2, NW6, NW9, NW10",
    homes: "Brent has Edwardian terraces in Kilburn and Willesden and inter-war semis in Kingsbury and Wembley.",
    projects: "Loft conversions, rear extensions and refurbishments, including flats and HMOs.",
    planning: "Article 4 areas and conservation areas apply in parts of Brent; we check before any drawings are finalised.",
    nearby: ["camden", "harrow", "barnet"], match: ["brent", "kilburn", "willesden", "wembley", "kingsbury", "nw2", "nw9", "nw10", "ha0", "ha9"] },
  { slug: "south-east", name: "the South East", region: "South East", kind: "hub", postcodes: "AL, CM, SG, SS, DA, BR, GU, KT",
    homes: "Outside London we mostly work on detached and semi-detached family houses, bungalows and new-build estates.",
    projects: "Larger extensions, loft and bungalow conversions, re-roofs and whole-house refurbishments.",
    planning: "District councils each have their own design guides; we prepare drawings and applications to suit.",
    nearby: ["hertfordshire", "essex", "kent", "surrey"], match: ["kent", "essex", "surrey", "hertfordshire", "herts", "sussex"] },
  { slug: "hertfordshire", name: "Hertfordshire", region: "South East", kind: "county", postcodes: "AL, EN6–EN11, SG, WD",
    homes: "Hertfordshire towns such as Cheshunt, Potters Bar and Watford have inter-war semis, bungalows and newer estates.",
    projects: "Bungalow and loft conversions, double-storey extensions and kitchen extensions.",
    planning: "Green Belt rules apply around many Hertfordshire towns, which limits extension sizes; we design within them.",
    nearby: ["enfield", "barnet", "south-east"], match: ["hertfordshire", "herts", "cheshunt", "potters bar", "watford", "st albans", "waltham cross", "en6", "en7", "en8", "en9", "en10", "en11"] },
  { slug: "essex", name: "Essex", region: "South East", kind: "county", postcodes: "CM, IG, RM, SS",
    homes: "Essex towns near London, such as Loughton, Chigwell and Romford, have semis, bungalows and detached houses.",
    projects: "Rear and wraparound extensions, loft conversions and full refurbishments.",
    planning: "Epping Forest and other districts include Green Belt land, so we check limits on extensions early.",
    nearby: ["waltham-forest", "south-east", "kent"], match: ["essex", "loughton", "chigwell", "romford", "epping", "ilford", "ig", "rm", "cm", "ss"] },
  { slug: "kent", name: "Kent", region: "South East", kind: "county", postcodes: "BR, DA, ME, TN",
    homes: "North-west Kent and the Bromley and Bexley fringes have inter-war semis, bungalows and newer family homes.",
    projects: "Extensions, loft conversions and re-roofs on family houses and bungalows.",
    planning: "We work with the local district council on householder applications and Building Control sign-off.",
    nearby: ["south-east", "essex", "surrey"], match: ["kent", "dartford", "sevenoaks", "bromley", "bexley", "da", "br", "me", "tn"] },
  { slug: "surrey", name: "Surrey", region: "South East", kind: "county", postcodes: "GU, KT, RH, SM",
    homes: "Surrey is mostly detached and semi-detached family houses, many from the inter-war and post-war years.",
    projects: "Large extensions, loft conversions and whole-house refurbishments.",
    planning: "Much of Surrey is Green Belt; extension sizes and designs are checked against local policy before drawings are final.",
    nearby: ["south-east", "kent"], match: ["surrey", "woking", "guildford", "kingston", "epsom", "gu", "kt", "rh"] },
];

export const areaBySlug = (s: string) => AREAS.find(a => a.slug === s);
export const SITE_URL = "https://2aconstruction.co.uk";

/** True when a project's location text belongs to this area (place names, or postcode districts like "EN2"). */
export function inArea(area: Area, location: string): boolean {
  const l = ` ${location.toLowerCase()} `;
  return area.match.some(raw => {
    const tok = raw.trim().toLowerCase();
    if (/^[a-z]{1,2}$/.test(tok)) return new RegExp(`\\b${tok}\\d`).test(l);           // "en" → EN1, EN2…
    if (/^[a-z]{1,2}\d+$/.test(tok)) return new RegExp(`\\b${tok}\\b`).test(l);       // "en2" exactly
    return l.includes(tok);
  });
}
