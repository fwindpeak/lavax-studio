import iconv from 'iconv-lite';
import { Op, SystemOp } from '../types';

export const LAV_HEADER_SIZE = 16;
export const LAV_DEFAULT_ENTRY_POINT = 0x10;

export enum OperandType {
  NONE = 'none',
  U8 = 'u8',
  I16 = 'i16',
  U16 = 'u16',
  U24 = 'u24',
  I32 = 'i32',
  STRING_Z = 'string_z',
  INIT = 'init',
  FUNC_META = 'func_meta',
}

export interface LavHeader {
  magic: string;
  version: number;
  reserved04: number;
  strMask: number;
  arrayInitSize: number;
  entryPointField: number;
  reserved0B0F: Uint8Array;
}

export interface LavInstructionDef {
  opcode: number;
  mnemonic: string;
  operandType: OperandType;
  official: boolean;
}

export interface LavInstructionNode {
  offset: number;
  opcode: number;
  mnemonic: string;
  operandType: OperandType;
  length: number;
  operand?: number | string | Uint8Array | LavFuncOperand | LavInitOperand;
  rawBytes: Uint8Array;
  official: boolean;
  unknown: boolean;
}

export interface LavFuncOperand {
  frameSize: number;
  argCount: number;
}

export interface LavInitOperand {
  targetAddr: number;
  dataLength: number;
  data: Uint8Array;
}

export interface LavProgram {
  header: LavHeader;
  instructions: LavInstructionNode[];
}

const PRIMARY_SYSCALL_NAMES: Array<[number, string]> = [
  [0x80, 'putchar'],
  [0x81, 'getchar'],
  [0x82, 'printf'],
  [0x83, 'strcpy'],
  [0x84, 'strlen'],
  [0x85, 'SetScreen'],
  [0x86, 'UpdateLCD'],
  [0x87, 'Delay'],
  [0x88, 'WriteBlock'],
  [0x89, 'Refresh'],
  [0x8A, 'TextOut'],
  [0x8B, 'Block'],
  [0x8C, 'Rectangle'],
  [0x8D, 'exit'],
  [0x8E, 'ClearScreen'],
  [0x8F, 'abs'],
  [0x90, 'rand'],
  [0x91, 'srand'],
  [0x92, 'Locate'],
  [0x93, 'Inkey'],
  [0x94, 'Point'],
  [0x95, 'GetPoint'],
  [0x96, 'Line'],
  [0x97, 'Box'],
  [0x98, 'Circle'],
  [0x99, 'Ellipse'],
  [0x9A, 'Beep'],
  [0x9B, 'isalnum'],
  [0x9C, 'isalpha'],
  [0x9D, 'iscntrl'],
  [0x9E, 'isdigit'],
  [0x9F, 'isgraph'],
  [0xA0, 'islower'],
  [0xA1, 'isprint'],
  [0xA2, 'ispunct'],
  [0xA3, 'isspace'],
  [0xA4, 'isupper'],
  [0xA5, 'isxdigit'],
  [0xA6, 'strcat'],
  [0xA7, 'strchr'],
  [0xA8, 'strcmp'],
  [0xA9, 'strstr'],
  [0xAA, 'tolower'],
  [0xAB, 'toupper'],
  [0xAC, 'memset'],
  [0xAD, 'memcpy'],
  [0xAE, 'fopen'],
  [0xAF, 'fclose'],
  [0xB0, 'fread'],
  [0xB1, 'fwrite'],
  [0xB2, 'fseek'],
  [0xB3, 'ftell'],
  [0xB4, 'feof'],
  [0xB5, 'rewind'],
  [0xB6, 'getc'],
  [0xB7, 'putc'],
  [0xB8, 'sprintf'],
  [0xB9, 'MakeDir'],
  [0xBA, 'DeleteFile'],
  [0xBB, 'Getms'],
  [0xBC, 'CheckKey'],
  [0xBD, 'memmove'],
  [0xBE, 'Crc16'],
  [0xBF, 'Secret'],
  [0xC0, 'ChDir'],
  [0xC1, 'FileList'],
  [0xC2, 'GetTime'],
  [0xC3, 'SetTime'],
  [0xC4, 'GetWord'],
  [0xC5, 'XDraw'],
  [0xC6, 'ReleaseKey'],
  [0xC7, 'GetBlock'],
  [0xC8, 'Sin'],
  [0xC9, 'Cos'],
  [0xCA, 'FillArea'],
  [0xCB, 'SetGraphMode'],
  [0xCC, 'FindWord'],
  [0xCD, 'PlayInit'],
  [0xCE, 'PlayFile'],
  [0xCF, 'PlayStops'],
  [0xD0, 'SetVolume'],
  [0xD1, 'PlaySleep'],
  [0xD2, 'opendir'],
  [0xD3, 'readdir'],
  [0xD4, 'rewinddir'],
  [0xD5, 'closedir'],
  [0xD6, 'Refresh2'],
  [0xD7, 'open_key'],
  [0xD8, 'close_key'],
  [0xD9, 'PlayWordVoice'],
  [0xDA, 'sysexecset'],
  [0xDB, 'open_uart'],
  [0xDC, 'close_uart'],
  [0xDD, 'write_uart'],
  [0xDE, 'read_uart'],
  [0xDF, 'RefreshIcon'],
  [0xE0, 'SetFgColor'],
  [0xE1, 'SetBgColor'],
  [0xE2, 'SetPalette'],
  [0xF1, 'PutKey'],
];

