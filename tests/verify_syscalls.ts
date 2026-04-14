import { SystemOp } from '../src/types';
import { SYSCALL_LIST } from '../src/vm/SyscallMetadata';

function verifySyscalls() {
  const enumValues = Object.entries(SystemOp)
    .filter(([key, value]) => typeof value === 'number') as [string, number][];
  
  const metadataOps = new Set(SYSCALL_LIST.map(s => s.op));
  const metadataNames = new Set(SYSCALL_LIST.map(s => s.name));

  console.log("Checking for missing syscalls in metadata...");
  for (const [name, op] of enumValues) {
    if (name === 'System' || name === 'Math') continue; // Namespaces
    if (!metadataOps.has(op)) {
      console.warn(`Missing metadata for Op: ${name} (0x${op.toString(16)})`);
    }
  }

  console.log("Checking for unmatched metadata ops in SystemOp...");
  const enumOps = new Set(enumValues.map(([_, op]) => op));
  for (const sys of SYSCALL_LIST) {
    if (!enumOps.has(sys.op) && sys.op < 0xD3) { // Ignore extended/overlap ops for now
       console.warn(`Metadata Op 0x${sys.op.toString(16)} (${sys.name}) not found in SystemOp enum`);
    }
  }

  console.log("Verification complete.");
}

verifySyscalls();
