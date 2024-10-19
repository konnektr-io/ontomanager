<script setup lang="ts">
import { computed } from 'vue'
import Tree from 'primevue/tree'
import { storeToRefs } from 'pinia'
import { TreeType, useGraphStore } from '@/stores/graph'


const props = defineProps<{
  type: TreeType;
}>()

const {
  classesTree,
  propertiesTree,
  selectedOntology,
  selectedResource
} = storeToRefs(useGraphStore())

const selectedKeys = computed({
  get: () => ({ ...selectedResource.value && { [selectedResource.value]: true } }),
  set: (value: { [uri: string]: boolean }) => selectedResource.value = Object.keys(value)[0],
})
const treeData = computed(() => {
  if (props.type === TreeType.Properties) return propertiesTree.value
  return classesTree.value
})

</script>

<template>
  <Tree
    v-model:selectionKeys="selectedKeys"
    :value="treeData"
    selectionMode="single"
    class="w-full"
  >
    <template #default="slotProps">
      <div v-tooltip="slotProps.node.key">
        <span :class="{ 'font-semibold': slotProps.node.data.graph === selectedOntology?.url }">
          {{ slotProps.node.label }}
        </span>
      </div>
    </template>
  </Tree>
</template>