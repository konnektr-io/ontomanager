<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { TreeType, useGraphStore } from '@/stores/graph'
import Button from 'primevue/button'
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import ResourceTree from '@/components/ResourceTree.vue'
import ResourceViewer from '@/components/ResourceViewer.vue'

const { selectedResource } = storeToRefs(useGraphStore())
const route = useRoute()
const router = useRouter()
watch(() => route.params, () => {
  if (!route.query.uri) {
    selectedResource.value = undefined
  } else {
    selectedResource.value = route.query.uri.toString()
  }
}, { immediate: true })
watch(selectedResource, (value, oldValue) => {
  if (value !== oldValue && route.query.uri !== value) {
    router.push({ query: { uri: value } })
  }
})

const drawerExpanded = ref(false)
const drawerPinned = ref(false)
const activeTreeType = ref(TreeType.Classes)

const navigationItems = [
  { icon: 'pi pi-box', title: 'Classes', value: TreeType.Classes },
  { icon: 'pi pi-sitemap', title: 'Decomposition', value: TreeType.Decomposition },
  { icon: 'pi pi-link', title: 'Properties', value: TreeType.Properties },
  { icon: 'pi pi-user', title: 'Individuals', value: TreeType.Individuals },
]

const selectTreeType = (type: TreeType) => {
  activeTreeType.value = type
}

const expandDrawer = () => {
  if (!drawerPinned.value) {
    drawerExpanded.value = true
  }
}

const collapseDrawer = () => {
  if (!drawerPinned.value) {
    drawerExpanded.value = false
  }
}

const toggleDrawer = () => {
  drawerPinned.value = !drawerPinned.value
  drawerExpanded.value = drawerPinned.value
}

const { initialize } = useGraphStore()
onMounted(initialize)
</script>

<template>
  <div class="flex h-full">
    <!-- Navigation Drawer -->
    <div
      class="flex flex-col justify-between bg-surface-100 transition-all duration-300 ease-in-out"
      :class="{ 'w-56': drawerExpanded, 'w-10': !drawerExpanded }"
      @mouseenter="expandDrawer"
      @mouseleave="collapseDrawer"
    >
      <ul class="list-none">
        <li
          v-for="item in navigationItems"
          :key="item.value"
        >
          <Button
            :icon="item.icon"
            :label="drawerExpanded ? item.title : ''"
            text
            :pt:label:class="{
              'font-semibold': activeTreeType === item.value,
              'font-normal': activeTreeType !== item.value
            }"
            :class="{
              'text-slate-700': activeTreeType === item.value
            }"
            @click="selectTreeType(item.value)"
          />
        </li>
      </ul>
      <div>
        <Button
          icon="pi pi-angle-double-left"
          text
          :class="{ 'rotate-180': drawerPinned }"
          @click="toggleDrawer"
        />
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-grow">
      <Splitter
        :gutter-size="1"
        class="h-full border-y-0 border-r-0 rounded-none"
      >
        <SplitterPanel
          :size="25"
          :min-size="10"
          class="bg-surface-0 overflow-auto"
        >
          <ResourceTree :type="activeTreeType" />
        </SplitterPanel>
        <SplitterPanel
          :size="75"
          class="bg-surface-0 overflow-auto"
        >
          <ResourceViewer v-if="selectedResource" />
          <div v-else>
            Nothing selected
          </div>
        </SplitterPanel>
      </Splitter>
    </div>
  </div>
</template>
<style scoped>
.p-button.p-button-text:not(.p-disabled):hover {
  background: rgba(var(--p-primary-color), 0);
  color: var(--primary-color);
}
</style>