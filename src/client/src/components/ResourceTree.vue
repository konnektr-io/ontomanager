<script setup lang="ts">
import { ref, computed, watch, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'
import { DataFactory } from 'n3'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Menu from 'primevue/menu'
import Tree from 'primevue/tree'
import { useConfirm } from 'primevue/useconfirm'
import { TreeType, useGraphStore, type ResourceTreeNode } from '@/stores/graph'
import graphStoreService from '@/services/GraphStoreService'
import { vocab } from '@/utils/vocab'
import { useDialog } from 'primevue/usedialog'
import NewResourceDialog from './NewResourceDialog.vue'


const props = defineProps<{
  type: TreeType;
}>()

const confirm = useConfirm()

const {
  reloadTrigger,
  visibleGraphs,
  selectedOntology,
  selectedResource,
} = storeToRefs(useGraphStore())
const scopeId = computed(() => selectedOntology.value?.scopeId)

const {
  removeClass,
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
const ontologiesTree = shallowRef<ResourceTreeNode[]>([])
const ontologiesTreeLoading = ref(false)
const ontologiesTreeLoadingId = ref(0)
const loadOntologiesTree = async () => {
  const loadingId = ontologiesTreeLoadingId.value = ontologiesTreeLoadingId.value++
  ontologiesTreeLoading.value = true
  const result = await graphStoreService.getOntologies(visibleGraphs.value)
  if (ontologiesTreeLoadingId.value === loadingId) {
    ontologiesTree.value = result
    ontologiesTreeLoading.value = false
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
  if (props.type === TreeType.Ontologies) {
    return ontologiesTree.value
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
  if (props.type === TreeType.Ontologies) {
    return ontologiesTreeLoading.value
  }
  return false
})

const loadByPriority = async () => {
  if (props.type === TreeType.Classes) {
    await loadClassesTree()
    loadDecompositionTree()
    loadPropertiesTree()
    loadIndividualsTree()
    loadOntologiesTree()
  } else if (props.type === TreeType.Decomposition) {
    await loadDecompositionTree()
    loadClassesTree()
    loadPropertiesTree()
    loadIndividualsTree()
    loadOntologiesTree()
  } else if (props.type === TreeType.Properties) {
    await loadPropertiesTree()
    loadClassesTree()
    loadDecompositionTree()
    loadIndividualsTree()
    loadOntologiesTree()
  } else if (props.type === TreeType.Individuals) {
    await loadIndividualsTree()
    loadClassesTree()
    loadDecompositionTree()
    loadPropertiesTree()
    loadOntologiesTree()
  } else if (props.type === TreeType.Ontologies) {
    await loadOntologiesTree()
    loadIndividualsTree()
    loadClassesTree()
    loadDecompositionTree()
    loadPropertiesTree()
  }
}

watch(visibleGraphs, loadByPriority, { immediate: true, deep: true })

watch(reloadTrigger, loadByPriority)

const dialog = useDialog()

const openNewResourceDialog = (parentUri?: string) => {
  dialog.open(NewResourceDialog, {
    props: {
      header: `New ${props.type === TreeType.Individuals ? 'Individual' : props.type === TreeType.Classes ? 'Class' : 'Property'}`,
      style: {
        width: '50vw',
      },
      breakpoints: {
        '960px': '75vw',
        '640px': '90vw'
      },
      modal: true
    },
    data: {
      parentUri,
      type: props.type,
      graphId: selectedOntology.value?.node?.value
    }
  })
}

const contextMenuRefs = ref<{ [key: string]: InstanceType<typeof Menu> }>({})
const contextMenuItems = computed(() => [
  {
    label: `Add ${props.type === TreeType.Classes ? 'Class' : 'Property'}`,
    icon: 'pi pi-plus',
    visible: () => props.type === TreeType.Classes || props.type === TreeType.Properties,
    command: () => {
      openNewResourceDialog(contextMenuItemId.value)
    },
  },
  {
    label: 'Remove',
    icon: 'pi pi-trash',
    visible: () => (selectedOntology.value?.node?.value ? (contextMenuItemId.value.startsWith(selectedOntology.value.node.value) && (props.type === TreeType.Classes || props.type === TreeType.Properties)) : false),
    command: () => {
      confirm.require({
        header: `Delete ${props.type === TreeType.Classes ? 'Class' : 'Property'}`,
        message: `Deleting ${props.type === TreeType.Classes ? 'class' : 'property'} from currently selected graph. Do you want to proceed?`,
        icon: 'pi pi-exclamation-triangle',
        modal: false,
        rejectProps: {
          label: 'Cancel',
          severity: 'secondary',
          text: true
        },
        acceptProps: {
          label: 'Delete',
          outlined: true
        },
        accept: async () => {
          if (!selectedOntology.value?.node) {
            console.warn('No ontology selected')
            return
          }
          if (!scopeId.value) {
            console.warn('No scopeId selected')
            return
          }
          await removeClass(contextMenuItemId.value, selectedOntology.value.node, scopeId.value)
          loadByPriority()
        },
        reject: () => {
        }
      })
    },
  }
])
const contextMenuItemId = ref('')
const toggleMenu = (event: Event, key: string) => {
  contextMenuItemId.value = key
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

  if (!scopeId.value) {
    console.warn('No scopeId selected')
    return
  }

  const childParentPedicate = props.type === TreeType.Classes ? vocab.rdfs.subClassOf : vocab.rdfs.subPropertyOf

  await removeQuad(DataFactory.quad(
    DataFactory.namedNode(sourceUri),
    childParentPedicate,
    DataFactory.namedNode(parentUri),
    selectedOntology.value.node
  ), scopeId.value)

  if (targetUri) {
    await addQuad(DataFactory.quad(
      DataFactory.namedNode(sourceUri),
      childParentPedicate,
      DataFactory.namedNode(targetUri),
      selectedOntology.value.node
    ), scopeId.value)
  }

  if (props.type === TreeType.Classes) {
    await loadClassesTree()
  } else if (props.type === TreeType.Properties) {
    await loadPropertiesTree()
  }
}

const showLoadOntologyPage = () => {
  selectedResource.value = null
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
      v-if="type === TreeType.Ontologies && selectedResource"
      class="flex justify-start pl-2 pt-2"
    >
      <Button
        type="button"
        icon="pi pi-plus"
        label="Create or import ontology"
        text
        @click="showLoadOntologyPage"
      ></Button>
    </div>
    <div
      v-else-if="(type === TreeType.Classes || type === TreeType.Properties) && selectedOntology"
      class="flex justify-start pl-2 pt-2"
    >
      <Button
        type="button"
        icon="pi pi-plus"
        :label="`New ${type === TreeType.Classes ? 'Class' : 'Property'}`"
        text
        @click="openNewResourceDialog()"
      ></Button>
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
      class="w-full flex-auto pb-0"
      pt:wrapper:class="h-full"
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
              v-if="selectedOntology && (type === TreeType.Individuals || type === TreeType.Classes || type === TreeType.Properties)"
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
              :id="slotProps.node.key"
              :model="contextMenuItems"
              :popup="true"
            />
          </div>
        </div>
      </template>
    </Tree>

  </div>
</template>