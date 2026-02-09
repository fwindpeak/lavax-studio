import { Opcode, SysCall } from '../vm/types';

export class Decompiler {
  static decompile(data: Uint8Array): string {
    let pc = 16;
    let output = '';

    const opNames = Object.fromEntries(Object.entries(Opcode).map(([k, v]) => [v, k]));
    const sysNames = Object.fromEntries(Object.entries(SysCall).map(([k, v]) => [v, k]));

    while (pc < data.length) {
      const addr = pc;
      const opcode = data[pc++];
      
      if (opcode === undefined) break;

      output += `${addr.toString(16).padStart(4, '0')}: `;

      if (opcode & 0x80) {
        const name = sysNames[opcode] || `SYS_${opcode.toString(16)}`;
        output += `${name}\n`;
      } else {
        const name = opNames[opcode] || `OP_${opcode.toString(16)}`;
        output += `${name}`;

        switch (opcode) {
          case Opcode.PUSH_CHAR:
            output += ` ${data[pc++]}`;
            break;
          case Opcode.PUSH_INT:
            output += ` ${(data[pc]! | (data[pc + 1]! << 8))}`;
            pc += 2;
            break;
          case Opcode.PUSH_LONG:
          case Opcode.CALL:
          case Opcode.JMP:
          case Opcode.JZ:
          case Opcode.JNZ:
            output += ` 0x${(data[pc]! | (data[pc + 1]! << 8) | (data[pc + 2]! << 16) | (data[pc + 3]! << 24)).toString(16)}`;
            pc += 4;
            break;
          case Opcode.ENTER:
            output += ` size=${(data[pc]! | (data[pc + 1]! << 8))} cnt=${data[pc + 2]!}`;
            pc += 3;
            break;
          case Opcode.ADD_STRING:
            output += ' "';
            while (data[pc] !== 0 && pc < data.length) output += String.fromCharCode(data[pc++]!);
            output += '"';
            pc++;
            break;
        }
        output += '\n';
      }
    }

    return output;
  }
}
