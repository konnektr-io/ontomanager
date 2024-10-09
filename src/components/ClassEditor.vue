<script setup lang="ts">
import { computed } from 'vue';
import Card from 'primevue/card';
import Tag from 'primevue/tag';
import Panel from 'primevue/panel';
import graphStoreService from '@/services/GraphStoreService';
// import AnnotationPropertyList from './AnnotationPropertyList.vue.old'

const props = defineProps<{
  selected: string
}>();

const properties = computed(() => {
  return graphStoreService.getProperties(props.selected);
});
const restrictions = computed(() => {
  return graphStoreService.getRestrictions(props.selected);
});

</script>

<template>
  <Card class="w-full">
    <template #title>{{ graphStoreService.getLabel(selected) }}</template>
    <template #subtitle>
      <Tag
        severity="info"
        class="mr-2"
      >
        {{ graphStoreService.getPrefixedUri(selected) }}
      </Tag>
    </template>
    <template #content>
      <!-- <AnnotationPropertyList :subject="selected" /> -->
      <div class="space-y-6">
        <div>
          <h3 class="text-lg font-semibold mb-4">Properties</h3>
          <p
            v-if="!properties.length"
            class="text-muted-foreground"
          >No properties defined.</p>
          <div
            v-else
            class="space-y-4"
          >
            <Panel
              v-for="property in properties"
              :key="property"
              toggleable
            >
              <template #header>
                <div class="flex items-center gap-2">
                  <p class="font-semibold">{{ graphStoreService.getLabel(property) }}</p>
                  <div class="flex flex-wrap gap-1">
                    <Badge
                      variant="outline"
                      class="flex flex-wrap gap-1"
                    >{{ property }}</Badge>
                  </div>
                </div>
              </template>
              <template #icons>
                <Menu
                  ref="menu"
                  id="config_menu"
                  popup
                />
              </template>
              <!-- <AnnotationPropertyList :subject="property" /> -->
            </Panel>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-semibold mb-2">Restrictions</h3>
          <p
            v-if="!restrictions.length"
            class="text-muted-foreground"
          >No restrictions defined.</p>
          <div
            v-else
            class="space-y-4"
          >
            <Panel
              v-for="property in restrictions"
              :key="property"
              toggleable
            >
              <template #header>
                <div class="flex items-center gap-2">
                  <p class="font-semibold">{{ graphStoreService.getLabel(property) }}</p>
                  <div class="flex flex-wrap gap-1">
                    <Badge
                      variant="outline"
                      class="flex flex-wrap gap-1"
                    >{{ property }}</Badge>
                  </div>
                </div>
              </template>
              <template #icons>
                <Menu
                  ref="menu"
                  id="config_menu"
                  popup
                />
              </template>
              <!-- <AnnotationPropertyList :subject="property" /> -->
            </Panel>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-semibold mb-2">Individuals</h3>
          <p class="text-muted-foreground">No individuals listed.</p>
        </div>
      </div>
    </template>
  </Card>
</template>