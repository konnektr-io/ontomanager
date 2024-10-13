<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia';
import { useGraphStore } from '@/stores/graph-store';
import { useMainStore } from '@/stores/main';
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import Tabs from 'primevue/tabs'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import ClassesTree from '@/components/ClassesTree.vue'
import ClassEditor from '@/components/ClassEditor.vue'

const { selected } = storeToRefs(useMainStore());
const route = useRoute();
const router = useRouter();
watch(() => route.params, () => {
  if (!route.query.uri) {
    selected.value = undefined;
  } else {
    selected.value = route.query.uri.toString();
  }
}, { immediate: true });
watch(selected, (value, oldValue) => {
  if (value !== oldValue && route.query.uri !== value) {
    router.push({ query: { uri: value } });
  }
});

enum TabValue {
  Classes = 'classes',
  Properties = 'properties',
}

const tabs = [
  { title: 'Classes', value: TabValue.Classes },
  { title: 'Properties', value: TabValue.Properties },
]

const { initialize } = useGraphStore();
onMounted(initialize);

</script>

<template>
  <Splitter class="h-full">
    <SplitterPanel
      :size="25"
      :minSize="10"
      class="bg-surface-0 h-full overflow-auto"
    >
      <Tabs :value="TabValue.Classes">
        <TabList>
          <Tab
            v-for="tab in tabs"
            :key="tab.title"
            :value="tab.value"
          >{{ tab.title }}</Tab>
        </TabList>
        <TabPanel
          :value="TabValue.Classes"
          header="Classes"
        >
          <ClassesTree />
        </TabPanel>
        <TabPanel
          :value="TabValue.Properties"
          header="Properties"
        >
          Not implemented yet
        </TabPanel>
      </Tabs>
    </SplitterPanel>
    <SplitterPanel
      :size="75"
      class="bg-surface-0 h-full overflow-auto"
    >
      <ClassEditor v-if="selected" />
      <div v-else>
        Nothing selected
      </div>
    </SplitterPanel>
  </Splitter>
</template>