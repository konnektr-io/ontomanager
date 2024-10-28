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
const classesTreeLoading = ref(false)
const classesTreeLoadingId = ref(0)
const loadClassesTree = async () => {
  const loadingId = classesTreeLoadingId.value = classesTreeLoadingId.value++
  classesTreeLoading.value = true
  const result = await graphStoreService.getClassesTree(visibleGraphs.value)
  if (classesTreeLoadingId.value === loadingId) {
    classesTree.value = result
    classesTreeLoading.value = false
  }
}
const decompositionTree = shallowRef<ResourceTreeNode[]>()
const decompositionTreeLoading = ref(false)
const decompositionTreeLoadingId = ref(0)
const loadDecompositionTree = async () => {
  const loadingId = decompositionTreeLoadingId.value = decompositionTreeLoadingId.value++
  decompositionTreeLoading.value = true
  const result = await graphStoreService.getDecompositionTree(visibleGraphs.value)
  if (decompositionTreeLoadingId.value === loadingId) {
    decompositionTree.value = result
    decompositionTreeLoading.value = false
  }
}
const propertiesTree = shallowRef<ResourceTreeNode[]>()
const propertiesTreeLoading = ref(false)
const propertiesTreeLoadingId = ref(0)
const loadPropertiesTree = async () => {
  const loadingId = propertiesTreeLoadingId.value = propertiesTreeLoadingId.value++
  propertiesTreeLoading.value = true
  const result = await graphStoreService.getPropertiesTree(visibleGraphs.value)
  if (propertiesTreeLoadingId.value === loadingId) {
    propertiesTree.value = result
    propertiesTreeLoading.value = false
  }
}
const individualsTree = shallowRef<ResourceTreeNode[]>()
const individualsTreeLoading = ref(false)
const individualsTreeLoadingId = ref(0)
const loadIndividualsTree = async () => {
  const loadingId = individualsTreeLoadingId.value = individualsTreeLoadingId.value++
  individualsTreeLoading.value = true
  const result = await graphStoreService.getIndividualsTree(visibleGraphs.value)
  if (individualsTreeLoadingId.value === loadingId) {
    individualsTree.value = result
    individualsTreeLoading.value = false
  }
}
const treeData = computed(() => {
  if (props.type === TreeType.Classes) {
    return classesTree.value
  }
  if (props.type === TreeType.Decomposition) {
    return decompositionTree.value
  }
  if (props.type === TreeType.Properties) {
    return propertiesTree.value
  }
  if (props.type === TreeType.Individuals) {
    return individualsTree.value
  }
  return []
})

const loading = computed(() => {
  if (props.type === TreeType.Classes) {
    return classesTreeLoading.value
  }
  if (props.type === TreeType.Decomposition) {
    return decompositionTreeLoading.value
  }
  if (props.type === TreeType.Properties) {
    return propertiesTreeLoading.value
  }
  if (props.type === TreeType.Individuals) {
    return individualsTreeLoading.value
  }
  return false
})

watch(visibleGraphs, async () => {
  if (props.type === TreeType.Classes) {
    await loadClassesTree()
    loadDecompositionTree()
    loadPropertiesTree()
    loadIndividualsTree()
  } else if (props.type === TreeType.Decomposition) {
    await loadDecompositionTree()
    loadClassesTree()
    loadPropertiesTree()
    loadIndividualsTree()
  } else if (props.type === TreeType.Properties) {
    await loadPropertiesTree()
    loadClassesTree()
    loadDecompositionTree()
    loadIndividualsTree()
  } else if (props.type === TreeType.Individuals) {
    await loadIndividualsTree()
    loadClassesTree()
    loadDecompositionTree()
    loadPropertiesTree()
  }
}, { immediate: true, deep: true })

const onDragStart = (event: DragEvent) => {
  if (!event.dataTransfer || !event.target) return
  event.dataTransfer?.setData('text', (event.target as EventTarget & { id: string }).id)
  event.dataTransfer.dropEffect = 'move'
}

const onDrop = (event: DragEvent) => {
  if (!event.dataTransfer || !event.target) return
  const source = event.dataTransfer.getData('text')
  const target = (event.target as EventTarget & { id: string }).id
  console.log('onDrop', source, target)
}

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
    <div
      v-if="!treeData?.length && !loading"
      class="flex justify-start p-2 gap-2"
    >
      <div class="text-surface-600">No data</div>
    </div>
    <Tree
      v-else
      v-model:selectionKeys="selectedKeys"
      :value="treeData"
      selectionMode="single"
      class="w-full"
    >
      <template #default="slotProps">
        <div
          :id="slotProps.node.key"
          v-tooltip="slotProps.node.key"
          draggable
          @dragstart="onDragStart"
          @dragenter.prevent
          @dragleave.prevent
          @dragover.prevent
          @drop.prevent="onDrop"
        >
          <span :class="{ 'font-semibold': slotProps.node.data.graph === selectedOntology?.node?.value }">
            {{ slotProps.node.label }}
          </span>
        </div>
      </template>
    </Tree>
  </div>
</template>