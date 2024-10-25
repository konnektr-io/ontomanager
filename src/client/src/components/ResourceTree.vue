<script setup lang="ts">
import { ref, computed, watch, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'
import Tree from 'primevue/tree'
import ProgressSpinner from 'primevue/progressspinner'
import { TreeType, useGraphStore, type ResourceTreeNode } from '@/stores/graph'
import graphStoreService from '@/services/GraphStoreService'


const props = defineProps<{
  type: TreeType;
}>()

const {
  userGraphs,
  visibleGraphs,
  selectedOntology,
  selectedResource
} = storeToRefs(useGraphStore())

const selectedKeys = computed({
  get: () => ({ ...selectedResource.value && { [selectedResource.value]: true } }),
  set: (value: { [uri: string]: boolean }) => selectedResource.value = Object.keys(value)[0],
})
const treeData = shallowRef<ResourceTreeNode[]>()
const loading = ref(false)
const loadingId = ref(0)
watch([
  () => props.type,
  visibleGraphs
], async ([type, graphs]) => {
  loading.value = true
  loadingId.value++
  let result: ResourceTreeNode[] = []
  if (type === TreeType.Classes && graphs.length) {
    result = await graphStoreService.getClassesTree(graphs)
  } else {
    treeData.value = []
  }
  if (loadingId.value === loadingId.value) {
    treeData.value = result
    loading.value = false
  }
}, { immediate: true, deep: true })

</script>

<template>
  <div>
    <div
      v-if="loading"
      class="flex justify-start p-2 gap-2"
    >
      <div>
        <ProgressSpinner style="width: 1.5rem; height: 1.5rem" />
      </div>
      <div class="text-surface-600">Loading ...</div>
    </div>
    <Tree
      v-model:selectionKeys="selectedKeys"
      :value="treeData"
      selectionMode="single"
      class="w-full"
    >
      <template #default="slotProps">
        <div v-tooltip="slotProps.node.key">
          <span :class="{ 'font-semibold': slotProps.node.data.graph === selectedOntology?.node?.value }">
            {{ slotProps.node.label }}
          </span>
        </div>
      </template>
    </Tree>
  </div>
</template>