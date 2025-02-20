<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { TreeType, useGraphStore } from '@/stores/graph'
import Button from 'primevue/button'
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import ResourceTree from '@/components/ResourceTree.vue'
import ResourceViewer from '@/components/ResourceViewer.vue'
import LoadOntologyView from '@/views/LoadOntologyView.vue'

const props = defineProps<{
  type: TreeType
}>()

const { selectedResource, userGraphs } = storeToRefs(useGraphStore())
const route = useRoute()
const router = useRouter()
watch(() => route.params, () => {
  if (!route.query.uri) {
    selectedResource.value = null
  } else {
    selectedResource.value = route.query.uri.toString()
  }
}, { immediate: true })
watch(selectedResource, (value, oldValue) => {
  if (value !== oldValue && route.query.uri !== value) {
    router.push({ query: { uri: value || undefined } })
  }
})
watch(() => userGraphs.value, (value) => {
  if (!value.length) {
    selectedResource.value = null
  }
})

const drawerExpanded = ref(true)

const navigationItems = [
  { icon: 'pi pi-box', title: 'Classes', value: TreeType.Classes },
  { icon: 'pi pi-link', title: 'Properties', value: TreeType.Properties },
  { icon: 'pi pi-user', title: 'Individuals', value: TreeType.Individuals },
  { icon: 'pi pi-sitemap', title: 'Decomposition', value: TreeType.Decomposition },
  { icon: 'pi pi-globe', title: 'Ontologies', value: TreeType.Ontologies }
]

const activeTreeType = computed(() => props.type || TreeType.Classes)

const toggleDrawer = () => {
  drawerExpanded.value = !drawerExpanded.value
}

const { initialize } = useGraphStore()
onMounted(initialize)
</script>

<template>
  <div class="flex h-full">
    <!-- Navigation Drawer -->
    <div
      class="flex-none flex flex-col h-full justify-between p-1 bg-surface-100 transition-all duration-300 ease-in-out"
      :class="{ 'w-[192px]': drawerExpanded, 'w-[48px]': !drawerExpanded }"
    >
      <ul class="list-none">
        <li
          v-for="item in navigationItems"
          :key="item.value"
          class="my-1"
        >
          <router-link :to="`/${item.value}`">
            <Button
              :icon="item.icon"
              :label="drawerExpanded ? item.title : undefined"
              text
              :pt:label:class="{
                'font-boldbold': activeTreeType === item.value,
                'font-normal': activeTreeType !== item.value
              }"
              :class="{
                'bg-slate-100': activeTreeType === item.value,
                'text-slate-800': activeTreeType === item.value
              }"
              class="w-full justify-start"
              style="padding-left: var(--p-button-padding-x)"
            >
            </Button>
          </router-link>
        </li>
      </ul>
      <div>
        <Button
          icon="pi pi-angle-double-left"
          text
          :class="{ 'rotate-180': drawerExpanded }"
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
            <LoadOntologyView></LoadOntologyView>
          </div>
        </SplitterPanel>
      </Splitter>
    </div>
  </div>
</template>