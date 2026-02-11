import { VFSStorageDriver, IndexedDBDriver, LocalStorageDriver } from './VFSStorageDriver';

export class VirtualFileSystem {
    private files: Map<string, Uint8Array> = new Map();
    private fileHandles: Map<number, { name: string, pos: number, data: Uint8Array }> = new Map();
    private nextHandle = 1;
    public ready: Promise<void>;
    private driver: VFSStorageDriver;

    constructor(driver: VFSStorageDriver = new IndexedDBDriver()) {
        this.driver = driver;
        this.ready = this.init();
    }

    private async init() {
        try {
            await this.driver.ready;
            const storedFiles = await this.driver.getAll();

            // Migration logic: If current driver is empty and it's IndexedDB, try to migrate from localStorage
            if (storedFiles.size === 0 && this.driver instanceof IndexedDBDriver) {
                const lsDriver = new LocalStorageDriver();
                const lsFiles = await lsDriver.getAll();
                if (lsFiles.size > 0) {
                    for (const [path, data] of lsFiles) {
                        this.files.set(path, data);
                        await this.driver.persist(path, data);
                    }
                    console.log("Migrated VFS from localStorage to IndexedDB");
                    return;
                }
            }

            this.files = storedFiles;
        } catch (e) {
            console.error("VFS Initialization failed:", e);
        }
    }

    public addFile(path: string, data: Uint8Array) {
        this.files.set(path, data);
        this.ready.then(() => {
            this.driver.persist(path, data).catch(console.error);
        });
    }

    public getFile(path: string) {
        return this.files.get(path);
    }

    public deleteFile(path: string) {
        this.files.delete(path);
        this.ready.then(() => {
            this.driver.remove(path).catch(console.error);
        });
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
        this.ready.then(() => {
            this.driver.persist(h.name, h.data).catch(console.error);
        });
    }
}
