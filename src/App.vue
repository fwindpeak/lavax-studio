<script setup lang="ts">
import { ref } from 'vue';
import Editor from './components/Editor.vue';
import Emulator from './components/Emulator.vue';
import Keyboard from './components/Keyboard.vue';
import { Lexer } from './compiler/lexer';
import { Parser } from './compiler/parser';
import { Codegen } from './compiler/codegen';
import { Decompiler } from './compiler/decompiler';

const code = ref(`void main() {
    ClearScreen();
    Circle(80, 40, 30, 1, 1);
    Refresh();
}`);

const output = ref('');
const bytecode = ref<Uint8Array | null>(null);
const emulatorRef = ref<InstanceType<typeof Emulator> | null>(null);

const build = () => {
    try {
        output.value = 'Compiling...\\n';
        const lexer = new Lexer(code.value);
        const parser = new Parser(lexer);
        const ast = parser.parse();
        
        const codegen = new Codegen();
        const data = codegen.generate(ast);
        bytecode.value = data;
        output.value += 'Compile success! Size: ' + data.length + ' bytes\\n';
        
        const ir = Decompiler.decompile(data);
        output.value += '\\n--- Intermediate Code ---\\n' + ir;
    } catch (e: any) {
        output.value = 'Error: ' + e.message;
        console.error(e);
    }
};

const run = () => {
    if (!bytecode.value) build();
    if (bytecode.value) {
        emulatorRef.value?.runProgram(bytecode.value);
    }
};

const handleKeyDown = (key: string) => {
    console.log('Key Down:', key);
    // TODO: Send to GVM
};

const handleKeyUp = (key: string) => {
    console.log('Key Up:', key);
};
</script>

<template>
  <div class="ide-container">
    <header class="ide-header">
      <h1>LavStudio</h1>
      <div class="actions">
        <button @click="build">Build</button>
        <button @click="run" class="run-btn">Run</button>
      </div>
    </header>
    
    <div class="ide-body">
      <div class="editor-section">
        <Editor v-model="code" />
      </div>
      
      <div class="emulator-section">
        <div class="emulator-view">
          <Emulator ref="emulatorRef" />
        </div>
        <div class="keyboard-view">
          <Keyboard @keydown="handleKeyDown" @keyup="handleKeyUp" />
        </div>
        <div class="output-view">
          <pre>{{ output }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
body {
  margin: 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #1e1e1e;
  color: #d4d4d4;
  height: 100vh;
  overflow: hidden;
}

.ide-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.ide-header {
  background: #333;
  padding: 10px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #444;
}

.ide-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #007acc;
}

.ide-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.editor-section {
  flex: 1;
  border-right: 1px solid #444;
}

.emulator-section {
  width: 400px;
  background: #252526;
  display: flex;
  flex-direction: column;
  padding: 10px;
  gap: 10px;
  overflow-y: auto;
}

.emulator-view {
  display: flex;
  justify-content: center;
}

.output-view {
  flex: 1;
  background: #000;
  color: #0f0;
  padding: 10px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  overflow: auto;
  border-radius: 4px;
}

button {
  background: #3c3c3c;
  color: white;
  border: 1px solid #555;
  padding: 6px 15px;
  cursor: pointer;
  border-radius: 3px;
}

button:hover {
  background: #4a4a4a;
}

.run-btn {
  background: #28a745;
  border-color: #218838;
}

.run-btn:hover {
  background: #218838;
}

pre {
  margin: 0;
  white-space: pre-wrap;
}
</style>
