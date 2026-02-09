<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import * as monaco from 'monaco-editor';
import { setupMonaco } from '../utils/monaco';

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits(['update:modelValue']);

const editorRef = ref<HTMLDivElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor | null = null;

onMounted(() => {
  setupMonaco();
  if (editorRef.value) {
    editor = monaco.editor.create(editorRef.value, {
      value: props.modelValue,
      language: 'lavax',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false },
    });

    editor.onDidChangeModelContent(() => {
      emit('update:modelValue', editor?.getValue() || '');
    });
  }
});

onUnmounted(() => {
  editor?.dispose();
});

defineExpose({
  setValue: (val: string) => editor?.setValue(val),
  getValue: () => editor?.getValue() || ''
});
</script>

<template>
  <div ref="editorRef" class="monaco-editor-container"></div>
</template>

<style scoped>
.monaco-editor-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
}
</style>
