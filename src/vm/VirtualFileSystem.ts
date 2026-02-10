
export class VirtualFileSystem {
    private files: Map<string, Uint8Array> = new Map();
    private fileHandles: Map<number, { name: string, pos: number, data: Uint8Array }> = new Map();
    private nextHandle = 1;

    constructor() {
        this.loadVFSFromStorage();
    }

    private async loadVFSFromStorage() {
        try {
            if (typeof localStorage === 'undefined') return;
            const saved = localStorage.getItem('lavax_vfs_v2');
            if (saved) {
                const obj = JSON.parse(saved);
                for (const k in obj) {
                    const arr = Uint8Array.from(atob(obj[k]), c => c.charCodeAt(0));
                    this.files.set(k, arr);
                }
            }
        } catch (e) {
            console.warn("Storage access not allowed:", e);
        }
    }

    public saveVFSToStorage() {
        if (typeof localStorage === 'undefined') return;
        const obj: any = {};
        this.files.forEach((v, k) => {
            let binary = '';
            const len = v.byteLength;
            for (let i = 0; i < len; i++) binary += String.fromCharCode(v[i]);
            obj[k] = btoa(binary);
        });
        localStorage.setItem('lavax_vfs_v2', JSON.stringify(obj));
    }

    public addFile(path: string, data: Uint8Array) {
        this.files.set(path, data);
        this.saveVFSToStorage();
    }

    public getFile(path: string) {
        return this.files.get(path);
    }

    public deleteFile(path: string) {
        this.files.delete(path);
        this.saveVFSToStorage();
    }

    public getFiles() {
        return Array.from(this.files.entries()).map(([p, d]) => ({ path: p, size: d.length }));
    }

    public clearHandles() {
        this.fileHandles.clear();
        this.nextHandle = 1;
    }

    public openFile(path: string, mode: string): number {
        const fileData = this.files.get(path);
        if (!fileData && !mode.includes('w')) {
            return 0;
        }
        const handle = this.nextHandle++;
        this.fileHandles.set(handle, {
            name: path,
            pos: 0,
            data: fileData || new Uint8Array(0)
        });
        return handle;
    }

    public closeFile(handle: number) {
        this.fileHandles.delete(handle);
    }

    public getHandle(handle: number) {
        return this.fileHandles.get(handle);
    }

    public writeHandleData(handle: number, data: Uint8Array, pos: number) {
        const h = this.fileHandles.get(handle);
        if (!h) return;

        // Ensure data buffer is large enough
        if (pos + data.length > h.data.length) {
            const newData = new Uint8Array(pos + data.length);
            newData.set(h.data);
            h.data = newData;
        }

        h.data.set(data, pos);
        h.pos = pos + data.length;

        // Persistent sync
        this.files.set(h.name, h.data);
        this.saveVFSToStorage();
    }
}
