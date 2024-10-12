<script setup lang="ts">
import { computed } from 'vue';
import Tree from 'primevue/tree';
import { useMainStore } from '@/stores/main';
import { storeToRefs } from 'pinia';
import { useGraphStore } from '@/stores/graph-store';

const { selected } = storeToRefs(useMainStore());
const selectedKeys = computed({
  get: () => ({ ...selected.value && { [selected.value]: true } }),
  set: (value: { [uri: string]: boolean }) => selected.value = Object.keys(value)[0],
});

const { classesTree } = storeToRefs(useGraphStore());
const { getPrefixedUri } = useGraphStore();

</script>

<template>
  <Tree
    v-model:selectionKeys="selectedKeys"
    :value="classesTree"
    selectionMode="single"
    class="w-full"
  >
    <template #default="slotProps">
      <div v-tooltip="slotProps.node.key">{{ slotProps.node.label }}</div>
    </template>
  </Tree>
</template>