<script setup lang="ts">
import { TreeItem, TreeRoot } from 'radix-vue'
import { ChevronDown, ChevronRight } from 'lucide-vue-next'

const items = [
  {
    title: 'Physical Object',
    children: [
      { title: 'Structure' },
      { title: 'System' },
    ],
  },
  {
    title: 'Spatial Region',
    children: [
      {
        title: 'Zone',
        children: [
          { title: 'Space' },
          { title: 'Site' },
        ],
      },
    ],
  },
  { title: 'Information Object' }
]
</script>

<template>
  <TreeRoot
    v-slot="{ flattenItems }"
    class="list-none select-none w-56 bg-white text-blackA11 rounded-lg p-2 text-sm font-medium"
    :items="items"
    :get-key="(item) => item.title"
  >
    <h2 class="font-semibold !text-base text-blackA11 px-2 pt-1">
      Taxonomy Tree
    </h2>
    <TreeItem
      v-for="item in flattenItems"
      v-slot="{ isExpanded }"
      :key="item._id"
      :style="{ 'padding-left': `${item.level - 0.5}rem` }"
      v-bind="item.bind"
      class="flex items-center py-1 px-2 my-0.5 rounded outline-none focus:ring-grass8 focus:ring-2 data-[selected]:bg-grass4 cursor-pointer"
    >
      <template v-if="item.hasChildren">
        <ChevronRight
          v-if="!isExpanded"
          class="h-4 w-4"
        />
        <ChevronDown
          v-else
          class="h-4 w-4"
        />
      </template>
      <div class="pl-2">
        {{ item.value.title }}
      </div>
    </TreeItem>
  </TreeRoot>
</template>