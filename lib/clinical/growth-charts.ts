/**
 * Pediatric growth charts — WHO Child Growth Standards (simplified LMS
 * reference at key ages). Used by the Growth tab to plot weight-for-age,
 * height-for-age and BMI-for-age and to compute z-scores.
 *
 * NOTE: reference values are rounded approximations of the WHO 2006/2007
 * standards for clinical decision support; verify against full tables for
 * regulatory use.
 */

export type Sex = "male" | "female";
export type GrowthMeasure = "weight" | "height" | "bmi";

interface LmsPoint {
    month: number;
    L: number;
    M: number;
    S: number;
}

const WFA_MALE: LmsPoint[] = [
    { month: 0, L: 0.3487, M: 3.3464, S: 0.14602 },
    { month: 2, L: 0.2297, M: 5.5675, S: 0.11397 },
    { month: 4, L: 0.1038, M: 7.002, S: 0.09728 },
    { month: 6, L: 0.0399, M: 7.934, S: 0.09228 },
    { month: 9, L: -0.0581, M: 8.909, S: 0.09404 },
    { month: 12, L: -0.1557, M: 9.6468, S: 0.09607 },
    { month: 15, L: -0.2116, M: 10.304, S: 0.09867 },
    { month: 18, L: -0.2408, M: 10.881, S: 0.10177 },
    { month: 24, L: -0.2172, M: 12.017, S: 0.10814 },
    { month: 30, L: -0.1231, M: 13.003, S: 0.11465 },
    { month: 36, L: 0.0062, M: 13.866, S: 0.1209 },
    { month: 42, L: 0.1317, M: 14.683, S: 0.12663 },
    { month: 48, L: 0.2546, M: 15.528, S: 0.13215 },
    { month: 54, L: 0.3796, M: 16.433, S: 0.13718 },
    { month: 60, L: 0.5135, M: 17.456, S: 0.14131 },
];

const WFA_FEMALE: LmsPoint[] = [
    { month: 0, L: 0.3809, M: 3.2322, S: 0.14171 },
    { month: 2, L: 0.2671, M: 5.1584, S: 0.10806 },
    { month: 4, L: 0.1747, M: 6.4639, S: 0.09656 },
    { month: 6, L: 0.1085, M: 7.3762, S: 0.09321 },
    { month: 9, L: 0.0185, M: 8.3764, S: 0.09376 },
    { month: 12, L: -0.0704, M: 9.1887, S: 0.09519 },
    { month: 15, L: -0.1328, M: 9.8981, S: 0.0974 },
    { month: 18, L: -0.1741, M: 10.553, S: 0.09991 },
    { month: 24, L: -0.1788, M: 11.85, S: 0.10563 },
    { month: 30, L: -0.1285, M: 12.928, S: 0.11102 },
    { month: 36, L: -0.0403, M: 13.868, S: 0.11572 },
    { month: 42, L: 0.0521, M: 14.761, S: 0.11999 },
    { month: 48, L: 0.151, M: 15.702, S: 0.12381 },
    { month: 54, L: 0.2603, M: 16.736, S: 0.1267 },
    { month: 60, L: 0.3866, M: 17.922, S: 0.12846 },
];

const HFA_MALE: LmsPoint[] = [
    { month: 0, L: 1, M: 49.8842, S: 0.03795 },
    { month: 2, L: 1, M: 58.4249, S: 0.03416 },
    { month: 4, L: 1, M: 64.1109, S: 0.03255 },
    { month: 6, L: 1, M: 67.8609, S: 0.03222 },
    { month: 9, L: 1, M: 71.584, S: 0.03327 },
    { month: 12, L: 1, M: 74.895, S: 0.03483 },
    { month: 15, L: 1, M: 77.803, S: 0.03648 },
    { month: 18, L: 1, M: 80.507, S: 0.03812 },
    { month: 24, L: 1, M: 85.557, S: 0.04102 },
    { month: 30, L: 1, M: 90.139, S: 0.04365 },
    { month: 36, L: 1, M: 94.388, S: 0.04629 },
    { month: 42, L: 1, M: 98.291, S: 0.04871 },
    { month: 48, L: 1, M: 101.94, S: 0.05072 },
    { month: 54, L: 1, M: 105.48, S: 0.05246 },
    { month: 60, L: 1, M: 109.818, S: 0.05401 },
];

const HFA_FEMALE: LmsPoint[] = [
    { month: 0, L: 1, M: 49.1477, S: 0.0379 },
    { month: 2, L: 1, M: 57.0598, S: 0.03429 },
    { month: 4, L: 1, M: 62.6979, S: 0.03283 },
    { month: 6, L: 1, M: 66.482, S: 0.03267 },
    { month: 9, L: 1, M: 70.321, S: 0.03408 },
    { month: 12, L: 1, M: 73.713, S: 0.03584 },
    { month: 15, L: 1, M: 76.66, S: 0.03771 },
    { month: 18, L: 1, M: 79.396, S: 0.0395 },
    { month: 24, L: 1, M: 84.539, S: 0.04099 },
    { month: 30, L: 1, M: 89.366, S: 0.04263 },
    { month: 36, L: 1, M: 93.962, S: 0.04432 },
    { month: 42, L: 1, M: 98.22, S: 0.04584 },
    { month: 48, L: 1, M: 102.2, S: 0.04701 },
    { month: 54, L: 1, M: 106.04, S: 0.04792 },
    { month: 60, L: 1, M: 109.715, S: 0.04864 },
];

