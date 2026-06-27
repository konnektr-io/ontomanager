<script setup lang="ts">
// @ts-nocheck
import { computed } from 'vue'
import type { TreeDataItem } from './TreeView.vue'
import TreeNode from './TreeNode.vue'
import TreeLeaf from './TreeLeaf.vue'

interface Props {
    data: TreeDataItem[] | TreeDataItem
    selectedItemId?: string
    expandedItemIds: string[]
    defaultNodeIcon?: any
    defaultLeafIcon?: any
    draggedItem: TreeDataItem | null
    class?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
    selectChange: [item: TreeDataItem | undefined]
    dragStart: [item: TreeDataItem]
    drop: [item: TreeDataItem]
}>()

const dataArray = computed(() => {
    return props.data instanceof Array ? props.data : [props.data]
})
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
                    @select-change="(item: TreeDataItem | undefined) => emit('selectChange', item)"
                    @drag-start="(item: TreeDataItem) => emit('dragStart', item)"
                    @drop="(item: TreeDataItem) => emit('drop', item)"
                >
                    <template #actions="slotProps">
                         <slot name="actions" v-bind="slotProps" />
                     </template>
                 </TreeNode>
                <TreeLeaf
                    v-else
                    :item="item"
                    :selected-item-id="selectedItemId"
                    :default-leaf-icon="defaultLeafIcon"
                    :dragged-item="draggedItem"
                    @select-change="(item: TreeDataItem | undefined) => emit('selectChange', item)"
                    @drag-start="(item: TreeDataItem) => emit('dragStart', item)"
                    @drop="(item: TreeDataItem) => emit('drop', item)"
                >
                    <template #actions="slotProps">
                         <slot name="actions" v-bind="slotProps" />
                     </template>
                 </TreeLeaf>
            </li>
        </ul>
    </div>
</template>
