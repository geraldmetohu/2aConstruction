import type { WorkPackage } from "../package";
import { loftPackage } from "./loft";
import { extensionPackage } from "./extension";
import { roofingPackage } from "./roofing";
import { externalPackage } from "./external";
import { gardenPackage } from "./garden";
import { cleaningPackage } from "./cleaning";
import { demolitionPackage } from "./demolition";
import { conversionPackage } from "./conversion";
import { outbuildingPackage } from "./outbuilding";
import { basementPackage } from "./basement";
import { dampPackage } from "./damp";
import { internalPackage } from "./internal";
import { windowsPackage } from "./windows";
import { heatingPackage } from "./heating";
import { energyPackage } from "./energy";
import { airconPackage } from "./aircon";
import { joineryPackage } from "./joinery";

/**
 * Whole-house projects, in programme order. Room-by-room work (plastering,
 * painting, flooring, electrics, heating, doors, windows, kitchens, bathrooms)
 * is set on each room – see rooms.ts.
 */
export const workPackages: WorkPackage[] = [
  demolitionPackage, basementPackage, dampPackage, loftPackage, extensionPackage, conversionPackage, internalPackage, roofingPackage, windowsPackage,
  externalPackage, heatingPackage, airconPackage, joineryPackage, energyPackage, outbuildingPackage, gardenPackage, cleaningPackage,
];
export const packageById = (id: string) => workPackages.find(p => p.id === id);
