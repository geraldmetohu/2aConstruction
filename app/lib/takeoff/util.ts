/** Round money to pennies, half up. */
export const money = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;
/** Round a measured quantity up to 2 decimals (never under-order). */
export const qty2 = (x: number) => Math.ceil(x * 100 - 1e-9) / 100;
/** Short number for formula text. */
export const fmt = (x: number, dp = 2) => Number(x.toFixed(dp)).toString();
