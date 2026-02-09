<script setup lang="ts">
const emit = defineEmits(['keydown', 'keyup']);

const keys = [
  ['F1', 'F2', 'F3', 'F4'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Enter'],
  ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Esc'],
  ['Ctrl', 'Alt', 'Space', 'Left', 'Up', 'Down', 'Right']
];

const handleKey = (key: string, down: boolean) => {
  emit(down ? 'keydown' : 'keyup', key);
};
</script>

<template>
  <div class="keyboard">
    <div v-for="(row, i) in keys" :key="i" class="key-row">
      <button 
        v-for="key in row" 
        :key="key"
        @mousedown="handleKey(key, true)"
        @mouseup="handleKey(key, false)"
        @mouseleave="handleKey(key, false)"
        :class="['key-btn', key.toLowerCase()]"
      >
        {{ key }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.keyboard {
  background: #333;
  padding: 10px;
  border-radius: 8px;
  user-select: none;
}
.key-row {
  display: flex;
  justify-content: center;
  margin-bottom: 5px;
}
.key-btn {
  padding: 8px 12px;
  margin: 2px;
  background: #555;
  color: #fff;
  border: 1px solid #777;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  min-width: 30px;
}
.key-btn:active {
  background: #777;
}
.space { min-width: 100px; }
.shift, .ctrl, .alt { background: #664; }
.enter { background: #464; }
</style>
