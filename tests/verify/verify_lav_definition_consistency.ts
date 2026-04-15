import { Op, SystemOp } from '../../src/types';
import {
  LAV_OPCODE_BY_MNEMONIC,
  LAV_OPCODE_BY_UPPERCASE_MNEMONIC,
  LAV_OPCODE_BY_VALUE,
  LAV_OPCODE_DEFS,
  OperandType,
} from '../../src/lav/format';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function verifyBidirectionalLookups() {
  for (const def of LAV_OPCODE_DEFS) {
    assert(LAV_OPCODE_BY_VALUE.get(def.opcode) === def, `missing opcode lookup for 0x${def.opcode.toString(16)}`);
    assert(LAV_OPCODE_BY_MNEMONIC.get(def.mnemonic) === def, `missing mnemonic lookup for ${def.mnemonic}`);
    if (def.mnemonic === def.mnemonic.toUpperCase()) {
      assert(LAV_OPCODE_BY_UPPERCASE_MNEMONIC.get(def.mnemonic) === def, `missing uppercase mnemonic lookup for ${def.mnemonic}`);
    }
  }
}

function verifyCriticalOperands() {
  assert(LAV_OPCODE_BY_VALUE.get(Op.JMP)?.operandType === OperandType.U24, 'JMP must use u24 operands');
  assert(LAV_OPCODE_BY_VALUE.get(Op.JZ)?.operandType === OperandType.U24, 'JZ must use u24 operands');
  assert(LAV_OPCODE_BY_VALUE.get(Op.JNZ)?.operandType === OperandType.U24, 'JNZ must use u24 operands');
  assert(LAV_OPCODE_BY_VALUE.get(Op.CALL)?.operandType === OperandType.U24, 'CALL must use u24 operands');
  assert(LAV_OPCODE_BY_VALUE.get(Op.FUNC)?.operandType === OperandType.FUNC_META, 'FUNC must use frameSize+argCount metadata');
  assert(LAV_OPCODE_BY_VALUE.get(Op.INIT)?.operandType === OperandType.INIT, 'INIT must use structured init payload');
  assert(LAV_OPCODE_BY_VALUE.get(Op.PUSH_STR)?.operandType === OperandType.STRING_Z, 'PUSH_STR must use null-terminated bytes');
  assert(LAV_OPCODE_BY_VALUE.get(SystemOp.memcpy)?.mnemonic === 'memcpy', 'memcpy syscall mapping drifted');
}

function verifyExtensionFlags() {
  assert(LAV_OPCODE_BY_MNEMONIC.get('DUP')?.official === false, 'DUP must stay marked as non-official');
  assert(LAV_OPCODE_BY_MNEMONIC.get('SWAP')?.official === false, 'SWAP must stay marked as non-official');
  assert(LAV_OPCODE_BY_MNEMONIC.get('MASK')?.official === true, 'MASK must remain official');
  assert(LAV_OPCODE_BY_MNEMONIC.get('EXIT')?.opcode === Op.EXIT, 'EXIT instruction must not be shadowed by syscall exit');
  assert(LAV_OPCODE_BY_MNEMONIC.get('exit')?.opcode === SystemOp.exit, 'lowercase exit must resolve to syscall exit');
}

function main() {
  verifyBidirectionalLookups();
  verifyCriticalOperands();
  verifyExtensionFlags();
  console.log(`PASS: verified ${LAV_OPCODE_DEFS.length} shared LAV opcode definitions and lookup consistency.`);
}

main();
