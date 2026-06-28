<script setup lang="ts">
import type { TreeDataItem } from './TreeView.vue'

interface Props {
    item: TreeDataItem
    isOpen?: boolean
    isSelected?: boolean
    defaultIcon?: any
}

const props = defineProps<Props>()

const getIcon = () => {
    if (props.isSelected && props.item.selectedIcon) {
        return props.item.selectedIcon
    } else if (props.isOpen && props.item.openIcon) {
        return props.item.openIcon
    } else if (props.item.icon) {
        return props.item.icon
    }
    return props.defaultIcon
}

const Icon = getIcon()
</script>

<template>
    <component
        :is="Icon"
        v-if="Icon"
        class="h-4 w-4 shrink-0 mr-2"
    />
</template>
