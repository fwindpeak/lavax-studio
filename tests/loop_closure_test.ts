// 闭环测试：验证 源码 -> 编译 -> 运行 -> 反编译 -> 编译 -> 运行
import { LavaXCompiler } from '../src/compiler';
import { LavaXAssembler } from '../src/compiler/LavaXAssembler';
import { LavaXVM } from '../src/vm';
import { LavaXDecompiler } from '../src/decompiler';

class MockStorageDriver {
    name = 'mock';
    ready = Promise.resolve();
    async getAll() { return new Map(); }
    async persist() { }
    async remove() { }
}

async function runTest(name: string, source: string): Promise<boolean> {
    console.log(`\n========== ${name} ==========`);
    
    const compiler = new LavaXCompiler();
    const assembler = new LavaXAssembler();
    const decompiler = new LavaXDecompiler();
    
    // 步骤 1: 编译源码 -> 汇编
    console.log('Step 1: Compiling source to assembly...');
    const asm1 = compiler.compile(source);
    if (asm1.startsWith('ERROR:')) {
        console.error('❌ Compilation failed:', asm1);
        return false;
    }
    console.log('✓ Compiled successfully');
    
    // 步骤 2: 汇编 -> LAV 字节码
    console.log('Step 2: Assembling to LAV bytecode...');
    let lav1: Uint8Array;
    try {
        lav1 = assembler.assemble(asm1);
        console.log('✓ Assembled successfully');
    } catch (e: any) {
        console.error('❌ Assembly failed:', e.message);
        return false;
    }
    
    // 步骤 3: 运行 LAV
    console.log('Step 3: Running LAV (first run)...');
    const vm1 = new LavaXVM(new MockStorageDriver() as any);
    let output1 = '';
    vm1.onLog = (msg) => {
        output1 += msg;
        if (!msg.includes('DEBUG') && !msg.includes('System:')) {
            process.stdout.write(msg);
        }
    };
    
    try {
        vm1.load(lav1);
        await vm1.run();
        console.log('\n✓ First run completed');
    } catch (e: any) {
        console.error('❌ First run failed:', e.message);
        return false;
    }
    
    // 步骤 4: 反编译 LAV -> 源码
    console.log('Step 4: Decompiling LAV to source...');
    const decompiledSource = decompiler.decompile(lav1);
    console.log('✓ Decompiled successfully');
    console.log('\n--- Decompiled Source ---');
    console.log(decompiledSource);
    console.log('--- End Decompiled Source ---\n');
    
    // 步骤 5: 再次编译反编译后的源码
    console.log('Step 5: Recompiling decompiled source...');
    const asm2 = compiler.compile(decompiledSource);
    if (asm2.startsWith('ERROR:')) {
        console.error('❌ Recompilation failed:', asm2);
        console.log('\n⚠️  This is expected - decompiler generates pseudo-code, not valid C');
        console.log('⚠️  The goal is to eventually generate valid compilable C code');
        return false;
    }
    console.log('✓ Recompiled successfully');
    
    // 步骤 6: 再次汇编
    console.log('Step 6: Reassembling...');
    let lav2: Uint8Array;
    try {
        lav2 = assembler.assemble(asm2);
        console.log('✓ Reassembled successfully');
    } catch (e: any) {
        console.error('❌ Reassembly failed:', e.message);
        return false;
    }
    
    // 步骤 7: 再次运行并比较输出
    console.log('Step 7: Running LAV (second run)...');
    const vm2 = new LavaXVM(new MockStorageDriver() as any);
    let output2 = '';
    vm2.onLog = (msg) => {
        output2 += msg;
        if (!msg.includes('DEBUG') && !msg.includes('System:')) {
            process.stdout.write(msg);
        }
    };
    
    try {
        vm2.load(lav2);
        await vm2.run();
        console.log('\n✓ Second run completed');
    } catch (e: any) {
        console.error('❌ Second run failed:', e.message);
        return false;
    }
    
    // 步骤 8: 比较输出
    console.log('Step 8: Comparing outputs...');
    const out1 = output1.replace(/System:.*\n/g, '').trim();
    const out2 = output2.replace(/System:.*\n/g, '').trim();
    
    if (out1 === out2) {
        console.log('✅ Outputs match! Loop closure successful!');
        return true;
    } else {
        console.log('⚠️  Outputs differ:');
        console.log('First run output:', JSON.stringify(out1));
        console.log('Second run output:', JSON.stringify(out2));
        return false;
    }
}

async function main() {
    // 测试 1: 简单算术
    const test1 = `
void main() {
    int a = 10;
    int b = 20;
    int c = a + b;
    printf("Result: %d\\n", c);
}
`;
    
    // 测试 2: 数组
    const test2 = `
void main() {
    int arr[3] = {1, 2, 3};
    int i;
    for (i = 0; i < 3; i++) {
        printf("%d ", arr[i]);
    }
    printf("\\n");
}
`;
    
    // 测试 3: 函数调用
    const test3 = `
int add(int a, int b) {
    return a + b;
}

void main() {
    int result = add(5, 3);
    printf("5 + 3 = %d\\n", result);
}
`;
    
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║            LavStudio Loop Closure Test Suite                 ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    
    const results = {
        'Simple Arithmetic': await runTest('Test 1: Simple Arithmetic', test1),
        'Array Operations': await runTest('Test 2: Array Operations', test2),
        'Function Call': await runTest('Test 3: Function Call', test3),
    };
    
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                        Summary                               ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    
    for (const [name, passed] of Object.entries(results)) {
        console.log(`${passed ? '✅' : '❌'} ${name}`);
    }
    
    const passedCount = Object.values(results).filter(v => v).length;
    const totalCount = Object.keys(results).length;
    
    console.log(`\nTotal: ${passedCount}/${totalCount} tests passed`);
    
    if (passedCount < totalCount) {
        console.log('\n💡 Note: Full loop closure requires the decompiler to generate');
        console.log('   valid C code. Current decompiler generates pseudo-code for');
        console.log('   human reading, which may not be compilable.');
    }
}

main().catch(console.error);
