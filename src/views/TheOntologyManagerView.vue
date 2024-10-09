<script setup lang="ts">
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import Tabs from 'primevue/tabs'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import { storeToRefs } from 'pinia';
import { useMainStore } from '@/stores/main';
import ClassesTree from '@/components/ClassesTree.vue'
import ClassEditor from '@/components/ClassEditor.vue'

const { selected } = storeToRefs(useMainStore());


enum TabValue {
  Classes = 'classes',
  Properties = 'properties',
}

const tabs = [
  { title: 'Classes', value: TabValue.Classes },
  { title: 'Properties', value: TabValue.Properties },
]

</script>

<template>
  <Splitter class="h-full">
    <SplitterPanel
      :size="25"
      :minSize="10"
      class="bg-surface-0 h-full"
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
      class="bg-surface-0 h-full"
    >
      <ClassEditor
        v-if="selected"
        :selected="selected"
      />
      <div v-else>
        Nothing selected
      </div>
    </SplitterPanel>
  </Splitter>
</template>