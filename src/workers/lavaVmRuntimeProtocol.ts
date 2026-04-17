export type VmLifecycleState = 'idle' | 'running' | 'waiting' | 'paused' | 'faulted' | 'stopped';

export interface RuntimeFilePayload {
  path: string;
  data: ArrayBuffer;
}

export type LavaVmWorkerRequest =
  | { type: 'init'; fontData?: ArrayBuffer | null }
  | { type: 'run'; program: ArrayBuffer; files: RuntimeFilePayload[]; debug?: boolean }
  | { type: 'stop' }
  | { type: 'resume' }
  | { type: 'pushKey'; code: number }
  | { type: 'releaseKey'; code: number };

export type LavaVmWorkerEvent =
  | { type: 'ready' }
  | { type: 'log'; message: string }
  | { type: 'screen'; width: number; height: number; data: ArrayBuffer }
  | { type: 'lifecycle'; state: VmLifecycleState; payload?: unknown }
  | { type: 'finished' }
  | { type: 'error'; message: string; payload?: unknown };