const DEF_LIST: LavInstructionDef[] = [
  { opcode: Op.NOP, mnemonic: 'NOP', operandType: OperandType.NONE, official: true },
  { opcode: Op.PUSH_B, mnemonic: 'PUSH_B', operandType: OperandType.U8, official: true },
  { opcode: Op.PUSH_W, mnemonic: 'PUSH_W', operandType: OperandType.I16, official: true },
  { opcode: Op.PUSH_D, mnemonic: 'PUSH_D', operandType: OperandType.I32, official: true },
  { opcode: Op.LD_G_B, mnemonic: 'LD_G_B', operandType: OperandType.U16, official: true },
  { opcode: Op.LD_G_W, mnemonic: 'LD_G_W', operandType: OperandType.U16, official: true },
  { opcode: Op.LD_G_D, mnemonic: 'LD_G_D', operandType: OperandType.U16, official: true },
  { opcode: Op.LD_G_O_B, mnemonic: 'LD_G_O_B', operandType: OperandType.U16, official: true },
  { opcode: Op.LD_G_O_W, mnemonic: 'LD_G_O_W', operandType: OperandType.U16, official: true },
  { opcode: Op.LD_G_O_D, mnemonic: 'LD_G_O_D', operandType: OperandType.U16, official: true },
  { opcode: Op.LEA_G_B, mnemonic: 'LEA_G_B', operandType: OperandType.U16, official: true },
  { opcode: Op.LEA_G_W, mnemonic: 'LEA_G_W', operandType: OperandType.U16, official: true },
  { opcode: Op.LEA_G_D, mnemonic: 'LEA_G_D', operandType: OperandType.U16, official: true },
  { opcode: Op.PUSH_STR, mnemonic: 'PUSH_STR', operandType: OperandType.STRING_Z, official: true },
  { opcode: Op.LD_L_B, mnemonic: 'LD_L_B', operandType: OperandType.I16, official: true },
  { opcode: Op.LD_L_W, mnemonic: 'LD_L_W', operandType: OperandType.I16, official: true },
  { opcode: Op.LD_L_D, mnemonic: 'LD_L_D', operandType: OperandType.I16, official: true },
  { opcode: Op.LD_L_O_B, mnemonic: 'LD_L_O_B', operandType: OperandType.I16, official: true },
  { opcode: Op.LD_L_O_W, mnemonic: 'LD_L_O_W', operandType: OperandType.I16, official: true },
  { opcode: Op.LD_L_O_D, mnemonic: 'LD_L_O_D', operandType: OperandType.I16, official: true },
  { opcode: Op.LEA_L_B, mnemonic: 'LEA_L_B', operandType: OperandType.I16, official: true },
  { opcode: Op.LEA_L_W, mnemonic: 'LEA_L_W', operandType: OperandType.I16, official: true },
  { opcode: Op.LEA_L_D, mnemonic: 'LEA_L_D', operandType: OperandType.I16, official: true },
  { opcode: Op.LEA_OFT, mnemonic: 'LEA_OFT', operandType: OperandType.U16, official: true },
  { opcode: Op.LEA_L_PH, mnemonic: 'LEA_L_PH', operandType: OperandType.U16, official: true },
  { opcode: Op.LEA_ABS, mnemonic: 'LEA_ABS', operandType: OperandType.U16, official: true },
  { opcode: Op.LD_TEXT, mnemonic: 'LD_TEXT', operandType: OperandType.NONE, official: true },
  { opcode: Op.LD_GRAP, mnemonic: 'LD_GRAP', operandType: OperandType.NONE, official: true },
  { opcode: Op.NEG, mnemonic: 'NEG', operandType: OperandType.NONE, official: true },
  { opcode: Op.INC_PRE, mnemonic: 'INC_PRE', operandType: OperandType.NONE, official: true },
  { opcode: Op.DEC_PRE, mnemonic: 'DEC_PRE', operandType: OperandType.NONE, official: true },
  { opcode: Op.INC_POS, mnemonic: 'INC_POS', operandType: OperandType.NONE, official: true },
  { opcode: Op.DEC_POS, mnemonic: 'DEC_POS', operandType: OperandType.NONE, official: true },
  { opcode: Op.ADD, mnemonic: 'ADD', operandType: OperandType.NONE, official: true },
  { opcode: Op.SUB, mnemonic: 'SUB', operandType: OperandType.NONE, official: true },
  { opcode: Op.AND, mnemonic: 'AND', operandType: OperandType.NONE, official: true },
  { opcode: Op.OR, mnemonic: 'OR', operandType: OperandType.NONE, official: true },
  { opcode: Op.NOT, mnemonic: 'NOT', operandType: OperandType.NONE, official: true },
  { opcode: Op.XOR, mnemonic: 'XOR', operandType: OperandType.NONE, official: true },
  { opcode: Op.L_AND, mnemonic: 'L_AND', operandType: OperandType.NONE, official: true },
  { opcode: Op.L_OR, mnemonic: 'L_OR', operandType: OperandType.NONE, official: true },
  { opcode: Op.L_NOT, mnemonic: 'L_NOT', operandType: OperandType.NONE, official: true },
  { opcode: Op.MUL, mnemonic: 'MUL', operandType: OperandType.NONE, official: true },
  { opcode: Op.DIV, mnemonic: 'DIV', operandType: OperandType.NONE, official: true },
  { opcode: Op.MOD, mnemonic: 'MOD', operandType: OperandType.NONE, official: true },
  { opcode: Op.SHL, mnemonic: 'SHL', operandType: OperandType.NONE, official: true },
  { opcode: Op.SHR, mnemonic: 'SHR', operandType: OperandType.NONE, official: true },
  { opcode: Op.EQ, mnemonic: 'EQ', operandType: OperandType.NONE, official: true },
  { opcode: Op.NEQ, mnemonic: 'NEQ', operandType: OperandType.NONE, official: true },
  { opcode: Op.LE, mnemonic: 'LE', operandType: OperandType.NONE, official: true },
  { opcode: Op.GE, mnemonic: 'GE', operandType: OperandType.NONE, official: true },
  { opcode: Op.GT, mnemonic: 'GT', operandType: OperandType.NONE, official: true },
  { opcode: Op.LT, mnemonic: 'LT', operandType: OperandType.NONE, official: true },
  { opcode: Op.STORE, mnemonic: 'STORE', operandType: OperandType.NONE, official: true },
  { opcode: Op.LD_IND, mnemonic: 'LD_IND', operandType: OperandType.NONE, official: true },
  { opcode: Op.CPTR, mnemonic: 'CPTR', operandType: OperandType.NONE, official: true },
  { opcode: Op.POP, mnemonic: 'POP', operandType: OperandType.NONE, official: true },
  { opcode: Op.JZ, mnemonic: 'JZ', operandType: OperandType.U24, official: true },
  { opcode: Op.JNZ, mnemonic: 'JNZ', operandType: OperandType.U24, official: true },
  { opcode: Op.JMP, mnemonic: 'JMP', operandType: OperandType.U24, official: true },
  { opcode: Op.SPACE, mnemonic: 'SPACE', operandType: OperandType.U16, official: true },
  { opcode: Op.CALL, mnemonic: 'CALL', operandType: OperandType.U24, official: true },
  { opcode: Op.FUNC, mnemonic: 'FUNC', operandType: OperandType.FUNC_META, official: true },
  { opcode: Op.RET, mnemonic: 'RET', operandType: OperandType.NONE, official: true },
  { opcode: Op.EXIT, mnemonic: 'EXIT', operandType: OperandType.NONE, official: true },
  { opcode: Op.INIT, mnemonic: 'INIT', operandType: OperandType.INIT, official: true },
  { opcode: Op.LD_GBUF, mnemonic: 'LD_GBUF', operandType: OperandType.NONE, official: true },
  { opcode: Op.MASK, mnemonic: 'MASK', operandType: OperandType.U8, official: true },
  { opcode: Op.LOADALL, mnemonic: 'LOADALL', operandType: OperandType.NONE, official: true },
  { opcode: Op.ADD_C, mnemonic: 'ADD_C', operandType: OperandType.I16, official: true },
  { opcode: Op.SUB_C, mnemonic: 'SUB_C', operandType: OperandType.I16, official: true },
  { opcode: Op.MUL_C, mnemonic: 'MUL_C', operandType: OperandType.I16, official: true },
  { opcode: Op.DIV_C, mnemonic: 'DIV_C', operandType: OperandType.I16, official: true },
  { opcode: Op.MOD_C, mnemonic: 'MOD_C', operandType: OperandType.I16, official: true },
  { opcode: Op.SHL_C, mnemonic: 'SHL_C', operandType: OperandType.I16, official: true },
  { opcode: Op.SHR_C, mnemonic: 'SHR_C', operandType: OperandType.I16, official: true },
  { opcode: Op.EQ_C, mnemonic: 'EQ_C', operandType: OperandType.I16, official: true },
  { opcode: Op.NEQ_C, mnemonic: 'NEQ_C', operandType: OperandType.I16, official: true },
  { opcode: Op.GT_C, mnemonic: 'GT_C', operandType: OperandType.I16, official: true },
  { opcode: Op.LT_C, mnemonic: 'LT_C', operandType: OperandType.I16, official: true },
  { opcode: Op.GE_C, mnemonic: 'GE_C', operandType: OperandType.I16, official: true },
  { opcode: Op.LE_C, mnemonic: 'LE_C', operandType: OperandType.I16, official: true },
  { opcode: Op.LD_IND_W, mnemonic: 'LD_IND_W', operandType: OperandType.NONE, official: true },
  { opcode: Op.LD_IND_D, mnemonic: 'LD_IND_D', operandType: OperandType.NONE, official: true },
  { opcode: Op.F_ITOF, mnemonic: 'F_ITOF', operandType: OperandType.NONE, official: true },
  { opcode: Op.F_FTOI, mnemonic: 'F_FTOI', operandType: OperandType.NONE, official: true },
  { opcode: Op.F_ADD, mnemonic: 'F_ADD', operandType: OperandType.NONE, official: true },
  { opcode: Op.F_ADD_FI, mnemonic: 'F_ADD_FI', operandType: OperandType.NONE, official: true },
  { opcode: Op.F_ADD_IF, mnemonic: 'F_ADD_IF', operandType: OperandType.NONE, official: true },
  { opcode: Op.F_SUB, mnemonic: 'F_SUB', operandType: OperandType.NONE, official: true },
  { opcode: Op.F_SUB_FI, mnemonic: 'F_SUB_FI', operandType: OperandType.NONE, official: true },
  { opcode: Op.F_SUB_IF, mnemonic: 'F_SUB_IF', operandType: OperandType.NONE, official: true },
  { opcode: Op.F_MUL, mnemonic: 'F_MUL', operandType: OperandType.NONE, official: true },
  { opcode: Op.F_MUL_FI, mnemonic: 'F_MUL_FI', operandType: OperandType.NONE, official: true },
  { opcode: Op.F_MUL_IF, mnemonic: 'F_MUL_IF', operandType: OperandType.NONE, official: true },
  { opcode: Op.F_DIV, mnemonic: 'F_DIV', operandType: OperandType.NONE, official: true },
  { opcode: Op.F_DIV_FI, mnemonic: 'F_DIV_FI', operandType: OperandType.NONE, official: true },
  { opcode: Op.F_DIV_IF, mnemonic: 'F_DIV_IF', operandType: OperandType.NONE, official: true },
  { opcode: Op.F_NEG, mnemonic: 'F_NEG', operandType: OperandType.NONE, official: true },
  { opcode: Op.F_LT, mnemonic: 'F_LT', operandType: OperandType.NONE, official: true },
  { opcode: Op.F_GT, mnemonic: 'F_GT', operandType: OperandType.NONE, official: true },
  { opcode: Op.F_EQ, mnemonic: 'F_EQ', operandType: OperandType.NONE, official: true },
  { opcode: Op.F_NEQ, mnemonic: 'F_NEQ', operandType: OperandType.NONE, official: true },
  { opcode: Op.F_LE, mnemonic: 'F_LE', operandType: OperandType.NONE, official: true },
  { opcode: Op.F_GE, mnemonic: 'F_GE', operandType: OperandType.NONE, official: true },
  { opcode: Op.F_ABS, mnemonic: 'F_ABS', operandType: OperandType.NONE, official: true },
  { opcode: Op.CIPTR, mnemonic: 'CIPTR', operandType: OperandType.NONE, official: true },
  { opcode: Op.CLPTR, mnemonic: 'CLPTR', operandType: OperandType.NONE, official: true },
  { opcode: Op.L2C, mnemonic: 'L2C', operandType: OperandType.NONE, official: true },
  { opcode: Op.L2I, mnemonic: 'L2I', operandType: OperandType.NONE, official: true },
  { opcode: Op.STORE_EXT, mnemonic: 'STORE_EXT', operandType: OperandType.U8, official: true },
  { opcode: Op.PUSH_ADDR, mnemonic: 'PUSH_ADDR', operandType: OperandType.U16, official: true },
  { opcode: Op.IDX, mnemonic: 'IDX', operandType: OperandType.U8, official: true },
  { opcode: Op.PASS, mnemonic: 'PASS', operandType: OperandType.U8, official: true },
  { opcode: Op.VOID, mnemonic: 'VOID', operandType: OperandType.NONE, official: true },
  { opcode: Op.DBG, mnemonic: 'DBG', operandType: OperandType.FUNC_META, official: true },
  { opcode: Op.FUNCID, mnemonic: 'FUNCID', operandType: OperandType.FUNC_META, official: true },
  { opcode: Op.DUP, mnemonic: 'DUP', operandType: OperandType.NONE, official: false },
  { opcode: Op.SWAP, mnemonic: 'SWAP', operandType: OperandType.NONE, official: false },
];

