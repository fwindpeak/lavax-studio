import { VirtualFileSystem } from '../../src/vm/VirtualFileSystem';

class MockStorageDriver {
  name = 'mock';
  ready = Promise.resolve();
  async getAll() { return new Map<string, Uint8Array>(); }
  async persist() {}
  async remove() {}
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function createVfs() {
  const vfs = new VirtualFileSystem(new MockStorageDriver() as any);
  await vfs.ready;
  return vfs;
}

async function verifyPathNormalization() {
  const vfs = await createVfs();
  vfs.mkdir('/docs');
  vfs.chdir('/docs');
  vfs.addFile('./guide.txt', new Uint8Array([1, 2, 3]));

  const file = vfs.getFile('/docs/guide.txt');
  assert(file && file.length === 3, 'relative addFile/getFile should normalize into cwd');

  vfs.addFile('../root.bin', new Uint8Array([9]));
  const rootFile = vfs.getFile('/root.bin');
  assert(rootFile && rootFile[0] === 9, 'parent-directory path normalization failed');
}

async function verifyDirectoryMarkersAndEnumeration() {
  const vfs = await createVfs();
  vfs.addFile('/a/b/c.txt', new Uint8Array([7]));

  const files = vfs.getFiles().map(entry => entry.path).sort();
  assert(files.includes('/a/'), 'parent directory marker /a/ should be created automatically');
  assert(files.includes('/a/b/'), 'parent directory marker /a/b/ should be created automatically');
  assert(files.includes('/a/b/c.txt'), 'leaf file should exist');

  const handle = vfs.opendir('/a');
  const entries: string[] = [];
  while (true) {
    const entry = vfs.readdir(handle);
    if (entry === null) break;
    entries.push(entry);
  }
  vfs.closedir(handle);

  assert(entries.includes('b'), 'opendir/readdir should expose first-level child directories');
}

async function verifyOpenWriteAppendAndTruncate() {
  const vfs = await createVfs();

  let handle = vfs.openFile('/notes.txt', 'w+');
  assert(handle > 0, 'w+ should create file');
  vfs.writeHandleData(handle, new Uint8Array([1, 2, 3]), 0);
  vfs.closeFile(handle);

  let file = vfs.getFile('/notes.txt');
  assert(file && file.length === 3 && file[2] === 3, 'writeHandleData should persist written bytes');

  handle = vfs.openFile('/notes.txt', 'a');
  assert(handle > 0, 'a should open existing file');
  const appendHandle = vfs.getHandle(handle);
  assert(appendHandle?.pos === 3, 'append mode should seek to file end');
  vfs.writeHandleData(handle, new Uint8Array([4, 5]), appendHandle!.pos);
  vfs.closeFile(handle);

  file = vfs.getFile('/notes.txt');
  assert(file && file.length === 5 && file[3] === 4 && file[4] === 5, 'append write should extend file');

  handle = vfs.openFile('/notes.txt', 'w');
  const truncated = vfs.getHandle(handle);
  assert(truncated?.data.length === 0, 'w mode should truncate existing file');
  vfs.closeFile(handle);
}

async function verifyChdirAndMissingReadOpen() {
  const vfs = await createVfs();
  vfs.mkdir('/assets');
  assert(vfs.chdir('/assets'), 'chdir should enter existing directory');
  assert(vfs.cwd === '/assets', 'cwd should track the resolved directory');
  assert(!vfs.chdir('/missing'), 'chdir should fail for missing directories');
  assert(vfs.openFile('/does-not-exist.bin', 'rb') === 0, 'rb should fail for missing file');
}

async function main() {
  await verifyPathNormalization();
  await verifyDirectoryMarkersAndEnumeration();
  await verifyOpenWriteAppendAndTruncate();
  await verifyChdirAndMissingReadOpen();
  console.log('PASS: VFS path, directory, and file lifecycle behaviour verified.');
}

main();
