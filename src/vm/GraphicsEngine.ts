
import { SCREEN_WIDTH, SCREEN_HEIGHT, VRAM_OFFSET, BUF_OFFSET } from '../types';

export class GraphicsEngine {
    private fontData: Uint8Array | null = null;
    private fontOffsets: number[] = [];

    constructor(private memory: Uint8Array, private onUpdateScreen: (imageData: ImageData) => void) { }

    public setInternalFontData(data: Uint8Array) {
        if (data && data.length >= 16) {
            this.fontData = data;
            const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
            this.fontOffsets = [];
            for (let i = 0; i < 4; i++) {
                this.fontOffsets.push(view.getUint32(i * 4, true));
            }
        }
    }

    public flushScreen() {
        if (typeof ImageData === 'undefined') return;
        const img = new ImageData(SCREEN_WIDTH, SCREEN_HEIGHT);
        for (let i = 0; i < SCREEN_WIDTH * SCREEN_HEIGHT; i++) {
            const pixel = (this.memory[VRAM_OFFSET + Math.floor(i / 8)] >> (7 - (i % 8))) & 1;
            const idx = i * 4;
            const c = pixel ? [35, 45, 35] : [148, 161, 135];
            img.data[idx] = c[0]; img.data[idx + 1] = c[1]; img.data[idx + 2] = c[2]; img.data[idx + 3] = 255;
        }
        this.onUpdateScreen(img);
    }

    public setPixel(x: number, y: number, color: number, mode: number = 1) {
        if (x < 0 || x >= SCREEN_WIDTH || y < 0 || y >= SCREEN_HEIGHT) return;
        const offset = (mode & 0x40) ? VRAM_OFFSET : BUF_OFFSET;
        const i = y * SCREEN_WIDTH + x;
        const byteIdx = offset + Math.floor(i / 8);
        const bitIdx = 7 - (i % 8);
        const oldPixel = (this.memory[byteIdx] >> bitIdx) & 1;

        let source = color;
        const drawMode = mode & 0x07;
        const reverse = !!(mode & 0x08);

        if (reverse) source = 1 - source;

        let newPixel = source;
        switch (drawMode) {
            case 0: newPixel = 0; break;
            case 1: newPixel = source; break;
            case 2: newPixel = 1 - oldPixel; break;
            case 3: newPixel = oldPixel | source; break;
            case 4: newPixel = oldPixel & source; break;
            case 5: newPixel = oldPixel ^ source; break;
        }

        if (newPixel) this.memory[byteIdx] |= (1 << bitIdx);
        else this.memory[byteIdx] &= ~(1 << bitIdx);
    }

    public getPixel(x: number, y: number): number {
        if (x < 0 || x >= SCREEN_WIDTH || y < 0 || y >= SCREEN_HEIGHT) return 0;
        const i = y * SCREEN_WIDTH + x;
        return (this.memory[VRAM_OFFSET + Math.floor(i / 8)] >> (7 - (i % 8))) & 1;
    }

    public drawText(x: number, y: number, bytes: Uint8Array, size: number, mode: number) {
        if (!this.fontData) return;
        let curX = x;
        let i = 0;
        while (i < bytes.length) {
            const b1 = bytes[i];
            if (b1 < 0x80) {
                this.drawChar(curX, y, b1, size, mode);
                curX += (size === 16 ? 8 : 6); i++;
            } else {
                const b2 = bytes[i + 1];
                if (b2) {
                    this.drawChinese(curX, y, b1, b2, size, mode);
                    curX += size;
                    i += 2;
                } else i++;
            }
        }
    }

    public drawChar(x: number, y: number, code: number, size: number, mode: number) {
        const base = this.fontOffsets[size === 16 ? 0 : 1];
        const charIdx = code - 32;
        if (charIdx < 0 || charIdx >= 95) return;
        const width = size === 16 ? 8 : 6;
        const offset = base + charIdx * size;
        for (let r = 0; r < size; r++) {
            const byte = this.fontData![offset + r];
            for (let c = 0; c < width; c++) if ((byte >> (7 - c)) & 1) this.setPixel(x + c, y + r, 1, mode);
        }
    }

