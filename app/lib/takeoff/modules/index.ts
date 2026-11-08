import type { WorkPackage } from "../package";
import { loftPackage } from "./loft";
import { extensionPackage } from "./extension";
import { roofingPackage } from "./roofing";
import { externalPackage } from "./external";
import { gardenPackage } from "./garden";
import { cleaningPackage } from "./cleaning";
import { demolitionPackage } from "./demolition";

/**
 * Whole-house projects, in programme order. Room-by-room work (plastering,
 * painting, flooring, electrics, heating, doors, windows, kitchens, bathrooms)
 * is set on each room – see rooms.ts.
 */
export const workPackages: WorkPackage[] = [demolitionPackage, loftPackage, extensionPackage, roofingPackage, externalPackage, gardenPackage, cleaningPackage];
export const packageById = (id: string) => workPackages.find(p => p.id === id);
