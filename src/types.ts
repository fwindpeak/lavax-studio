
export const SCREEN_WIDTH = 160;
export const SCREEN_HEIGHT = 80;
export const MEMORY_SIZE = 65536; // 64KB
export const STR_MASK = 0xF0000000 | 0;

export enum Op {
  NOP = 0x00,
  PUSH_CHAR = 0x01,      // PUSH_CHAR char (1 byte)
  PUSH_INT = 0x02,       // PUSH_INT int (2 bytes)
  PUSH_LONG = 0x03,      // PUSH_LONG long (4 bytes)
  PUSH_ADDR_CHAR = 0x04, // PUSH_ADDR_CHAR addr (4 bytes)
  PUSH_ADDR_INT = 0x05,  // PUSH_ADDR_INT addr (4 bytes)
  PUSH_ADDR_LONG = 0x06, // PUSH_ADDR_LONG addr (4 bytes)
  PUSH_OFFSET_CHAR = 0x07,// PUSH_OFFSET_CHAR offset (2 bytes)
  PUSH_OFFSET_INT = 0x08, // PUSH_OFFSET_INT offset (2 bytes)
  PUSH_OFFSET_LONG = 0x09,// PUSH_OFFSET_LONG offset (2 bytes)

  ADD_STRING = 0x0d,     // ADD_STRING string (SZ) -> push addr | 0x10000000

  LOAD_R1_CHAR = 0x0e,   // LOAD_R1_CHAR offset (2 bytes)
  LOAD_R1_INT = 0x0f,    // LOAD_R1_INT offset (2 bytes)
  LOAD_R1_LONG = 0x10,   // LOAD_R1_LONG offset (2 bytes)

  CALC_R_ADDR_1 = 0x14,  // CALC_R_ADDR_1 val (2 bytes)
  PUSH_R_ADDR = 0x19,    // PUSH_R_ADDR val (2 bytes)

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
  LOGIC_AND = 0x27,
  LOGIC_OR = 0x28,
  LOGIC_NOT = 0x29,
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

  STORE = 0x35,          // STORE
  LOAD_CHAR = 0x36,      // LOAD_CHAR

  JZ = 0x39,            // JZ addr (3 bytes)
  JNZ = 0x3a,            // JNZ addr (3 bytes)
  JMP = 0x3b,            // JMP addr (3 bytes)

  CALL = 0x3d,           // CALL addr (3 bytes)
  ENTER = 0x3e,          // ENTER size(2), cnt(1)
  RET = 0x3f,            // RET
  EXIT = 0x40,           // EXIT

  LOAD_BYTES = 0x41,     // LOAD_BYTES addr(2), len(2) -> read len bytes
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
  DrawRegion = 0x88,
  Refresh = 0x89,
  TextOut = 0x8a,
  Block = 0x8b,
  Rectangle = 0x8c,
  sprintf = 0x8d,
  ClearScreen = 0x8e,
  abs = 0x8f,
  rand = 0x90,
  srand = 0x91,
  Locate = 0x92,
  CheckKey = 0x93, // Inkey?
  Point = 0x94,
  GetPoint = 0x95,
  Line = 0x96,
  Box = 0x97,
  Circle = 0x98,
  FillCircle = 0x99,

  isalnum = 0x9b,
  isalpha = 0x9c,
  iscntrl = 0x9d,
  isdigit = 0x9e,
  isgraph = 0x9f,

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

  MakeDir = 0xb9,
  DeleteFile = 0xba,

  Getms = 0xbb,
  CheckKey_Alt = 0xbc,
  memmove = 0xbd,
  CRC16 = 0xbe,

  ChDir = 0xc0,
  FileList = 0xc1,
  GetTime = 0xc2,
  GetWord = 0xc4,
  XDraw = 0xc5,
  ReleaseKey = 0xc6,
  GetBlock = 0xc7,
  Cos = 0xc8,
  Sin = 0xc9,
  FillArea = 0xca
}
