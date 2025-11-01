<script setup lang="ts">
import { ref, computed, watch, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'
import { DataFactory } from 'n3'
import { TreeType, useGraphStore, type ResourceTreeNode } from '@/stores/graph'
import graphStoreService from '@/services/GraphStoreService'
import { vocab } from '@/utils/vocab'
import { TreeView, type TreeDataItem } from '@/components/ui/tree'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import NewResourceDialog from './NewResourceDialog.vue'
import { MoreVertical, Plus } from 'lucide-vue-next'

const props = defineProps<{
    type: TreeType;
}>()

const {
    reloadTrigger,
    visibleGraphs,
    selectedOntology,
    selectedResource,
} = storeToRefs(useGraphStore())
const scopeId = computed(() => selectedOntology.value?.scopeId)

const {
    removeNode,
    removeQuad,
    addQuad,
} = useGraphStore()

// Tree data loading
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

// Convert ResourceTreeNode to TreeDataItem
interface ExtendedTreeDataItem extends TreeDataItem {
    data: {
        parentUri?: string
        graph: string
    }
    belongsToSelectedGraph?: boolean
}

// Memoized conversion with selected ontology value
const selectedGraphNodeValue = computed(() => selectedOntology.value?.node?.value)

const convertToTreeDataItems = (nodes: ResourceTreeNode[], selectedGraphValue: string | undefined): ExtendedTreeDataItem[] => {
    return nodes.map(node => {
        const belongsToSelected = node.data.graph === selectedGraphValue
        return {
            id: node.key,
            name: node.label,
            icon: node.icon,
            data: node.data,
            children: node.children?.length ? convertToTreeDataItems(node.children, selectedGraphValue) : undefined,
            draggable: belongsToSelected && (props.type === TreeType.Classes || props.type === TreeType.Properties),
            droppable: true,
            belongsToSelectedGraph: belongsToSelected,
        }
    })
}

const treeDataItems = computed(() => convertToTreeDataItems(treeData.value, selectedGraphNodeValue.value))

// Selection handling
const handleSelectChange = (item: ExtendedTreeDataItem | undefined) => {
    selectedResource.value = item?.id || null
}

// New resource dialog
const newResourceDialogOpen = ref(false)
const newResourceParentUri = ref<string | undefined>(undefined)

const openNewResourceDialog = (parentUri?: string) => {
    newResourceParentUri.value = parentUri
    newResourceDialogOpen.value = true
}

// Context menu handling
const contextMenuItemId = ref('')

const canAddSubresource = computed(() =>
    props.type === TreeType.Individuals ||
    props.type === TreeType.Classes ||
    props.type === TreeType.Properties
)

const canRemove = computed(() => {
    if (!selectedOntology.value?.node?.value || !contextMenuItemId.value) return false
    return contextMenuItemId.value.startsWith(selectedOntology.value.node.value) && canAddSubresource.value
})

const resourceTypeName = computed(() => {
    if (props.type === TreeType.Individuals) return 'Individual'
    if (props.type === TreeType.Classes) return 'Class'
    if (props.type === TreeType.Properties) return 'Property'
    return ''
})

const resourceTypeNameLower = computed(() => resourceTypeName.value.toLowerCase())
const subresourceName = computed(() => {
    if (props.type === TreeType.Individuals) return 'Individual'
    if (props.type === TreeType.Classes) return 'Subclass'
    if (props.type === TreeType.Properties) return 'Subproperty'
    return ''
})

// Delete confirmation
const deleteDialogOpen = ref(false)

const handleDelete = async () => {
    if (!selectedOntology.value?.node || !scopeId.value) {
        console.warn('No ontology selected')
        return
    }

    await removeNode(contextMenuItemId.value, selectedOntology.value.node, scopeId.value)
    loadByPriority()
    deleteDialogOpen.value = false
}

// Drag and drop
const draggedItemData = ref<{ sourceId: string, parentId: string } | null>(null)

const handleDragStart = (item: ExtendedTreeDataItem) => {
    draggedItemData.value = {
        sourceId: item.id,
        parentId: item.data.parentUri || ''
    }
}

const handleDrop = async (targetItem: ExtendedTreeDataItem) => {
    if (props.type !== TreeType.Classes && props.type !== TreeType.Properties) return
    if (!draggedItemData.value) return

    const { sourceId, parentId } = draggedItemData.value
    const targetUri = targetItem.id

    if (sourceId === targetUri || parentId === targetUri) {
        draggedItemData.value = null
        return
    }

    if (!selectedOntology.value?.node || !scopeId.value) {
        console.warn('No ontology selected')
        draggedItemData.value = null
        return
    }

    const childParentPredicate = props.type === TreeType.Classes ? vocab.rdfs.subClassOf : vocab.rdfs.subPropertyOf

    await removeQuad(DataFactory.quad(
        DataFactory.namedNode(sourceId),
        childParentPredicate,
        DataFactory.namedNode(parentId),
        selectedOntology.value.node
    ), scopeId.value)

    if (targetUri) {
        await addQuad(DataFactory.quad(
            DataFactory.namedNode(sourceId),
            childParentPredicate,
            DataFactory.namedNode(targetUri),
            selectedOntology.value.node
        ), scopeId.value)
    }

    draggedItemData.value = null

    if (props.type === TreeType.Classes) {
        await loadClassesTree()
    } else if (props.type === TreeType.Properties) {
        await loadPropertiesTree()
    }
}

const handleDropOnBackground = async () => {
    if (props.type !== TreeType.Classes && props.type !== TreeType.Properties) return
    if (!draggedItemData.value) return

    const { sourceId, parentId } = draggedItemData.value

    if (!selectedOntology.value?.node || !scopeId.value) {
        console.warn('No ontology selected')
        draggedItemData.value = null
        return
    }

    const childParentPredicate = props.type === TreeType.Classes ? vocab.rdfs.subClassOf : vocab.rdfs.subPropertyOf

    await removeQuad(DataFactory.quad(
        DataFactory.namedNode(sourceId),
        childParentPredicate,
        DataFactory.namedNode(parentId),
        selectedOntology.value.node
    ), scopeId.value)

    draggedItemData.value = null

    if (props.type === TreeType.Classes) {
        await loadClassesTree()
    } else if (props.type === TreeType.Properties) {
        await loadPropertiesTree()
    }
}

const showLoadOntologyPage = () => {
    selectedResource.value = null
}

// Filter functionality
const filterValue = ref('')
const filterExpandedKeys = ref<string[]>([])

const filterNodes = (nodes: ResourceTreeNode[], value: string): string[] => {
    let keys: string[] = []
    for (const node of nodes) {
        if (node.label.toLowerCase().includes(value.toLowerCase())) {
            keys.push(node.key)
        }
        if (node.children) {
            const childKeys = filterNodes(node.children, value)
            if (childKeys.length) {
                keys.push(node.key)
                keys.push(...childKeys)
            }
        }
    }
    return keys
}

const onFilterInput = () => {
    if (filterValue.value.length > 2) {
        filterExpandedKeys.value = filterNodes(treeData.value, filterValue.value)
    } else {
        filterExpandedKeys.value = []
    }
}
</script>

<template>
    <div
        class="h-full flex flex-col bg-background"
        @dragover.prevent
        @drop.prevent="handleDropOnBackground"
    >
        <!-- Action buttons -->
        <div
            v-if="type === TreeType.Ontologies && selectedResource"
            class="flex justify-start pl-2 pt-2"
        >
            <Button
                variant="ghost"
                size="sm"
                @click="showLoadOntologyPage"
            >
                <Plus class="h-4 w-4 mr-2" />
                Create or import ontology
            </Button>
        </div>
        <div
            v-else-if="(type === TreeType.Classes || type === TreeType.Properties) && selectedOntology"
            class="flex justify-start pl-2 pt-2"
        >
            <Button
                variant="ghost"
                size="sm"
                @click="openNewResourceDialog()"
            >
                <Plus class="h-4 w-4 mr-2" />
                New {{ type === TreeType.Classes ? 'Class' : 'Property' }}
            </Button>
        </div>

        <!-- Filter input -->
        <div
            v-if="treeDataItems.length"
            class="px-2 pt-2"
        >
            <Input
                v-model="filterValue"
                placeholder="Filter..."
                class="h-8"
                @input="onFilterInput"
            />
        </div>

        <!-- Empty state -->
        <div
            v-if="!treeDataItems.length && !loading"
            class="flex justify-start p-2 gap-2"
        >
            <div class="text-muted-foreground">No data</div>
        </div>

        <!-- Tree -->
        <div
            v-else
            class="flex-1 overflow-auto p-2"
        >
            <TreeView
                :data="treeDataItems"
                :initial-selected-item-id="selectedResource || undefined"
                :initial-expanded-item-ids="filterExpandedKeys"
                @select-change="handleSelectChange"
                @drag-start="handleDragStart"
                @drop="handleDrop"
            >
                <template #actions="{ item, isSelected }">
                    <Dialog v-if="selectedOntology && canAddSubresource">
                        <AlertDialog v-model:open="deleteDialogOpen">
                            <DropdownMenu>
                                <DropdownMenuTrigger as-child>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        class="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        :class="{ 'opacity-100': isSelected }"
                                        @click.stop="contextMenuItemId = item.id"
                                    >
                                        <MoreVertical class="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="start"
                                    class="cursor-pointer"
                                    @click.stop
                                >
                                    <DialogTrigger as-child>
                                        <DropdownMenuItem
                                            class="cursor-pointer"
                                            @click.stop="openNewResourceDialog(item.id)"
                                        >
                                            <Plus class="h-4 w-4 mr-2" />
                                            Add {{ subresourceName }}
                                        </DropdownMenuItem>
                                    </DialogTrigger>
                                    <DropdownMenuItem
                                        v-if="canRemove"
                                        class="text-destructive focus:text-destructive cursor-pointer"
                                        @click.stop="deleteDialogOpen = true"
                                    >
                                        Delete {{ resourceTypeName }}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <AlertDialogContent @click.stop>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete {{ resourceTypeName }}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Deleting {{ resourceTypeNameLower }} from currently selected graph. Do you want
                                        to proceed?
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction @click="handleDelete">
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        <NewResourceDialog
                            v-if="selectedOntology?.node?.value"
                            :parent-uri="newResourceParentUri"
                            :type="type"
                            :graph-id="selectedOntology.node.value"
                            @close="newResourceDialogOpen = false"
                            @created="loadByPriority"
                        />
                    </Dialog>
                </template>
            </TreeView>
        </div>
    </div>
</template>
