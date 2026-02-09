
export const SCREEN_WIDTH = 160;
export const SCREEN_HEIGHT = 80;
export const MEMORY_SIZE = 1024 * 1024; // Increase to 1MB for safety, typical GVM range

// Memory Layout Offsets
export const VRAM_OFFSET = 0x0000;
export const BUF_OFFSET = 0x0640;
export const TEXT_OFFSET = 0x0C80;
export const HEAP_OFFSET = 0x1000;

export const HANDLE_TYPE_BYTE = 0x10000;
export const HANDLE_TYPE_WORD = 0x20000;
export const HANDLE_TYPE_DWORD = 0x40000;
export const HANDLE_BASE_EBP = 0x800000;
export const STR_MASK = 0xF0000000;

export enum Op {
  NOP = 0x00,
  PUSH_B = 0x01,
  PUSH_CHAR = 0x01, // Alias
  PUSH_W = 0x02,
  PUSH_INT = 0x02,  // Alias
  PUSH_D = 0x03,
  PUSH_LONG = 0x03, // Alias

  LD_G_B = 0x04,
  LD_G_W = 0x05,
  LD_G_D = 0x06,
  LD_GO_B = 0x07,
  LD_GO_W = 0x08,
  LD_GO_D = 0x09,

  LEA_G_B = 0x0a,
  LEA_G_W = 0x0b,
  LEA_G_D = 0x0c,

  STR = 0x0d,
  ADD_STRING = 0x0d, // Alias

  LD_L_B = 0x0e,
  LD_L_W = 0x0f,
  LD_L_D = 0x10,
  LD_LO_B = 0x11,
  LD_LO_W = 0x12,
  LD_LO_D = 0x13,

  LEA_L_B = 0x14,
  LEA_L_W = 0x15,
  LEA_L_D = 0x16,

  LEA_23 = 0x17, // Often used as PUSH_OFFSET_CHAR or similar in some GVM versions
  LEA_24 = 0x18, // PUSH_OFFSET_INT
  ADDR_L = 0x19, // PUSH_R_ADDR

  LD_TBUF = 0x1a,
  LD_GRA = 0x1b,

  NEG = 0x1c,
  INC_PRE = 0x1d,
  DEC_PRE = 0x1e,
  INC_POST = 0x1f,
  DEC_POST = 0x20,
  ADD = 0x21,
  SUB = 0x22,
  AND = 0x23,
  OR = 0x24,
  NOT = 0x25,
  XOR = 0x26,
  L_AND = 0x27,
  L_OR = 0x28,
  L_NOT = 0x29,
  MUL = 0x2a,
  DIV = 0x2b,
  MOD = 0x2c,
  SHL = 0x2d,
  SHR = 0x2e,
  EQ = 0x2f,
  NEQ = 0x30,
  LE = 0x31,
  GE = 0x32,
  GT = 0x33,
  LT = 0x34,

  STORE = 0x35,
  LD_IND_B = 0x36,
  CAST_PTR = 0x37,
  PUSH_ADDR_LONG = 0x38, // Missing load global addr

  JZ = 0x39,
  JNZ = 0x3a,
  JMP = 0x3b,
  BASE = 0x3c,
  ENTER = 0x3c, // Alias for BASE/ENTER frame setup
  CALL = 0x3d,
  FUNC = 0x3e,
  RET = 0x3f,
  EXIT = 0x40,
  INIT = 0x41,
  LD_GBUF = 0x42,

  LOAD_R1_CHAR = 0x43,
  LOAD_R1_INT = 0x44,
  LOAD_R1_LONG = 0x44, // Alias

  // Combo Opcodes (Constant Optimization)
  ADD_C = 0x45,
  SUB_C = 0x46,
  MUL_C = 0x47,
  DIV_C = 0x48,
  MOD_C = 0x49,
  SHL_C = 0x4a,
  SHR_C = 0x4b,
  EQ_C = 0x4c,
  NEQ_C = 0x4d,
  GT_C = 0x4e,
  LT_C = 0x4f,
  GE_C = 0x50,
  LE_C = 0x51,