for (const [opcode, mnemonic] of PRIMARY_SYSCALL_NAMES) {
  DEF_LIST.push({ opcode, mnemonic, operandType: OperandType.NONE, official: true });
}

export const LAV_OPCODE_DEFS = DEF_LIST.slice().sort((a, b) => a.opcode - b.opcode);
export const LAV_OPCODE_BY_VALUE = new Map(LAV_OPCODE_DEFS.map(def => [def.opcode, def]));
export const LAV_OPCODE_BY_MNEMONIC = new Map(LAV_OPCODE_DEFS.map(def => [def.mnemonic, def]));
export const LAV_OPCODE_BY_UPPERCASE_MNEMONIC = new Map(
  LAV_OPCODE_DEFS
    .filter(def => def.mnemonic === def.mnemonic.toUpperCase())
    .map(def => [def.mnemonic.toUpperCase(), def]),
);

const UNSIGNED_WORD_MNEMONICS = new Set([
  'LD_G_B', 'LD_G_W', 'LD_G_D',
  'LEA_G_B', 'LEA_G_W', 'LEA_G_D',
  'LD_G_O_B', 'LD_G_O_W', 'LD_G_O_D',
  'LD_TEXT', 'LD_GRAP', 'LEA_ABS',
  'PUSH_ADDR', 'SPACE',
]);

