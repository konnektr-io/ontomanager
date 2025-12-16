<script setup lang="ts" generic="TData extends TreeDataItem">
import { computed } from 'vue'
import type { TreeDataItem } from './TreeView.vue'
import TreeNode from './TreeNode.vue'
import TreeLeaf from './TreeLeaf.vue'

interface Props {
    data: TData[] | TData
    selectedItemId?: string
    expandedItemIds: string[]
    defaultNodeIcon?: any
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

const dataArray = computed(() => {
    return props.data instanceof Array ? props.data : [props.data]
})

/* eslint-disable @typescript-eslint/no-explicit-any */
/* 
 * Note: The slot prop type warnings in the template below are a known limitation
 * of Vue's TypeScript support with generic components. The types are correctly
 * enforced at runtime through Vue's slot mechanism.
 */
</script>

<template>
    <div
        role="tree"
        :class="props.class"
    >
        <ul>
            <li
                v-for="item in dataArray"
                :key="item.id"
            >
                <TreeNode
                    v-if="item.children"
                    :item="item"
                    :selected-item-id="selectedItemId"
                    :expanded-item-ids="expandedItemIds"
                    :default-node-icon="defaultNodeIcon"
                    :default-leaf-icon="defaultLeafIcon"
                    :dragged-item="draggedItem"
                    @select-change="(e: TData | undefined) => emit('selectChange', e)"
                    @drag-start="(e: TData) => emit('dragStart', e)"
                    @drop="(e: TData) => emit('drop', e)"
                >
                    <template #actions="{ item, isSelected }">
                        <slot
                            name="actions"
                            :item="item"
                            :is-selected="isSelected"
                        />
                    </template>
                </TreeNode>
                <TreeLeaf
                    v-else
                    :item="item"
                    :selected-item-id="selectedItemId"
                    :default-leaf-icon="defaultLeafIcon"
                    :dragged-item="draggedItem"
                    @select-change="(e: TData | undefined) => emit('selectChange', e)"
                    @drag-start="(e: TData) => emit('dragStart', e)"
                    @drop="(e: TData) => emit('drop', e)"
                >
                    <template #actions="{ item: leafItem, isSelected: leafIsSelected }">
                        <slot
                            name="actions"
                            :item="leafItem"
                            :is-selected="leafIsSelected"
                        />
                    </template>
                </TreeLeaf>
            </li>
        </ul>
    </div>
</template>
