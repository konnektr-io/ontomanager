<script setup lang="ts">
import { computed } from 'vue'
import Tree from 'primevue/tree'
import { storeToRefs } from 'pinia'
import { TreeType, useGraphStore, type ResourceTreeNode } from '@/stores/graph'


const props = defineProps<{
  type: TreeType;
}>()

const {
  classesTree,
  decompositionTree,
  propertiesTree,
  selectedOntology,
  selectedResource
} = storeToRefs(useGraphStore())

const selectedKeys = computed({
  get: () => ({ ...selectedResource.value && { [selectedResource.value]: true } }),
  set: (value: { [uri: string]: boolean }) => selectedResource.value = Object.keys(value)[0],
})
const treeData = computed<ResourceTreeNode[]>(() => {
  if (props.type === TreeType.Properties) return propertiesTree.value
  if (props.type === TreeType.Decomposition) return decompositionTree.value
  if (props.type === TreeType.Classes) return classesTree.value
  return []
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