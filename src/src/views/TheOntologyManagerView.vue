<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { TreeType, useGraphStore } from '@/stores/graph-store'
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import Tabs from 'primevue/tabs'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
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

const tabs = [
  { title: 'Classes', value: TreeType.Classes },
  { title: 'Properties', value: TreeType.Properties },
]

const { initialize } = useGraphStore()
onMounted(initialize)

</script>

<template>
  <Splitter class="h-full">
    <SplitterPanel
      :size="25"
      :minSize="10"
      class="bg-surface-0 h-full overflow-auto"
    >
      <Tabs :value="TreeType.Classes">
        <TabList>
          <Tab
            v-for="tab in tabs"
            :key="tab.title"
            :value="tab.value"
          >{{ tab.title }}</Tab>
        </TabList>
        <TabPanel
          :value="TreeType.Classes"
          header="Classes"
        >
          <ResourceTree :type="TreeType.Classes" />
        </TabPanel>
        <TabPanel
          :value="TreeType.Properties"
          header="Properties"
        >
          <ResourceTree :type="TreeType.Properties" />
        </TabPanel>
      </Tabs>
    </SplitterPanel>
    <SplitterPanel
      :size="75"
      class="bg-surface-0 h-full overflow-auto"
    >
      <ResourceViewer v-if="selectedResource" />
      <div v-else>
        Nothing selected
      </div>
    </SplitterPanel>
  </Splitter>
</template>