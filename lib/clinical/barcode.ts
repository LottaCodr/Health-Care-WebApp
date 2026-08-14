/**
 * Code 39 barcode encoder → SVG string. Used for lab specimen labels
 * (printable chain-of-custody stickers). Zero dependencies.
 */

const CODE39: Record<string, string> = {
    "0": "000110100", "1": "100100001", "2": "001100001", "3": "101100000",
    "4": "000110001", "5": "100110000", "6": "001110000", "7": "000100101",
    "8": "100100100", "9": "001100100", A: "100001001", B: "001001001",
    C: "101001000", D: "000011001", E: "100011000", F: "001011000",
    G: "000001101", H: "100001100", I: "001001100", J: "000011100",
    K: "100000011", L: "001000011", M: "101000010", N: "000010011",
    O: "100010010", P: "001010010", Q: "000000111", R: "100000110",
    S: "001000110", T: "000010110", U: "110000001", V: "011000001",
    W: "111000000", X: "010010001", Y: "110010000", Z: "011010000",
    "-": "010000101", ".": "110000100", " ": "011000100", $: "010101000",
    "/": "010100010", "+": "010001010", "%": "000101010", "*": "010010100",
};

/** Render a Code 39 barcode as an inline SVG data URI (with readable text). */
export function code39Svg(text: string, height = 48): string {
    const encoded = `*${text.toUpperCase()}*`;
    let pattern = "";
    for (const ch of encoded) {
        const code = CODE39[ch];
        if (!code) throw new Error(`Cannot encode character in Code 39: ${ch}`);
        pattern += code;
    }
    // 1 unit = 2px, narrow bar 2px wide, wide bar 6px
    let x = 0;
    let bars = "";
    for (let i = 0; i < pattern.length; i++) {
        const wide = i + 1 < pattern.length && pattern[i + 1] === pattern[i];
        const w = wide ? 6 : 2;
        if (pattern[i] === "1") bars += `<rect x="${x}" y="0" width="${w}" height="${height}" fill="#000"/>`;
        x += w;
        if (wide) i++;
    }
    const width = x + 4;
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height + 16}" viewBox="0 0 ${width} ${height + 16}">` +
        `<rect width="${width}" height="${height + 16}" fill="#fff"/>` +
        bars +
        `<text x="${width / 2}" y="${height + 12}" font-family="monospace" font-size="9" text-anchor="middle" fill="#000">${escapeXml(text.toUpperCase())}</text>` +
        `</svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(s: string): string {
    return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] as string);
}

/** Generate a specimen barcode value (readable, unique-enough). */
export function generateSpecimenBarcode(patientId: string): string {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const stamp = Date.now().toString(36).toUpperCase().slice(-4);
    return `SP-${patientId.slice(0, 6).toUpperCase()}-${stamp}${suffix}`;
}
