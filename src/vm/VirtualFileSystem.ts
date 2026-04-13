import { VFSStorageDriver, IndexedDBDriver, LocalStorageDriver } from './VFSStorageDriver';

export class VirtualFileSystem {
    private files: Map<string, Uint8Array> = new Map();
    private fileHandles: Map<number, { name: string, pos: number, data: Uint8Array }> = new Map();
    private dirHandles: Map<number, { path: string, entries: string[], pos: number }> = new Map();
    private nextHandle = 1;
    private nextDirHandle = 1;
    public cwd: string = "/";
    public ready: Promise<void>;
    private driver: VFSStorageDriver;

    constructor(driver?: VFSStorageDriver) {
        this.driver = driver || new LocalStorageDriver();
        this.ready = this.init();
    }

    private async init() {
        try {
            await this.driver.ready;
            const storedFiles = await this.driver.getAll();
            console.log(`[VFS] Loaded ${storedFiles.size} entries from ${this.driver.name}`);

            const normalizedFiles = new Map<string, Uint8Array>();
            let migratedCount = 0;

            for (const [path, data] of storedFiles) {
                let normalized = path;
                if (!path.startsWith('/')) {
                    normalized = '/' + path;
                    migratedCount++;
                    // Remove old un-normalized entry from persistent storage
                    await this.driver.remove(path).catch(console.error);
                }

                normalizedFiles.set(normalized, data);

                // If it was migrated, persist the new one immediately
                if (normalized !== path) {
                    await this.driver.persist(normalized, data).catch(console.error);
                }
            }

            if (migratedCount > 0) {
                console.log(`[VFS] Migrated ${migratedCount} paths to absolute format (leading slash)`);
            }

            // Migration logic: If current driver is empty and it's IndexedDB, try to migrate from localStorage
            if (normalizedFiles.size === 0 && this.driver instanceof IndexedDBDriver) {
                const lsDriver = new LocalStorageDriver();
                const lsFiles = await lsDriver.getAll();
                if (lsFiles.size > 0) {
                    console.log(`[VFS] Found ${lsFiles.size} files in localStorage, migrating to IndexedDB...`);
                    for (const [path, data] of lsFiles) {
                        const normalized = path.startsWith('/') ? path : '/' + path;
                        normalizedFiles.set(normalized, data);
                        await this.driver.persist(normalized, data);
                    }
                    console.log("[VFS] Migration from localStorage complete");
                }
            }

            this.files = normalizedFiles;
        } catch (e) {
            console.error("VFS Initialization failed:", e);
        }
    }

    private resolvePath(path: string): string {
        const original = path;
        const endsWithSlash = path.endsWith('/');
        if (!path.startsWith('/')) {
            path = this.cwd + (this.cwd.endsWith('/') ? '' : '/') + path;
        }
        // Normalize
        const parts = path.split('/').filter(p => p && p !== '.');
        const stack: string[] = [];
        for (const p of parts) {
            if (p === '..') {
                stack.pop();
            } else {
                stack.push(p);
            }
        }
        let resolved = '/' + stack.join('/');
        if (endsWithSlash && resolved !== '/') {
            resolved += '/';
        }
        console.log(`[VFS] resolvePath("${original}") -> "${resolved}" (cwd: "${this.cwd}")`);
        return resolved;
    }

    public addFile(path: string, data: Uint8Array) {
        const resolved = this.resolvePath(path);
        console.log(`[VFS] addFile("${path}") -> resolved: "${resolved}", size: ${data.length}`);

        // Ensure parent directories exist
        const parts = resolved.split('/').filter(Boolean);
        let current = "";
        for (let i = 0; i < parts.length - 1; i++) {
            current += "/" + parts[i];
            const dirMarker = current + "/";
            if (!this.files.has(dirMarker)) {
                console.log(`[VFS] Automatically creating parent directory marker: "${dirMarker}"`);
                this.files.set(dirMarker, new Uint8Array(0));
                this.driver.persist(dirMarker, new Uint8Array(0)).catch(console.error);
            }
        }

        this.files.set(resolved, data);
        this.ready.then(() => {
            this.driver.persist(resolved, data).catch(console.error);
        });
    }

    public getFile(path: string) {
        const resolved = this.resolvePath(path);
        const data = this.files.get(resolved);
        console.log(`[VFS] getFile("${path}") -> resolved: "${resolved}", found: ${!!data}`);
        return data;
    }

    public deleteFile(path: string) {
        const resolved = this.resolvePath(path);
        console.log(`[VFS] deleteFile("${path}") -> resolved: "${resolved}"`);
        this.files.delete(resolved);
        this.ready.then(() => {
            this.driver.remove(resolved).catch(console.error);
        });
    }

