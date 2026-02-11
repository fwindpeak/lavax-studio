
export interface VFSStorageDriver {
    name: string;
    ready: Promise<void>;
    getAll(): Promise<Map<string, Uint8Array>>;
    persist(path: string, data: Uint8Array): Promise<void>;
    remove(path: string): Promise<void>;
}

export class LocalStorageDriver implements VFSStorageDriver {
    public name = 'localStorage';
    public ready: Promise<void> = Promise.resolve();
    private storageKey = 'lavax_vfs_v2';

    async getAll(): Promise<Map<string, Uint8Array>> {
        const results = new Map<string, Uint8Array>();
        try {
            if (typeof localStorage === 'undefined') return results;
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const obj = JSON.parse(saved);
                for (const k in obj) {
                    const arr = Uint8Array.from(atob(obj[k]), c => c.charCodeAt(0));
                    results.set(k, arr);
                }
            }
        } catch (e) {
            console.warn("LocalStorageDriver: Error loading data", e);
        }
        return results;
    }

    async persist(path: string, data: Uint8Array): Promise<void> {
        if (typeof localStorage === 'undefined') return;
        try {
            const all = await this.getAll();
            all.set(path, data);

            const obj: any = {};
            all.forEach((v, k) => {
                let binary = '';
                const len = v.byteLength;
                for (let i = 0; i < len; i++) binary += String.fromCharCode(v[i]);
                obj[k] = btoa(binary);
            });
            localStorage.setItem(this.storageKey, JSON.stringify(obj));
        } catch (e) {
            console.error("LocalStorageDriver: Persist failed", e);
        }
    }

    async remove(path: string): Promise<void> {
        if (typeof localStorage === 'undefined') return;
        try {
            const all = await this.getAll();
            if (all.delete(path)) {
                const obj: any = {};
                all.forEach((v, k) => {
                    let binary = '';
                    const len = v.byteLength;
                    for (let i = 0; i < len; i++) binary += String.fromCharCode(v[i]);
                    obj[k] = btoa(binary);
                });
                localStorage.setItem(this.storageKey, JSON.stringify(obj));
            }
        } catch (e) {
            console.error("LocalStorageDriver: Remove failed", e);
        }
    }
}

export class IndexedDBDriver implements VFSStorageDriver {
    public name = 'IndexedDB';
    public ready: Promise<void>;
    private db: IDBDatabase | null = null;
    private dbName = 'LavaX_VFS';
    private storeName = 'files';

    constructor() {
        this.ready = this.init();
    }

    private async init() {
        return new Promise<void>((resolve, reject) => {
            if (typeof indexedDB === 'undefined') {
                return reject(new Error("IndexedDB not supported"));
            }
            const request = indexedDB.open(this.dbName, 1);
            request.onupgradeneeded = (e: any) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(): Promise<Map<string, Uint8Array>> {
        return new Promise((resolve, reject) => {
            if (!this.db) return resolve(new Map());
            const tx = this.db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const request = store.openCursor();
            const results = new Map<string, Uint8Array>();
            request.onsuccess = (e: any) => {
                const cursor = e.target.result;
                if (cursor) {
                    results.set(cursor.key as string, cursor.value as Uint8Array);
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    async persist(path: string, data: Uint8Array): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.db) return resolve();
            const tx = this.db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            const request = store.put(data, path);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async remove(path: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.db) return resolve();
            const tx = this.db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            const request = store.delete(path);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}
