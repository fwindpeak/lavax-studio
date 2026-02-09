
export const SCREEN_WIDTH = 160;
export const SCREEN_HEIGHT = 80;
export const MEMORY_SIZE = 65536; // 64KB
export const STR_MASK = 0xF0000000 | 0;

export enum Op {
  NOP = 0x00,
  LIT = 0x01, // LIT value (4 bytes)
  LOD = 0x02, // LOD offset (4 bytes)
  STO = 0x03, // STO offset (4 bytes)
  ADD = 0x10,
  SUB = 0x11,
  MUL = 0x12,
  DIV = 0x13,
  MOD = 0x14,
  AND = 0x15,
  OR  = 0x16,
  XOR = 0x17,
  EQ  = 0x18,
  NEQ = 0x19,
  LT  = 0x1A,
  GT  = 0x1B,
  LE  = 0x1C,
  GE  = 0x1D,
  JMP = 0x20, // JMP addr (4 bytes)
  JZ  = 0x21, // JZ addr (4 bytes)
  JNZ = 0x22, // JNZ addr (4 bytes)
  CALL= 0x30, // CALL addr (4 bytes)
  RET = 0x31,
  SYS = 0x40, // SYS id (4 bytes)
  POP = 0x50,
  DUP = 0x51,
  HLT = 0xFF
}

export enum Syscall {
  ClearScreen = 1,
  Refresh = 2,
  TextOut = 3,
  getchar = 4,
  delay = 5,
  Box = 6,
  Line = 7,
  SetFontSize = 8,
  Locate = 9,
  fopen = 10,
  fclose = 11,
  fread = 12,
  fwrite = 13,
  fseek = 14,
  remove = 15,
  exists = 16,
  GetPixel = 17,
  SetPixel = 18,
  Circle = 19,
  Ellipse = 20,
  FillBox = 21,
  Beep = 22,
  Inkey = 23
}
