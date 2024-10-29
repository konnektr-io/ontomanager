<script setup lang="ts">
import { ref, computed, watch, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'
import { DataFactory } from 'n3'
import Button from 'primevue/button'
import Menu, { type MenuProps } from 'primevue/menu'
import Tree from 'primevue/tree'
import ProgressSpinner from 'primevue/progressspinner'
import { TreeType, useGraphStore, type ResourceTreeNode } from '@/stores/graph'
import graphStoreService from '@/services/GraphStoreService'
import { vocab } from '@/utils/vocab'


const props = defineProps<{
  type: TreeType;
}>()

const {
  reloadTrigger,
  visibleGraphs,
  selectedOntology,
  selectedResource,
} = storeToRefs(useGraphStore())

const {
  removeQuad,
  addQuad,
} = useGraphStore()

const selectedKeys = computed({
  get: () => ({ ...selectedResource.value && { [selectedResource.value]: true } }),
  set: (value: { [uri: string]: boolean }) => selectedResource.value = Object.keys(value)[0],
})

const classesTree = shallowRef<ResourceTreeNode[]>([])
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
const decompositionTree = shallowRef<ResourceTreeNode[]>([])
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
const propertiesTree = shallowRef<ResourceTreeNode[]>([])
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
const individualsTree = shallowRef<ResourceTreeNode[]>([])
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

watch(reloadTrigger, async () => {
  if (props.type === TreeType.Classes) {
    await loadClassesTree()
  } else if (props.type === TreeType.Decomposition) {
    await loadDecompositionTree()
  } else if (props.type === TreeType.Properties) {
    await loadPropertiesTree()
  } else if (props.type === TreeType.Individuals) {
    await loadIndividualsTree()
  }
})

const contextMenuRefs = ref<{ [key: string]: InstanceType<typeof Menu> }>({})
const contextMenuItems = [
  {
    label: 'Add class',
    icon: 'pi pi-plus',
    command: (event: { originalEvent: Event; item: any }) => {
      // TODO
    },
  },
  {
    label: 'Remove',
    icon: 'pi pi-trash',
    command: (event: { originalEvent: Event; item: any }) => {
      // TODO
    },
  }
]
const toggleMenu = (event: Event, key: string) => {
  contextMenuRefs.value[key]?.toggle(event)
}

const onDragStart = (event: DragEvent, sourceId: string, parentId: string) => {
  if (!event.dataTransfer || !event.target) return
  const data = `${sourceId}|${parentId}`
  event.dataTransfer?.setData('text/plain', data)
}

const onDragOver = (event: DragEvent, targetUri?: string) => {
  if (!event.dataTransfer) return
  const data = event.dataTransfer.getData('text/plain')
  const [sourceUri, parentUri] = data.split('|')
  if (sourceUri === targetUri || parentUri === targetUri) return

  event.dataTransfer.dropEffect = 'move'
}

const onDrop = async (event: DragEvent, targetUri?: string) => {
  if (props.type !== TreeType.Classes && props.type !== TreeType.Properties) return
  if (!event.dataTransfer || !event.target) return
  const data = event.dataTransfer.getData('text/plain')
  const [sourceUri, parentUri] = data.split('|')
  if (sourceUri === targetUri || parentUri === targetUri) return

  if (!selectedOntology.value?.node) {
    console.warn('No ontology selected')
    return
  }

  const childParentPedicate = props.type === TreeType.Classes ? vocab.rdfs.subClassOf : vocab.rdfs.subPropertyOf

  await removeQuad(DataFactory.quad(
    DataFactory.namedNode(sourceUri),
    childParentPedicate,
    DataFactory.namedNode(parentUri),
    selectedOntology.value.node
  ))

  if (targetUri) {
    await addQuad(DataFactory.quad(
      DataFactory.namedNode(sourceUri),
      childParentPedicate,
      DataFactory.namedNode(targetUri),
      selectedOntology.value.node
    ))
  }

  if (props.type === TreeType.Classes) {
    await loadClassesTree()
  } else if (props.type === TreeType.Properties) {
    await loadPropertiesTree()
  }
}
</script>

<template>
  <div
    class="h-full"
    @dragover.prevent="onDragOver"
    @drop.prevent="$event => onDrop($event)"
  >
    <!-- <div
      v-if="loading"
      class="flex justify-start p-2 gap-2"
    >
      <div>
        <ProgressSpinner style="width: 1.5rem; height: 1.5rem" />
      </div>
      <div class="text-surface-600">Loading ...</div>
    </div> -->
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
      :loading="loading"
    >
      <template #default="slotProps">
        <div class="flex w-full justify-between items-center">
          <div
            :id="slotProps.node.key"
            v-tooltip="slotProps.node.key"
            :draggable="slotProps.node.data.graph === selectedOntology?.node?.value && (props.type === TreeType.Classes || props.type === TreeType.Properties)"
            @dragstart="$event => onDragStart($event, slotProps.node.key, slotProps.node.data.parentUri)"
            @dragenter.prevent
            @dragleave.prevent
            @dragover.prevent="$event => onDragOver($event, slotProps.node.key)"
            @drop.prevent="$event => onDrop($event, slotProps.node.key)"
          >
            <span :class="{ 'font-semibold': slotProps.node.data.graph === selectedOntology?.node?.value }">
              {{ slotProps.node.label }}
            </span>
          </div>
          <div>
            <Button
              type="button"
              icon="pi pi-ellipsis-v"
              size="small"
              text
              rounded
              aria-haspopup="true"
              :aria-controls="`overlay_menu_${slotProps.node.key}`"
              @click="event => toggleMenu(event, slotProps.node.key)"
            />
            <Menu
              :ref="el => { contextMenuRefs[slotProps.node.key] = el as unknown as InstanceType<typeof Menu> }"
              :id="`overlay_menu_${slotProps.node.key}`"
              :model="contextMenuItems"
              :popup="true"
            />
          </div>
        </div>
      </template>
    </Tree>
  </div>
</template>