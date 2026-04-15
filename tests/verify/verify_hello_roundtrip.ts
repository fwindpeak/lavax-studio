import { LavaXCompiler } from '../../src/compiler';
import { LavaXAssembler } from '../../src/compiler/LavaXAssembler';
import { LavaXDecompiler } from '../../src/decompiler';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const SOURCE = `void main() {
  printf("Hello, LavaX!\\n");
  printf("Press any key...\\n");
  getchar();
}`;

function main() {
  const compiler = new LavaXCompiler();
  const assembler = new LavaXAssembler();
  const decompiler = new LavaXDecompiler();

  const asm = compiler.compile(SOURCE);
  assert(!asm.startsWith('ERROR:'), asm);

  const lav = assembler.assemble(asm);
  const recovered = decompiler.decompile(lav);

  assert(recovered.includes('void main() {'), 'missing main function in decompiled source');
  assert(recovered.includes('printf("Hello, LavaX!\\n")') || recovered.includes('printf("Hello, LavaX!\\n",'), 'missing first printf in decompiled source');
  assert(recovered.includes('printf("Press any key...\\n")') || recovered.includes('printf("Press any key...\\n",'), 'missing second printf in decompiled source');
  assert(recovered.includes('getchar()'), 'missing getchar in decompiled source');

  console.log('PASS: hello-world compile/assemble/decompile round-trip keeps basic printf/getchar statements.');
}

main();
