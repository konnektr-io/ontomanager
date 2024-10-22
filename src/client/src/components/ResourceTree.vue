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
watch([
  () => props.type,
  userGraphs
], async () => {
  loading.value = true
  if (props.type === TreeType.Classes) {
    treeData.value = await graphStoreService.getClassesTree(visibleGraphs.value)
  } else {
    treeData.value = []
  }
  loading.value = false
}, { immediate: true, deep: true })

</script>

<template>
  <div>
    <ProgressSpinner
      v-if="loading"
      style="width: 1rem; height: 1rem"
    />
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