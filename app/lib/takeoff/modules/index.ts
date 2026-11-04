import type { WorkPackage } from "../package";
import { loftPackage } from "./loft";
import { extensionPackage } from "./extension";
import { roofingPackage } from "./roofing";

/**
 * Whole-house projects, in programme order. Room-by-room work (plastering,
 * painting, flooring, electrics, heating, doors, windows, kitchens, bathrooms)
 * is set on each room – see rooms.ts.
 */
export const workPackages: WorkPackage[] = [loftPackage, extensionPackage, roofingPackage];
export const packageById = (id: string) => workPackages.find(p => p.id === id);
