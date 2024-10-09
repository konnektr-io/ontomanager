<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Tree from 'primevue/tree';
import { useMainStore } from '@/stores/main';
import graphStoreService, { type ClassTreeNode } from '@/services/GraphStoreService';
import { storeToRefs } from 'pinia';

const items = ref<ClassTreeNode[]>([]);
const { selected } = storeToRefs(useMainStore());
const selectedKeys = computed({
  get: () => ({ ...selected.value && { [selected.value]: true } }),
  set: (value: { [uri: string]: boolean }) => selected.value = Object.keys(value)[0],
});

onMounted(async () => {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  items.value = graphStoreService.getClassesTree()
});
</script>

<template>
  <Tree
    v-model:selectionKeys="selectedKeys"
    :value="items"
    selectionMode="single"
    class="w-full"
  >
  </Tree>
</template>