  LD_IND_W = 0x52,
  LD_IND_D = 0x53,
  CALC_R_ADDR_1 = 0x54, // Missing
  TAG_B = 0x55,
  PUSH_R_ADDR = 0x56,   // Alias for specific addressing
  POP = 0x57,           // POP value from stack

  FINISH = 0xCF,
  EOF = 0xff
}

export enum SystemOp {
  putchar = 0x80,
  getchar = 0x81,
  printf = 0x82,
  strcpy = 0x83,
  strlen = 0x84,
  SetScreen = 0x85,
  UpdateLCD = 0x86,
  Delay = 0x87,
  delay = 0x87,
  WriteBlock = 0x88,
  Refresh = 0x89,
  TextOut = 0x8a,
  Block = 0x8b,
  FillBox = 0x8b,
  Rectangle = 0x8c,
  Rect = 0x8c,
  Exit = 0x8d,
  ClearScreen = 0x8e,
  abs = 0x8f,
  rand = 0x90,
  srand = 0x91,
  Locate = 0x92,
  Inkey = 0x93,
  Point = 0x94,
  GetPoint = 0x95,
  Line = 0x96,
  Box = 0x97,
  Circle = 0x98,
  Ellipse = 0x99,
  Beep = 0x9a,
  isalnum = 0x9b,
  isalpha = 0x9c,
  iscntrl = 0x9d,
  isdigit = 0x9e,
  isgraph = 0x9f,
  islower = 0xa0,
  isprint = 0xa1,
  ispunct = 0xa2,
  isspace = 0xa3,
  isupper = 0xa4,
  isxdigit = 0xa5,
  strcat = 0xa6,
  strchr = 0xa7,
  strcmp = 0xa8,
  strstr = 0xa9,
  tolower = 0xaa,
  toupper = 0xab,
  memset = 0xac,
  memcpy = 0xad,
  fopen = 0xae,
  fclose = 0xaf,
  fread = 0xb0,
  fwrite = 0xb1,
  fseek = 0xb2,
  ftell = 0xb3,
  feof = 0xb4,
  rewind = 0xb5,
  fgetc = 0xb6,
  fputc = 0xb7,
  sprintf = 0xb8,
  MakeDir = 0xb9,
  DeleteFile = 0xba,
  Getms = 0xbb,
  GetMS = 0xbb,
  CheckKey = 0xbc,
  memmove = 0xbd,
  CRC16 = 0xbe,
  Secret = 0xbf,
  ChDir = 0xc0,
  FileList = 0xc1,
  GetTime = 0xc2,
  SetTime = 0xc3,
  GetWord = 0xc4,
  XDraw = 0xc5,
  ReleaseKey = 0xc6,
  GetBlock = 0xc7,
  Sin = 0xc8,
  Cos = 0xc9,
  FillArea = 0xca,
  SetGraphMode = 0xcb,
  SetBgColor = 0xcc,
  SetFgColor = 0xcd,
  SetBkMode = 0xce, // also used for SetFillColor/SetList in some versions
  System = 0xd3,
  Math = 0xd4,
  SetPalette = 0xd5,
}

export enum MathOp {
  itof = 0x01,
  fadd = 0x02,
  fsub = 0x03,
  fmul = 0x04,
  fdiv = 0x05,
  ftoi = 0x06,
  sin = 0x07,
  cos = 0x08,
  tan = 0x09,
  asin = 0x0a,
  acos = 0x0b,
  atan = 0x0c,
  sqrt = 0x0d,
  exp = 0x0e,
  log = 0x0f,
  atof = 0x10,
  fabs = 0x13,
}

export enum FloatOp {
  itof = 0x54,
  ftoi = 0x55,
  fadd = 0x56,
  fadd_fi = 0x57,
  fadd_if = 0x58,
  fsub = 0x59,
  fsub_fi = 0x5a,
  fsub_if = 0x5b,
  fmul = 0x5c,
  fmul_fi = 0x5d,
  fmul_if = 0x5e,
  fdiv = 0x5f,
  fdiv_fi = 0x60,
  fdiv_if = 0x61,
  fneg = 0x62,
  flt = 0x63,
  fgt = 0x64,
  feq = 0x65,
  fneq = 0x66,
  fle = 0x67,
  fge = 0x68,
}
