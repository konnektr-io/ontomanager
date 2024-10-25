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
  visibleGraphs,
  selectedOntology,
  selectedResource
} = storeToRefs(useGraphStore())

const selectedKeys = computed({
  get: () => ({ ...selectedResource.value && { [selectedResource.value]: true } }),
  set: (value: { [uri: string]: boolean }) => selectedResource.value = Object.keys(value)[0],
})
const classesTree = shallowRef<ResourceTreeNode[]>()
const decompositionTree = shallowRef<ResourceTreeNode[]>()
const treeData = computed(() => {
  if (props.type === TreeType.Classes) {
    return classesTree.value
  }
  if (props.type === TreeType.Decomposition) {
    return decompositionTree.value
  }
  return []
})
const loading = ref(false)
const loadingId = ref(0)
watch(visibleGraphs, async (graphs) => {
  loading.value = true
  loadingId.value++
  await new Promise(resolve => setTimeout(resolve, 2000))
  // First load the the visible treetype, then start preparing the other ones
  if (props.type === TreeType.Classes) {
    const classesTreeResult = await graphStoreService.getClassesTree(graphs)
    if (loadingId.value === loadingId.value) {
      classesTree.value = classesTreeResult
      loading.value = false
    }
    const decompositionTreeResult = await graphStoreService.getDecompositionTree(graphs)
    if (loadingId.value === loadingId.value) {
      decompositionTree.value = decompositionTreeResult
    }
  } else if (props.type === TreeType.Decomposition) {
    const decompositionTreeResult = await graphStoreService.getDecompositionTree(graphs)
    if (loadingId.value === loadingId.value) {
      decompositionTree.value = decompositionTreeResult
      loading.value = false
    }
    const classesTreeResult = await graphStoreService.getClassesTree(graphs)
    if (loadingId.value === loadingId.value) {
      classesTree.value = classesTreeResult
    }
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