<script setup lang="ts">
// @ts-nocheck
import { ref, watch } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { TreeDataItem } from './TreeView.vue'
import TreeItem from './TreeItem.vue'
import TreeIcon from './TreeIcon.vue'
import TreeActions from './TreeActions.vue'

interface Props {
    item: TreeDataItem
    selectedItemId?: string
    expandedItemIds: string[]
    defaultNodeIcon?: any
    defaultLeafIcon?: any
    draggedItem: TreeDataItem | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
    selectChange: [item: TreeDataItem | undefined]
    dragStart: [item: TreeDataItem]
    drop: [item: TreeDataItem]
}>()

const isOpen = ref(props.expandedItemIds.includes(props.item.id))
const isDragOver = ref(false)

watch(
    () => props.expandedItemIds,
    (newIds) => {
        if (newIds.includes(props.item.id)) {
            isOpen.value = true
        }
    },
    { immediate: true }
)

const onDragStart = (e: DragEvent) => {
    if (!props.item.draggable) {
        e.preventDefault()
        return
    }
    e.dataTransfer?.setData('text/plain', props.item.id)
    emit('dragStart', props.item)
}

const onDragOver = (e: DragEvent) => {
    if (
        props.item.droppable !== false &&
        props.draggedItem &&
        props.draggedItem.id !== props.item.id
    ) {
        e.preventDefault()
        isDragOver.value = true
    }
}

const onDragLeave = () => {
    isDragOver.value = false
}

const onDrop = (e: DragEvent) => {
    e.preventDefault()
    isDragOver.value = false
    emit('drop', props.item)
}

const handleClick = () => {
    emit('selectChange', props.item)
    props.item.onClick?.()
}

const treeVariants =
    'group cursor-pointer rounded-md px-2 transition-colors hover:bg-accent hover:text-accent-foreground'
const selectedTreeVariants = 'bg-accent text-accent-foreground font-medium'
const dragOverVariants = 'bg-primary/20 text-primary-foreground'
</script>

<template>
    <Collapsible v-model:open="isOpen">
        <CollapsibleTrigger
            :class="cn(
                'flex flex-1 w-full items-center py-2 transition-all',
                treeVariants,
                selectedItemId === item.id && selectedTreeVariants,
                isDragOver && dragOverVariants
            )
                "
            :draggable="!!item.draggable"
            @click="handleClick"
            @dragstart="onDragStart"
            @dragover="onDragOver"
            @dragleave="onDragLeave"
            @drop="onDrop"
        >
            <ChevronRight :class="cn(
                'h-4 w-4 shrink-0 transition-transform duration-200 text-accent-foreground/50 mr-1',
                isOpen && 'rotate-90'
            )
                " />
            <TreeIcon
                :item="item"
                :is-selected="selectedItemId === item.id"
                :is-open="isOpen"
                :default-icon="defaultNodeIcon"
            />
            <span
                class="text-sm truncate"
                :class="{ 'font-semibold': (item as any).belongsToSelectedGraph }"
            >{{ item.name }}</span>
            <TreeActions :is-selected="selectedItemId === item.id">
                <slot
                    name="actions"
                    :item="item"
                    :is-selected="selectedItemId === item.id"
                />
            </TreeActions>
        </CollapsibleTrigger>
        <CollapsibleContent class="ml-4 pl-1 border-l">
            <TreeItem
                :data="(item.children ?? []) as TreeDataItem[]"
                :selected-item-id="selectedItemId"
                :expanded-item-ids="expandedItemIds"
                :default-leaf-icon="defaultLeafIcon"
                :default-node-icon="defaultNodeIcon"
                :dragged-item="draggedItem"
                @select-change="(item: TreeDataItem | undefined) => emit('selectChange', item)"
                @drag-start="(item: TreeDataItem) => emit('dragStart', item)"
                @drop="(item: TreeDataItem) => emit('drop', item)"
            >
                <template #actions="slotProps">
                     <slot name="actions" v-bind="slotProps" />
                </template>
            </TreeItem>
        </CollapsibleContent>
    </Collapsible>
</template>