export function isUnsignedWordMnemonic(mnemonic: string): boolean {
  return UNSIGNED_WORD_MNEMONICS.has(mnemonic);
}

export function createOfficialLavHeader(overrides: Partial<LavHeader> = {}): LavHeader {
  return {
    magic: 'LAV',
    version: 0x12,
    reserved04: 0x00,
    strMask: 0x00,
    arrayInitSize: 0x0000,
    entryPointField: 0x000000,
    reserved0B0F: new Uint8Array(5),
    ...overrides,
  };
}

export function parseLavHeader(buffer: Uint8Array): LavHeader {
  if (buffer.length < LAV_HEADER_SIZE) {
    throw new Error(`Invalid LAV file: expected at least ${LAV_HEADER_SIZE} bytes, got ${buffer.length}`);
  }
  const magic = String.fromCharCode(buffer[0], buffer[1], buffer[2]);
  if (magic !== 'LAV') {
    throw new Error(`Invalid LAV magic: ${magic}`);
  }
  return {
    magic,
    version: buffer[3],
    reserved04: buffer[4],
    strMask: buffer[5],
    arrayInitSize: buffer[6] | (buffer[7] << 8),
    entryPointField: buffer[8] | (buffer[9] << 8) | (buffer[10] << 16),
    reserved0B0F: buffer.slice(11, 16),
  };
}

