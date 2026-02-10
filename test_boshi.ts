
import { LavaXCompiler } from './src/compiler';
import fs from 'fs';

const source = fs.readFileSync('./examples/boshi.c', 'utf8');
const compiler = new LavaXCompiler();
const result = compiler.compile(source);

if (result.startsWith('ERROR:')) {
    console.error(result);
    process.exit(1);
} else {
    console.log("Compilation successful!");
}
