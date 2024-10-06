<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { TreeItem, TreeRoot } from 'radix-vue'
import { ChevronDown, ChevronRight } from 'lucide-vue-next'
import graphStoreService from '@/services/GraphStoreService';
import axios from 'axios';

interface TreeNode {
  title: string
  uri: string
  icon?: string
  children?: TreeNode[]
}

const items = ref<TreeNode[]>([]);
const selected = defineModel<string>();
const selectedNode = computed({
  get: () => ([{ uri: selected.value }]),
  set: (value: TreeNode) => selected.value = value.uri,
});

const buildTree = (parent: string) => {
  const subClasses = graphStoreService.getSubClasses(parent);
  return subClasses.map<TreeNode>((subClass: string) => {
    const childNodes: TreeNode[] = buildTree(subClass);
    return {
      title: graphStoreService.getLabel(subClass),
      uri: subClass,
      children: childNodes.length ? childNodes : undefined,
    } satisfies TreeNode;
  });
};

onMounted(async () => {
  const turtleContent = (await axios.get<string>('https://w3c-lbd-cg.github.io/bot/bot.ttl')).data;
  graphStoreService.loadOntology(turtleContent);
  const rootClasses = graphStoreService.getRootClasses();
  items.value = rootClasses.map<TreeNode>((root) => {
    const children = buildTree(root);
    return {
      title: graphStoreService.getLabel(root),
      uri: root,
      children: children.length ? children : undefined,
    };
  });
});
</script>

<template>
  <TreeRoot
    v-model="selectedNode"
    v-slot="{ flattenItems }"
    class="list-none select-none w-64 bg-white text-blackA11 rounded-lg p-2 text-sm font-medium"
    :items="items"
    :get-key="(item) => item.uri"
  >
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
      <div
        v-else
        class="h-4 w-4"
      ></div>
      <div class="pl-2 flex-1 overflow-hidden">
        <div :class="`truncate ${item.value.uri === selected ? '' : 'text-muted-foreground '}`">{{
          item.value.title }}
        </div>
        <div
          v-if="item.value.uri"
          class="text-xs text-muted-foreground truncate"
        >{{ item.value.uri }}</div>
      </div>
    </TreeItem>
  </TreeRoot>
</template>