export function encodeLavHeader(header: LavHeader): Uint8Array {
  const bytes = new Uint8Array(LAV_HEADER_SIZE);
  bytes[0] = 0x4c;
  bytes[1] = 0x41;
  bytes[2] = 0x56;
  bytes[3] = header.version & 0xff;
  bytes[4] = header.reserved04 & 0xff;
  bytes[5] = header.strMask & 0xff;
  bytes[6] = header.arrayInitSize & 0xff;
  bytes[7] = (header.arrayInitSize >> 8) & 0xff;
  bytes[8] = header.entryPointField & 0xff;
  bytes[9] = (header.entryPointField >> 8) & 0xff;
  bytes[10] = (header.entryPointField >> 16) & 0xff;
  bytes.set((header.reserved0B0F || new Uint8Array(0)).slice(0, 5), 11);
  return bytes;
}

export function getEffectiveEntryPoint(header: LavHeader): number {
  return header.entryPointField > 0 ? header.entryPointField : LAV_DEFAULT_ENTRY_POINT;
}

function decodeString(bytes: Uint8Array, strMask: number): string {
  const plain = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    plain[i] = strMask === 0 ? bytes[i] : (bytes[i] ^ strMask);
  }
  return iconv.decode(Buffer.from(plain), 'gbk');
}

