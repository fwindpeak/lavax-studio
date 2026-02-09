let fontData: Uint8Array | null = null;
const offsets = new Uint32Array(4);

export function loadFonts(buffer: ArrayBuffer) {
    console.log('[Font] loadFonts called, buffer size:', buffer.byteLength);

    // Show first 32 bytes of the file for debugging
    const firstBytes = new Uint8Array(buffer, 0, Math.min(32, buffer.byteLength));
    console.log('[Font] First 32 bytes:', Array.from(firstBytes).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' '));

    fontData = new Uint8Array(buffer);

    // Read header as little-endian 32-bit integers
    const header = new Uint32Array(buffer, 0, 4);
    console.log('[Font] Raw header values (as Uint32):', Array.from(header));

    // The header contains 4 offsets (16 bytes total)
    for (let i = 0; i < 4; i++) {
        offsets[i] = header[i]!;
    }

    console.log('[Font] Font offsets:', Array.from(offsets));
    console.log('[Font] Font data loaded, total size:', fontData.length);

    // Verify offsets are reasonable
    for (let i = 0; i < 4; i++) {
        if (offsets[i]! > fontData.length) {
            console.error(`[Font] ERROR: Offset ${i} (${offsets[i]}) is beyond file size (${fontData.length})!`);
        }
    }
}

export function getCharBitmap(char: number, big: boolean): Uint8Array {
    if (!fontData) {
        console.warn('[Font] getCharBitmap called but fontData is null!');
        return new Uint8Array(big ? 16 : 12);
    }

    // ASCII range 32-126
    const index = char - 32;
    if (index < 0 || index >= 95) {
        console.warn(`[Font] getCharBitmap: char ${char} out of range`);
        return new Uint8Array(big ? 16 : 12);
    }

    const tableIdx = big ? 0 : 1;
    const charSize = big ? 16 : 12;
    const start = offsets[tableIdx]! + index * charSize;
    return fontData.subarray(start, start + charSize);
}

export function getChineseBitmap(b1: number, b2: number, big: boolean): Uint8Array {
    if (!fontData) {
        console.warn('[Font] getChineseBitmap called but fontData is null!');
        return new Uint8Array(big ? 32 : 24);
    }

    // GB2312: row = b1 - 0xA1, col = b2 - 0xA1
    // Range: 0xA1-0xFE
    const row = b1 - 0xA1;
    const col = b2 - 0xA1;

    console.log(`[Font] getChineseBitmap: b1=0x${b1.toString(16)}, b2=0x${b2.toString(16)}, row=${row}, col=${col}`);

    if (row < 0 || row >= 94 || col < 0 || col >= 94) {
        console.warn(`[Font] getChineseBitmap: out of range - row=${row}, col=${col}`);
        return new Uint8Array(big ? 32 : 24);
    }

    const index = row * 94 + col;
    const tableIdx = big ? 2 : 3;
    const charSize = big ? 32 : 24;
    const start = offsets[tableIdx]! + index * charSize;

    console.log(`[Font] getChineseBitmap: tableIdx=${tableIdx}, index=${index}, start=${start}, charSize=${charSize}`);
    console.log(`[Font] Font data length: ${fontData.length}, reading from ${start} to ${start + charSize}`);

    if (start + charSize > fontData.length) {
        console.error(`[Font] getChineseBitmap: trying to read beyond font data! start=${start}, end=${start + charSize}, fontData.length=${fontData.length}`);
        return new Uint8Array(big ? 32 : 24);
    }

    const bitmap = fontData.subarray(start, start + charSize);
    console.log(`[Font] getChineseBitmap: returning bitmap of length ${bitmap.length}`);
    return bitmap;
}
