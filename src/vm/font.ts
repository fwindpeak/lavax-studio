export class LavaXFont {
  private cache: Map<string, Uint8Array> = new Map();
  private size: number;

  constructor(size: number) {
    this.size = size;
  }

  getChar(char: string): Uint8Array {
    if (this.cache.has(char)) return this.cache.get(char)!;

    const canvas = document.createElement('canvas');
    canvas.width = this.size;
    canvas.height = this.size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, this.size, this.size);
    ctx.fillStyle = 'black';
    ctx.font = `${this.size - 2}px monospace`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(char, this.size / 2, this.size / 2);

    const imageData = ctx.getImageData(0, 0, this.size, this.size);
    if (!imageData) return new Uint8Array(0);
    const bits = new Uint8Array((this.size * this.size) / 8);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const avg = ((imageData.data[i] || 0) + (imageData.data[i + 1] || 0) + (imageData.data[i + 2] || 0)) / 3;
      if (avg < 128) {
        const pixelIdx = i / 4;
        const byteIdx = Math.floor(pixelIdx / 8);
        const bitIdx = 7 - (pixelIdx % 8);
        bits[byteIdx] = (bits[byteIdx] || 0) | (1 << bitIdx);
      }
    }

    this.cache.set(char, bits);
    return bits;
  }
}
