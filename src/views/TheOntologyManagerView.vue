<script setup lang="ts">
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import Tabs from 'primevue/tabs'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import { storeToRefs } from 'pinia';
import { useMainStore } from '@/stores/main';

import TaxonomyTree from '@/components/TaxonomyTree.vue'
import ClassEditor from '@/components/ClassEditor.vue'


const { selected } = storeToRefs(useMainStore());

const tabs = [
  { title: 'Classes', value: 'classes' },
  { title: 'Properties', value: 'properties' },
]

</script>

<template>
  <div class="h-full">
    <Splitter class="h-full">
      <SplitterPanel
        :size="25"
        :minSize="10"
        class="bg-surface-50"
      >
        <Tabs value="classes">
          <TabList>
            <Tab
              v-for="tab in tabs"
              :key="tab.title"
              :value="tab.value"
            >{{ tab.title }}</Tab>
          </TabList>
          <TabPanel header="Classes">
            <TaxonomyTree />
          </TabPanel>
          <TabPanel header="Properties">
            Not implemented yet
          </TabPanel>
        </Tabs>
      </SplitterPanel>
      <SplitterPanel
        :size="75"
        class="bg-surface-0"
      >
        <ClassEditor
          v-if="selected"
          :selected="selected"
        />
        <div>
          Nothing selected
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>