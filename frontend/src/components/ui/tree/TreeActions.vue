<script setup lang="ts">
import { cn } from '@/lib/utils'

interface Props {
    isSelected: boolean
}

defineProps<Props>()
</script>

<template>
    <div :class="cn(
        'absolute right-3 group-hover:block',
        $props.isSelected ? 'block' : 'hidden'
    )
        ">
        <slot />
    </div>
</template>