const BMI_MALE: LmsPoint[] = [
    { month: 6, L: -0.5681, M: 17.427, S: 0.08631 },
    { month: 9, L: -0.6002, M: 17.228, S: 0.08428 },
    { month: 12, L: -0.5623, M: 17.139, S: 0.08345 },
    { month: 15, L: -0.5254, M: 16.919, S: 0.0829 },
    { month: 18, L: -0.4917, M: 16.691, S: 0.08256 },
    { month: 24, L: -0.4071, M: 16.302, S: 0.08217 },
    { month: 30, L: -0.3478, M: 15.988, S: 0.08219 },
    { month: 36, L: -0.2888, M: 15.755, S: 0.08249 },
    { month: 42, L: -0.215, M: 15.586, S: 0.08293 },
    { month: 48, L: -0.1327, M: 15.461, S: 0.08338 },
    { month: 54, L: -0.0584, M: 15.342, S: 0.08363 },
    { month: 60, L: -0.0016, M: 15.203, S: 0.0836 },
];

const BMI_FEMALE: LmsPoint[] = [
    { month: 6, L: -0.2684, M: 17.056, S: 0.09162 },
    { month: 9, L: -0.3018, M: 16.899, S: 0.08943 },
    { month: 12, L: -0.3082, M: 16.796, S: 0.08841 },
    { month: 15, L: -0.3173, M: 16.574, S: 0.08792 },
    { month: 18, L: -0.3317, M: 16.353, S: 0.08777 },
    { month: 24, L: -0.3456, M: 16.031, S: 0.08824 },
    { month: 30, L: -0.3807, M: 15.752, S: 0.08904 },
    { month: 36, L: -0.3893, M: 15.563, S: 0.09009 },
    { month: 42, L: -0.3754, M: 15.437, S: 0.09118 },
    { month: 48, L: -0.3456, M: 15.355, S: 0.09205 },
    { month: 54, L: -0.3054, M: 15.272, S: 0.09255 },
    { month: 60, L: -0.2541, M: 15.168, S: 0.09262 },
];

function tableFor(measure: GrowthMeasure, sex: Sex): LmsPoint[] {
    if (measure === "weight") return sex === "male" ? WFA_MALE : WFA_FEMALE;
    if (measure === "height") return sex === "male" ? HFA_MALE : HFA_FEMALE;
    return sex === "male" ? BMI_MALE : BMI_FEMALE;
}

function interpolate(month: number, points: LmsPoint[]): LmsPoint {
    if (month <= points[0].month) return points[0];
    for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        if (month >= a.month && month <= b.month) {
            const t = (month - a.month) / (b.month - a.month);
            return {
                month,
                L: a.L + (b.L - a.L) * t,
                M: a.M + (b.M - a.M) * t,
                S: a.S + (b.S - a.S) * t,
            };
        }
    }
    return points[points.length - 1];
}

/** z-score for a measurement at a given age (months) and sex. */
export function growthZScore(
    measure: GrowthMeasure,
    sex: Sex,
    ageMonths: number,
    value: number
): number | null {
    const points = tableFor(measure, sex);
    if (ageMonths < points[0].month || ageMonths > points[points.length - 1].month) return null;
    const { L, M, S } = interpolate(ageMonths, points);
    if (S === 0 || M === 0) return null;
    if (Math.abs(L) < 1e-6) return Math.log(value / M) / S;
    return (Math.pow(value / M, L) - 1) / (L * S);
}

/** Reference percentile curves for charting (returns values for p3..p97 at each reference age). */
export function growthReferenceCurve(
    measure: GrowthMeasure,
    sex: Sex,
    percentile: number
): Array<{ month: number; value: number }> {
    const points = tableFor(measure, sex);
    const z = percentileToZ(percentile);
    return points.map(({ month, L, M, S }) => {
        let value: number;
        if (Math.abs(L) < 1e-6) value = M * Math.exp(S * z);
        else value = M * Math.pow(1 + L * S * z, 1 / L);
        return { month, value: Number(value.toFixed(2)) };
    });
}

function percentileToZ(p: number): number {
    // Abramowitz & Stegun approximation (accurate to ~1e-4 for 3..97)
    const a = [2.50662823884, -18.61500062529, 41.39119773534, -25.44106049637];
    const b = [-8.4735109309, 23.08336743743, -21.06224101826, 3.13082909833];
    const c = [0.3374754822726147, 0.9761690190917186, 0.1607979714918209, 0.0276438810333863, 0.0038405729373609, 0.0003951896511919];
    const y = p / 100 - 0.5;
    if (Math.abs(y) < 0.42) {
        const r = y * y;
        return (y * (((a[3] * r + a[2]) * r + a[1]) * r + a[0])) /
            ((((b[3] * r + b[2]) * r + b[1]) * r + b[0]) * r + 1);
    }
    const r = p / 100 < 0.5 ? y : y;
    const s = Math.log(-Math.log(0.5 - Math.abs(y)));
    const z = Math.sign(y) * (c[0] + s * (c[1] + s * (c[2] + s * (c[3] + s * (c[4] + s * c[5])))));
    return z;
}

export const GROWTH_PERCENTILES = [3, 15, 50, 85, 97] as const;

export function interpretZScore(z: number | null): {
    label: string;
    color: string;
} {
    if (z === null) return { label: "Out of reference range", color: "text-gray-500" };
    if (z < -3) return { label: "Severely below expected", color: "text-red-600" };
    if (z < -2) return { label: "Below expected (stunting/wasting range)", color: "text-amber-600" };
    if (z <= 2) return { label: "Within expected range", color: "text-green-600" };
    if (z <= 3) return { label: "Above expected", color: "text-amber-600" };
    return { label: "Severely above expected", color: "text-red-600" };
}
