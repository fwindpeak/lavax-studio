export class VirtualFS {
  private files: Map<string, Uint8Array> = new Map();

  constructor() {
    // Maybe pre-load some system files
  }

  writeFile(path: string, data: Uint8Array) {
    this.files.set(path, data);
  }

  readFile(path: string): Uint8Array | null {
    return this.files.get(path) || null;
  }

  deleteFile(path: string) {
    this.files.delete(path);
  }

  exists(path: string): boolean {
    return this.files.has(path);
  }
}
