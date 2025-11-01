<script setup lang="ts" generic="TData extends TreeDataItem">
import { ref, computed, watch } from 'vue'
import { cn } from '@/lib/utils'
import TreeItem from './TreeItem.vue'

export interface TreeDataItem {
    id: string
    name: string
    icon?: any
    selectedIcon?: any
    openIcon?: any
    children?: TreeDataItem[]
    onClick?: () => void
    draggable?: boolean
    droppable?: boolean
    disabled?: boolean
}

interface Props {
    data: TData[] | TData
    initialSelectedItemId?: string
    expandAll?: boolean
    defaultNodeIcon?: any
    defaultLeafIcon?: any
    class?: string
}

const props = withDefaults(defineProps<Props>(), {
    expandAll: false
})

const emit = defineEmits<{
    selectChange: [item: TData | undefined]
    documentDrag: [sourceItem: TData, targetItem: TData]
}>()

const selectedItemId = ref<string | undefined>(props.initialSelectedItemId)
const draggedItem = ref<TData | null>(null)

const handleSelectChange = (item: TData | undefined) => {
    selectedItemId.value = item?.id
    emit('selectChange', item)
}

const handleDragStart = (item: TData) => {
    draggedItem.value = item
}

const handleDrop = (targetItem: TData) => {
    if (draggedItem.value && draggedItem.value.id !== targetItem.id) {
        emit('documentDrag', draggedItem.value, targetItem)
    }
    draggedItem.value = null
}

const expandedItemIds = computed(() => {
    if (!props.initialSelectedItemId) {
        return [] as string[]
    }

    const ids: string[] = []

    function walkTreeItems (items: TData[] | TData, targetId: string): boolean {
        if (items instanceof Array) {
            for (let i = 0; i < items.length; i++) {
                ids.push(items[i]!.id)
                if (walkTreeItems(items[i]!, targetId) && !props.expandAll) {
                    return true
                }
                if (!props.expandAll) ids.pop()
            }
        } else if (!props.expandAll && items.id === targetId) {
            return true
        } else if (items.children) {
            return walkTreeItems(items.children as TData[], targetId)
        }
        return false
    }

    walkTreeItems(props.data, props.initialSelectedItemId)
    return ids
})

// Watch for initialSelectedItemId changes
watch(
    () => props.initialSelectedItemId,
    (newId) => {
        selectedItemId.value = newId
    }
)
</script>

<template>
    <div :class="cn('overflow-hidden relative p-2', props.class)">
        <TreeItem
            :data="data"
            :selected-item-id="selectedItemId"
            :expanded-item-ids="expandedItemIds"
            :default-node-icon="defaultNodeIcon"
            :default-leaf-icon="defaultLeafIcon"
            :dragged-item="draggedItem as TData | null"
            @select-change="handleSelectChange"
            @drag-start="handleDragStart"
            @drop="handleDrop"
        >
            <template #actions="{ item, isSelected }">
                <slot
                    name="actions"
                    :item="item"
                    :is-selected="isSelected"
                />
            </template>
        </TreeItem>
        <div
            class="w-full h-[48px]"
            @drop.prevent="handleDrop({ id: '', name: 'parent_div' } as TData)"
        />
    </div>
</template>
