
import { Op, SystemOp } from '../types';
import iconv from 'iconv-lite';

function encodeToGBK(str: string): number[] {
    try {
        const buf = iconv.encode(str, 'gbk');
        return Array.from(buf);
    } catch (e) {
        return Array.from(str).map(c => c.charCodeAt(0) & 0xFF);
    }
}

function unescapeString(str: string): string {
    return str.replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
}

export class LavaXAssembler {
    assemble(asmSource: string): Uint8Array {
        const lines = asmSource.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith(';'));
        const code: number[] = [];
        const labels: Map<string, number> = new Map();
        const fixups: { pos: number, label: string, size: 2 | 3 | 4 }[] = [];

        let currentPos = 0;
        for (const line of lines) {
            if (line.endsWith(':')) { labels.set(line.slice(0, -1), currentPos); continue; }
            const parts = line.split(/\s+/);
            const opcodeStr = parts[0].toUpperCase();
            const op = (Op as any)[opcodeStr];
            const sysOp = (SystemOp as any)[parts[0]];

            if (op !== undefined) {
                currentPos += 1;
                if (op === Op.PUSH_CHAR) currentPos += 1;
                else if ([Op.PUSH_INT, Op.LOAD_R1_CHAR, Op.LOAD_R1_INT, Op.LOAD_R1_LONG, Op.CALC_R_ADDR_1, Op.PUSH_R_ADDR].includes(op)) currentPos += 2;
                else if ([Op.JZ, Op.JNZ, Op.JMP, Op.CALL].includes(op)) currentPos += 3;
                else if ([Op.PUSH_LONG, Op.PUSH_ADDR_LONG].includes(op)) currentPos += 4;
                else if (op === Op.FUNC) currentPos += 3;
                else if (op === Op.ADD_STRING) {
                    const start = line.indexOf('"');
                    const end = line.lastIndexOf('"');
                    let str = (start !== -1 && end !== -1) ? line.substring(start + 1, end) : "";
                    str = unescapeString(str);
                    currentPos += encodeToGBK(str).length + 1;
                } else if (op === Op.ENTER) {
                    currentPos += 3;
                }
            } else if (sysOp !== undefined) {
                currentPos += 1;
            }
        }

        for (const line of lines) {
            if (line.endsWith(':')) continue;
            const parts = line.split(/\s+/);
            const opcodeStr = parts[0].toUpperCase();
            const op = (Op as any)[opcodeStr];
            const sysOp = (SystemOp as any)[parts[0]];

            if (op !== undefined) {
                code.push(op);
                const arg = parts[1];
                if (op === Op.PUSH_CHAR) {
                    code.push(parseInt(arg) & 0xFF);
                } else if ([Op.PUSH_INT, Op.LOAD_R1_CHAR, Op.LOAD_R1_INT, Op.LOAD_R1_LONG, Op.CALC_R_ADDR_1, Op.PUSH_R_ADDR].includes(op)) {
                    this.pushInt16(code, parseInt(arg));
                } else if ([Op.PUSH_LONG, Op.PUSH_ADDR_LONG].includes(op)) {
                    this.pushInt32(code, parseInt(arg));
                } else if (op === Op.ENTER || op === Op.FUNC) {
                    this.pushInt16(code, parseInt(parts[1]));
                    code.push(parseInt(parts[2]));
                } else if ([Op.JMP, Op.JZ, Op.JNZ, Op.CALL].includes(op)) {
                    fixups.push({ pos: code.length, label: arg, size: 3 });
                    this.pushInt24(code, 0);
                } else if (op === Op.ADD_STRING) {
                    let str = line.substring(line.indexOf('"') + 1, line.lastIndexOf('"'));
                    str = unescapeString(str);
                    const bytes = encodeToGBK(str);
                    bytes.forEach(b => code.push(b));
                    code.push(0);
                }
            } else if (sysOp !== undefined) {
                code.push(sysOp);
            }
        }

        for (const fix of fixups) {
            const addr = (labels.get(fix.label) ?? 0) + 16;
            if (fix.size === 3) {
                code[fix.pos] = addr & 0xFF;
                code[fix.pos + 1] = (addr >> 8) & 0xFF;
                code[fix.pos + 2] = (addr >> 16) & 0xFF;
            }
        }

        const binary = new Uint8Array(16 + code.length);
        binary.set([0x4C, 0x41, 0x56, 0x12], 0);
        binary[8] = 0x01;
        const SCREEN_WIDTH = 160;
        const SCREEN_HEIGHT = 80;
        binary[9] = SCREEN_WIDTH / 16;
        binary[10] = SCREEN_HEIGHT / 16;
        binary.set(new Uint8Array(code), 16);
        return binary;
    }

    private pushInt16(ops: number[], val: number) {
        ops.push(val & 0xFF, (val >> 8) & 0xFF);
    }
    private pushInt24(ops: number[], val: number) {
        ops.push(val & 0xFF, (val >> 8) & 0xFF, (val >> 16) & 0xFF);
    }
    private pushInt32(ops: number[], val: number) {
        ops.push(val & 0xFF, (val >> 8) & 0xFF, (val >> 16) & 0xFF, (val >> 24) & 0xFF);
    }
}
