import { LavaXVM } from '../vm';
import type { LavaVmWorkerEvent, LavaVmWorkerRequest, RuntimeFilePayload } from './lavaVmRuntimeProtocol';

const workerScope = self as unknown as Worker;

let currentVm: LavaXVM | null = null;
let fontData: Uint8Array | null = null;

function postEvent(event: LavaVmWorkerEvent, transfer?: Transferable[]) {
  workerScope.postMessage(event, transfer ?? []);
}

function cloneLifecyclePayload(payload: unknown) {
  if (payload === undefined) return undefined;
  try {
    return JSON.parse(JSON.stringify(payload));
  } catch {
    return payload;
  }
}

async function applyRuntimeFiles(vm: LavaXVM, files: RuntimeFilePayload[]) {
  await vm.vfs.ready;
  for (const file of files) {
    vm.vfs.addFile(file.path, new Uint8Array(file.data));
  }
}

function wireVm(vm: LavaXVM) {
  vm.onLog = (message) => {
    postEvent({ type: 'log', message });
  };
  vm.onLifecycleChange = (state, payload) => {
    postEvent({ type: 'lifecycle', state, payload: cloneLifecyclePayload(payload) });
  };
  vm.onUpdateScreen = (data, width, height) => {
    // Copy the buffer to allow transferring it without neutering the VM's internal pixel buffer
    const buffer = data.buffer.slice(0);
    postEvent({
      type: 'screen',
      width,
      height,
      data: buffer,
    }, [buffer]);
  };
  vm.onFinished = () => {
    postEvent({ type: 'finished' });
  };
}

async function createVm(debug = false) {
  const vm = new LavaXVM();
  vm.debug = debug;
  if (fontData) {
    vm.setInternalFontData(fontData);
  }
  wireVm(vm);
  currentVm = vm;
  return vm;
}

async function handleRun(message: Extract<LavaVmWorkerRequest, { type: 'run' }>) {
  if (currentVm) {
    currentVm.stop();
    currentVm = null;
  }

  const vm = await createVm(!!message.debug);
  await applyRuntimeFiles(vm, message.files);
  vm.load(new Uint8Array(message.program));

  try {
    await vm.run();
  } catch (error: any) {
    postEvent({
      type: 'error',
      message: error?.message ?? String(error),
      payload: cloneLifecyclePayload(vm.getPauseSnapshot?.()),
    });
  }
}

workerScope.onmessage = async (event: MessageEvent<LavaVmWorkerRequest>) => {
  const message = event.data;

  switch (message.type) {
    case 'init':
      fontData = message.fontData ? new Uint8Array(message.fontData) : null;
      postEvent({ type: 'ready' });
      return;
    case 'run':
      // Don't await handleRun so that the event loop remains free for stop/pushKey
      void handleRun(message);
      return;
    case 'stop':
      currentVm?.stop();
      return;
    case 'resume':
      await currentVm?.resume?.();
      return;
    case 'pushKey':
      currentVm?.pushKey(message.code);
      return;
    case 'releaseKey':
      currentVm?.releaseKey(message.code);
      return;
  }
};
