/**
 * Stock photography for the About, Services and Contact pages.
 * All photos are free under the Unsplash License (commercial use allowed, no attribution required),
 * served from images.unsplash.com, which is already allowed in next.config.ts.
 * Credits are kept here as a courtesy to the photographers.
 */
const u = (id: string, w = 2000) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const STOCK = {
  // About
  aboutHero: u("1653280662710-1cac52cde6d7"),            // shraga kopstein – builders on a housing site
  aboutBand: [
    u("1502005097973-6a7082348e28"),                     // Jason Briscoe – white kitchen with glazed doors
    u("1763665814538-8ba04597286c", 1200),               // Sergej – roofers laying tiles
    u("1517581177682-a085bb7ffb15", 1200),               // Milivoj Kuhar – fitting out a room
  ],
  principles: [
    u("1721244653652-268631ec049a", 1200),               // Amsterdam City Archives – elevations and floor plan
    u("1763665814965-b5c4b3547908", 1200),               // Sergej – roof tiles going on
    u("1554995207-c18c203602cb", 1200),                  // Kara Eads – finished living room
  ],
  faq: u("1505798577917-a65157d3320a", 1200),           // Annie Gray – carpenter at the mitre saw

  // Services
  servicesHero: u("1769326541248-5e09a8ace25b"),         // Puscas Adryan – kitchen with island
  services: {
    extention: u("1502005097973-6a7082348e28", 1600),    // Jason Briscoe – kitchen opening onto the garden
    loft: u("1779941373840-a93f6e0d5db0", 1600),         // Meg – roof with a dormer window
    refurbishment: u("1618832515490-e181c4794a45", 1600),// immo RENOVATION – kitchen mid-refurbishment
    roof: u("1763665814538-8ba04597286c", 1600),         // Sergej – roofers laying tiles
    general: u("1653280662710-1cac52cde6d7", 1600),      // shraga kopstein – builders on site
    painting: u("1599619585752-c3edb42a414c", 1000),     // Karl Solano – roller and paint tray
    flooring: u("1584622781564-1d987f7333c1", 1000),     // Lotus Design N Print – parquet floor
    plumbing: u("1576698483491-8c43f0862543", 1000),     // Amira Aboalnaga – basin
    electrical: u("1758101755915-462eddc23f57", 1000),   // Toolmash Expo – electrician testing a board
  } as Record<string, string>,
  estimate: u("1772442198624-4fc4d7281e89", 1400),       // GN Group – reviewing drawings on site
  servicesCta: u("1579847188804-ecba0e2ea330"),          // Shivendu Shukla – builders at sunset

  // Contact
  contactHero: u("1772442198624-4fc4d7281e89"),          // GN Group – reviewing drawings on site
  contactSteps: [
    u("1554995207-c18c203602cb", 1000),                  // Kara Eads – living room
    u("1517581177682-a085bb7ffb15", 1000),               // Milivoj Kuhar – measuring up inside
    u("1721244653546-a96caf5689ef", 1000),               // Amsterdam City Archives – drawings
  ],
  contactSide: u("1731168273756-e02cae42265b", 1000),    // Renovations Certified – cutting tiles
};
