import { SCREEN_WIDTH, SCREEN_HEIGHT, GRAPH_RAM_SIZE, MemoryMap } from './types';
import { LavaXFont } from './font';

export class LavaXScreen {
  private ctx: CanvasRenderingContext2D | null = null;
  private ram: Uint8Array;
  private font16 = new LavaXFont(16);
  private font12 = new LavaXFont(12);

  constructor(ram: Uint8Array) {
    this.ram = ram;
  }

  setCanvas(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d');
    canvas.width = SCREEN_WIDTH;
    canvas.height = SCREEN_HEIGHT;
  }

  get graphRam(): Uint8Array {
    return this.ram.subarray(MemoryMap.GRAPH_RAM, MemoryMap.GRAPH_RAM + GRAPH_RAM_SIZE);
  }

  get bufferRam(): Uint8Array {
    return this.ram.subarray(MemoryMap.BUFFER_RAM, MemoryMap.BUFFER_RAM + GRAPH_RAM_SIZE);
  }

  clear(buffer: boolean = false) {
    const target = buffer ? this.bufferRam : this.graphRam;
    target.fill(0);
  }

  refresh() {
    this.graphRam.set(this.bufferRam);
    this.render();
  }

  render() {
    if (!this.ctx) return;

    const imageData = this.ctx.createImageData(SCREEN_WIDTH, SCREEN_HEIGHT);
    const data = imageData.data;
    const graphRam = this.graphRam;

    for (let y = 0; y < SCREEN_HEIGHT; y++) {
      for (let x = 0; x < SCREEN_WIDTH; x++) {
        const byteIdx = y * 20 + (x >> 3);
        const bitIdx = 7 - (x & 7);
        const pixel = ((graphRam[byteIdx] as number) >> bitIdx) & 1;

        const imgIdx = (y * SCREEN_WIDTH + x) * 4;
        const val = pixel ? 0 : 255;
        data[imgIdx] = val;
        data[imgIdx + 1] = val;
        data[imgIdx + 2] = val;
        data[imgIdx + 3] = 255;
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  drawPoint(x: number, y: number, type: number, buffer: boolean = false) {
    if (x < 0 || x >= SCREEN_WIDTH || y < 0 || y >= SCREEN_HEIGHT) return;

    const target = buffer ? this.bufferRam : this.graphRam;
    const byteIdx = y * 20 + (x >> 3);
    const bitIdx = 7 - (x & 7);

    if (type === 0) {
      target[byteIdx] = (target[byteIdx] as number) & ~(1 << bitIdx);
    } else if (type === 1) {
      target[byteIdx] = (target[byteIdx] as number) | (1 << bitIdx);
    } else if (type === 2) {
      target[byteIdx] = (target[byteIdx] as number) ^ (1 << bitIdx);
    }
  }

  getPoint(x: number, y: number, buffer: boolean = false): number {
    if (x < 0 || x >= SCREEN_WIDTH || y < 0 || y >= SCREEN_HEIGHT) return 0;
    const target = buffer ? this.bufferRam : this.graphRam;
    const byteIdx = y * 20 + (x >> 3);
    const bitIdx = 7 - (x & 7);
    return ((target[byteIdx] as number) >> bitIdx) & 1;
  }

  drawLine(x0: number, y0: number, x1: number, y1: number, type: number, buffer: boolean = false) {
    let x = Math.trunc(x0);
    let y = Math.trunc(y0);
    const xEnd = Math.trunc(x1);
    const yEnd = Math.trunc(y1);

    const dx = Math.abs(xEnd - x);
    const dy = Math.abs(yEnd - y);
    const sx = (x < xEnd) ? 1 : -1;
    const sy = (y < yEnd) ? 1 : -1;
    let err = dx - dy;

    while (true) {
      this.drawPoint(x, y, type, buffer);
      if (x === xEnd && y === yEnd) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  drawRect(x0: number, y0: number, x1: number, y1: number, fill: boolean, type: number, buffer: boolean = false) {
    const left = Math.min(x0, x1);
    const right = Math.max(x0, x1);
    const top = Math.min(y0, y1);
    const bottom = Math.max(y0, y1);

    if (fill) {
      for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
          this.drawPoint(x, y, type, buffer);
        }
      }
    } else {
      this.drawLine(left, top, right, top, type, buffer);
      this.drawLine(right, top, right, bottom, type, buffer);
      this.drawLine(right, bottom, left, bottom, type, buffer);
      this.drawLine(left, bottom, left, top, type, buffer);
    }
  }

  drawCircle(xc: number, yc: number, r: number, fill: boolean, type: number, buffer: boolean = false) {
    let x = 0;
    let y = r;
    let d = 3 - 2 * r;

    const drawCirclePoints = (xc: number, yc: number, x: number, y: number) => {
      if (fill) {
        this.drawLine(xc - x, yc + y, xc + x, yc + y, type, buffer);
        this.drawLine(xc - x, yc - y, xc + x, yc - y, type, buffer);
        this.drawLine(xc - y, yc + x, xc + y, yc + x, type, buffer);
        this.drawLine(xc - y, yc - x, xc + y, yc - x, type, buffer);
      } else {
        this.drawPoint(xc + x, yc + y, type, buffer);
        this.drawPoint(xc - x, yc + y, type, buffer);
        this.drawPoint(xc + x, yc - y, type, buffer);
        this.drawPoint(xc - x, yc - y, type, buffer);
        this.drawPoint(xc + y, yc + x, type, buffer);
        this.drawPoint(xc - y, yc + x, type, buffer);
        this.drawPoint(xc + y, yc - x, type, buffer);
        this.drawPoint(xc - y, yc - x, type, buffer);
      }
    };

    while (y >= x) {
      drawCirclePoints(xc, yc, x, y);
      x++;
      if (d > 0) {
        y--;
        d = d + 4 * (x - y) + 10;
      } else {
        d = d + 4 * x + 6;
      }
    }
  }

  drawChar(x: number, y: number, char: string, size: number, type: number, buffer: boolean = false) {
    const font = size === 16 ? this.font16 : this.font12;
    const bits = font.getChar(char);
    
    for (let i = 0; i < size * size; i++) {
      const byteIdx = Math.floor(i / 8);
      const bitIdx = 7 - (i % 8);
      const pixel = ((bits[byteIdx] as number) >> bitIdx) & 1;
      
      if (pixel) {
        const px = x + (i % size);
        const py = y + Math.floor(i / size);
        this.drawPoint(px, py, type, buffer);
      }
    }
  }
}