    public mkdir(path: string): boolean {
        const resolved = this.resolvePath(path);
        const dirPath = resolved.endsWith('/') ? resolved : resolved + '/';
        if (this.files.has(dirPath)) return true;

        // Add explicit directory marker (empty Uint8Array)
        this.files.set(dirPath, new Uint8Array(0));
        this.ready.then(() => {
            this.driver.persist(dirPath, new Uint8Array(0)).catch(console.error);
        });
        return true;
    }

    public chdir(path: string): boolean {
        const resolved = this.resolvePath(path);
        if (resolved === '/') {
            this.cwd = '/';
            return true;
        }
        const dirPath = resolved.endsWith('/') ? resolved : resolved + '/';
        if (this.files.has(dirPath)) {
            this.cwd = resolved;
            return true;
        }
        return false;
    }

    public opendir(path: string): number {
        const resolved = this.resolvePath(path);
        const prefix = resolved.endsWith('/') ? resolved : resolved + '/';
        const entries = new Set<string>();

        for (const fullPath of this.files.keys()) {
            if (fullPath.startsWith(prefix) && fullPath !== prefix) {
                const relative = fullPath.slice(prefix.length);
                const firstPart = relative.split('/')[0];
                if (firstPart) {
                    // If it's a directory (ends with /), don't include the slash in the name
                    // But readdir should return names, and usually they don't have trailing slashes
                    entries.add(firstPart);
                }
            }
        }

        const handle = this.nextDirHandle++;
        this.dirHandles.set(handle, {
            path: resolved,
            entries: Array.from(entries),
            pos: 0
        });
        return handle;
    }

    public readdir(handle: number): string | null {
        const h = this.dirHandles.get(handle);
        if (!h || h.pos >= h.entries.length) return null;
        return h.entries[h.pos++];
    }

    public rewinddir(handle: number) {
        const h = this.dirHandles.get(handle);
        if (h) h.pos = 0;
    }

    public closedir(handle: number) {
        this.dirHandles.delete(handle);
    }

    public getFiles() {
        return Array.from(this.files.entries()).map(([p, d]) => ({ path: p, size: d.length }));
    }

    public clearHandles() {
        this.fileHandles.clear();
        this.dirHandles.clear();
        this.nextHandle = 1;
        this.nextDirHandle = 1;
        this.cwd = "/";
    }

    public openFile(path: string, mode: string): number {
        const resolved = this.resolvePath(path);
        let fileData = this.files.get(resolved);

        // Standard C-like mode handling
        const isRead = mode.includes('r');
        const isWrite = mode.includes('w');
        const isAppend = mode.includes('a');
        const isPlus = mode.includes('+');

        if (!fileData) {
            if (isRead && !isPlus) {
                console.log(`[VFS] openFile("${path}") failed: file not found (mode "${mode}")`);
                return 0; // NULL
            }
            if (isWrite || isAppend || isPlus) {
                // Create new file
                fileData = new Uint8Array(0);
                this.files.set(resolved, fileData);
            } else {
                return 0;
            }
        } else {
            if (isWrite) {
                // Truncate
                fileData = new Uint8Array(0);
                this.files.set(resolved, fileData);
            }
        }

        const handle = this.nextHandle++;
        const pos = isAppend ? fileData.length : 0;

        this.fileHandles.set(handle, {
            name: resolved,
            pos: pos,
            data: fileData
        });

        console.log(`[VFS] openFile("${path}") -> handle: ${handle}, mode: "${mode}", size: ${fileData.length}, pos: ${pos}`);
        return handle;
    }

    public closeFile(handle: number) {
        this.fileHandles.delete(handle);
    }

    public getHandle(handle: number) {
        return this.fileHandles.get(handle);
    }

    /**
     * Writes data to a file handle and ensures persistence.
     */
    public writeHandleData(handle: number, data: Uint8Array, pos: number): number {
        const h = this.fileHandles.get(handle);
        if (!h) return 0;

        // Ensure data buffer is large enough
        if (pos + data.length > h.data.length) {
            const newData = new Uint8Array(pos + data.length);
            newData.set(h.data);
            h.data = newData;
        }

        h.data.set(data, pos);
        h.pos = pos + data.length;

        // Sync to VFS memory map
        this.files.set(h.name, h.data);

        // Persistent sync (Async)
        this.ready.then(() => {
            this.driver.persist(h.name, h.data).catch(console.error);
        });

        return data.length;
    }
}