    public drawChinese(x: number, y: number, b1: number, b2: number, size: number, mode: number) {
        const base = this.fontOffsets[size === 16 ? 2 : 3];
        const rIdx = b1 - 0xA1, cIdx = b2 - 0xA1;
        if (rIdx < 0 || rIdx >= 94 || cIdx < 0 || cIdx >= 94) return;
        const charBytes = size === 16 ? 32 : 24;
        const offset = base + (rIdx * 94 + cIdx) * charBytes;
        for (let r = 0; r < size; r++) {
            const bL = this.fontData![offset + r * 2], bR = this.fontData![offset + r * 2 + 1];
            for (let b = 0; b < 8; b++) if ((bL >> (7 - b)) & 1) this.setPixel(x + b, y + r, 1, mode);
            for (let b = 0; b < size - 8; b++) if ((bR >> (7 - b)) & 1) this.setPixel(x + 8 + b, y + r, 1, mode);
        }
    }

    public drawBox(x: number, y: number, w: number, h: number, mode: number = 1) {
        for (let i = x; i < x + w; i++) { this.setPixel(i, y, 1, mode); this.setPixel(i, y + h - 1, 1, mode); }
        for (let i = y; i < y + h; i++) { this.setPixel(x, i, 1, mode); this.setPixel(x + w - 1, i, 1, mode); }
    }

    public drawFillBox(x: number, y: number, w: number, h: number, mode: number = 1) {
        for (let i = y; i < y + h; i++) {
            for (let j = x; j < x + w; j++) {
                this.setPixel(j, i, 1, mode);
            }
        }
    }

    public drawLine(x1: number, y1: number, x2: number, y2: number, mode: number = 1) {
        const dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
        const sx = x1 < x2 ? 1 : -1, sy = y1 < y2 ? 1 : -1;
        let err = dx - dy;
        while (true) {
            this.setPixel(x1, y1, 1, mode);
            if (x1 === x2 && y1 === y2) break;
            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x1 += sx; }
            if (e2 < dx) { err += dx; y1 += sy; }
        }
    }

    public drawCircle(xc: number, yc: number, r: number, mode: number = 1) {
        let x = 0, y = r;
        let d = 3 - 2 * r;
        const drawPoints = (xc: number, yc: number, x: number, y: number) => {
            this.setPixel(xc + x, yc + y, 1, mode); this.setPixel(xc - x, yc + y, 1, mode);
            this.setPixel(xc + x, yc - y, 1, mode); this.setPixel(xc - x, yc - y, 1, mode);
            this.setPixel(xc + y, yc + x, 1, mode); this.setPixel(xc - y, yc + x, 1, mode);
            this.setPixel(xc + y, yc - x, 1, mode); this.setPixel(xc - y, yc - x, 1, mode);
        };
        drawPoints(xc, yc, x, y);
        while (y >= x) {
            x++;
            if (d > 0) { y--; d = d + 4 * (x - y) + 10; }
            else d = d + 4 * x + 6;
            drawPoints(xc, yc, x, y);
        }
    }

    public drawFillCircle(xc: number, yc: number, r: number, mode: number = 1) {
        for (let i = 0; i <= r; i++) {
            let d = Math.floor(Math.sqrt(r * r - i * i));
            this.drawLine(xc - d, yc + i, xc + d, yc + i, mode);
            this.drawLine(xc - d, yc - i, xc + d, yc - i, mode);
        }
    }

    public drawEllipse(xc: number, yc: number, rx: number, ry: number, fill: boolean, mode: number = 1) {
        if (fill) {
            for (let i = -ry; i <= ry; i++) {
                let dx = Math.floor(rx * Math.sqrt(1 - (i * i) / (ry * ry)));
                this.drawLine(xc - dx, yc + i, xc + dx, yc + i, mode);
            }
        } else {
            let x = 0, y = ry;
            let rx2 = rx * rx, ry2 = ry * ry;
            let tworx2 = 2 * rx2, twory2 = 2 * ry2;
            let px = 0, py = tworx2 * y;
            let p = Math.round(ry2 - (rx2 * ry) + (0.25 * rx2));
            const drawPoints = (xc: number, yc: number, x: number, y: number) => {
                this.setPixel(xc + x, yc + y, 1, mode); this.setPixel(xc - x, yc + y, 1, mode);
                this.setPixel(xc + x, yc - y, 1, mode); this.setPixel(xc - x, yc - y, 1, mode);
            };
            drawPoints(xc, yc, x, y);
            while (px < py) {
                x++; px += twory2;
                if (p < 0) p += ry2 + px;
                else { y--; py -= tworx2; p += ry2 + px - py; }
                drawPoints(xc, yc, x, y);
            }
            p = Math.round(ry2 * (x + 0.5) * (x + 0.5) + rx2 * (y - 1) * (y - 1) - rx2 * ry2);
            while (y > 0) {
                y--; py -= tworx2;
                if (p > 0) p += rx2 - py;
                else { x++; px += twory2; p += rx2 - py + px; }
                drawPoints(xc, yc, x, y);
            }
        }
    }
}
