<script setup lang="ts" generic="TData extends TreeDataItem">
import { ref } from 'vue'
import { cn } from '@/lib/utils'
import type { TreeDataItem } from './TreeView.vue'
import TreeIcon from './TreeIcon.vue'
import TreeActions from './TreeActions.vue'

interface Props {
    item: TData
    selectedItemId?: string
    defaultLeafIcon?: any
    draggedItem: TData | null
    class?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
    selectChange: [item: TData | undefined]
    dragStart: [item: TData]
    drop: [item: TData]
}>()

const isDragOver = ref(false)

const onDragStart = (e: DragEvent) => {
    if (!props.item.draggable || props.item.disabled) {
        e.preventDefault()
        return
    }
    e.dataTransfer?.setData('text/plain', props.item.id)
    emit('dragStart', props.item)
}

const onDragOver = (e: DragEvent) => {
    if (
        props.item.droppable !== false &&
        !props.item.disabled &&
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
    if (props.item.disabled) return
    e.preventDefault()
    isDragOver.value = false
    emit('drop', props.item)
}

const handleClick = () => {
    if (props.item.disabled) return
    emit('selectChange', props.item)
    props.item.onClick?.()
}

const treeVariants =
    'group cursor-pointer rounded-md px-2 transition-colors hover:bg-accent hover:text-accent-foreground'
const selectedTreeVariants = 'bg-accent text-accent-foreground font-medium'
const dragOverVariants = 'bg-primary/20 text-primary-foreground'
</script>

<template>
    <div
        :class="cn(
            'ml-5 flex text-left items-center py-2 cursor-pointer before:right-1',
            treeVariants,
            props.class,
            selectedItemId === item.id && selectedTreeVariants,
            isDragOver && dragOverVariants,
            item.disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
        )
            "
        :draggable="!!item.draggable && !item.disabled"
        @click="handleClick"
        @dragstart="onDragStart"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
    >
        <TreeIcon
            :item="item"
            :is-selected="selectedItemId === item.id"
            :default-icon="defaultLeafIcon"
        />
        <span
            class="flex-grow text-sm truncate"
            :class="{ 'font-semibold': (item as any).belongsToSelectedGraph }"
        >{{ item.name }}</span>
        <TreeActions :is-selected="selectedItemId === item.id && !item.disabled">
            <slot
                name="actions"
                :item="item"
                :is-selected="selectedItemId === item.id && !item.disabled"
            />
        </TreeActions>
    </div>
</template>
