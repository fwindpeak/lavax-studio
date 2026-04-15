import {
  type LavHeader,
  type LavInstructionNode,
  type LavProgram,
  LAV_HEADER_SIZE,
  parseLavHeader,
  readInstruction,
} from '../lav/format';

export type { LavHeader, LavInstructionNode, LavProgram } from '../lav/format';

export class LavParser {
  public static parse(buffer: ArrayBuffer | Uint8Array): LavProgram {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const header = this.parseHeader(bytes);
    const instructions: LavInstructionNode[] = [];

    let offset = LAV_HEADER_SIZE;
    while (offset < bytes.length) {
      const instruction = readInstruction(bytes, offset);
      instructions.push(instruction);
      offset += instruction.length;
    }

    return { header, instructions };
  }

  public static parseHeader(buffer: ArrayBuffer | Uint8Array): LavHeader {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    return parseLavHeader(bytes);
  }
}
