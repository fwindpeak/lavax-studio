<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { GVM } from '../vm/gvm';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const gvm = new GVM();

onMounted(() => {
  if (canvasRef.value) {
    gvm.screen.setCanvas(canvasRef.value);
  }
});

const runProgram = (data: Uint8Array) => {
  gvm.loadProgram(data);
  const loop = () => {
    if (gvm.running) {
      for (let i = 0; i < 1000; i++) {
        gvm.step();
      }
      requestAnimationFrame(loop);
    }
  };
  loop();
};

defineExpose({ runProgram });
</script>

<template>
  <div class="emulator-container">
    <canvas ref="canvasRef" class="emulator-canvas"></canvas>
  </div>
</template>

<style scoped>
.emulator-container {
  background: #222;
  padding: 10px;
  border-radius: 8px;
  display: inline-block;
}
.emulator-canvas {
  width: 320px;
  height: 160px;
  image-rendering: pixelated;
  background: #fff;
  border: 4px solid #444;
}
</style>