export function formatPushString(bytes: Uint8Array, strMask: number): string {
  return decodeString(bytes, strMask)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

export function readInstruction(buffer: Uint8Array, offset: number): LavInstructionNode {
  const opcode = buffer[offset];
  const def = LAV_OPCODE_BY_VALUE.get(opcode);
  if (!def) {
    return {
      offset,
      opcode,
      mnemonic: 'DB',
      operandType: OperandType.U8,
      length: 1,
      operand: opcode,
      rawBytes: buffer.slice(offset, offset + 1),
      official: false,
      unknown: true,
    };
  }

  let end = offset + 1;
  let operand: LavInstructionNode['operand'];

  switch (def.operandType) {
    case OperandType.NONE:
      break;
    case OperandType.U8:
      operand = buffer[end];
      end += 1;
      break;
    case OperandType.I16: {
      const value = buffer[end] | (buffer[end + 1] << 8);
      operand = value > 0x7fff ? value - 0x10000 : value;
      end += 2;
      break;
    }
    case OperandType.U16:
      operand = buffer[end] | (buffer[end + 1] << 8);
      end += 2;
      break;
    case OperandType.U24:
      operand = buffer[end] | (buffer[end + 1] << 8) | (buffer[end + 2] << 16);
      end += 3;
      break;
    case OperandType.I32:
      operand = (buffer[end] | (buffer[end + 1] << 8) | (buffer[end + 2] << 16) | (buffer[end + 3] << 24)) >> 0;
      end += 4;
      break;
    case OperandType.STRING_Z: {
      let cursor = end;
      while (cursor < buffer.length && buffer[cursor] !== 0x00) cursor++;
      operand = buffer.slice(end, cursor);
      end = Math.min(cursor + 1, buffer.length);
      break;
    }
    case OperandType.INIT: {
      const targetAddr = buffer[end] | (buffer[end + 1] << 8);
      const dataLength = buffer[end + 2] | (buffer[end + 3] << 8);
      const dataStart = end + 4;
      const dataEnd = dataStart + dataLength;
      operand = {
        targetAddr,
        dataLength,
        data: buffer.slice(dataStart, dataEnd),
      };
      end = dataEnd;
      break;
    }
    case OperandType.FUNC_META:
      operand = {
        frameSize: buffer[end] | (buffer[end + 1] << 8),
        argCount: buffer[end + 2],
      };
      end += 3;
      break;
  }

  return {
    offset,
    opcode,
    mnemonic: def.mnemonic,
    operandType: def.operandType,
    length: end - offset,
    operand,
    rawBytes: buffer.slice(offset, end),
    official: def.official,
    unknown: false,
  };
}

export function isJumpMnemonic(mnemonic: string): boolean {
  return mnemonic === 'JMP' || mnemonic === 'JZ' || mnemonic === 'JNZ' || mnemonic === 'CALL';
}

export function getMnemonicForOpcode(opcode: number): string {
  return LAV_OPCODE_BY_VALUE.get(opcode)?.mnemonic || `0x${opcode.toString(16).padStart(2, '0')}`;
}

export function getSyscallName(opcode: number): string | undefined {
  const def = LAV_OPCODE_BY_VALUE.get(opcode);
  if (!def) return undefined;
  if (opcode < 0x80) return undefined;
  return def.mnemonic;
}

export function isSystemOpcode(opcode: number): boolean {
  return opcode >= 0x80 || LAV_OPCODE_BY_VALUE.get(opcode)?.mnemonic in SystemOp;
}
