<script setup lang="ts">
import { computed } from 'vue';
import { Separator } from '@/components/ui/separator'
import graphStoreService from '@/services/GraphStoreService';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import AnnotationPropertyList from './AnnotationPropertyList.vue'

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
    <CardHeader>
      <CardTitle>{{ graphStoreService.getLabel(selected) }}</CardTitle>
      <CardDescription class="space-y-2">
        <Badge
          variant="secondary"
          class="mr-2"
        >
          {{ graphStoreService.getPrefixedUri(selected) }}
        </Badge>
        <AnnotationPropertyList :subject="selected" />
      </CardDescription>
    </CardHeader>
    <CardContent>
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
            <div
              v-for="property in properties"
              :key="property"
              class="bg-muted rounded-lg p-4"
            >
              <div class="grid grid-cols-2 gap-4 mb-2">
                <div>
                  <p class="font-semibold">{{ graphStoreService.getLabel(property) }}</p>
                  <div class="flex flex-wrap gap-1">
                    <Badge
                      variant="outline"
                      class="flex flex-wrap gap-1"
                    >{{ graphStoreService.getPrefixedUri(property) }}</Badge>
                  </div>
                </div>
                <div>
                  <p class="text-sm font-medium text-muted-foreground">Range</p>
                  <div class="flex flex-wrap gap-1">
                    <Badge
                      v-for="range in graphStoreService.getRanges(property)"
                      :key="range"
                      variant="outline"
                      class="mb-1"
                    >
                      {{ graphStoreService.getPrefixedUri(range) }}
                    </Badge>
                  </div>
                </div>
              </div>
              <Separator class="my-2" />
              <AnnotationPropertyList :subject="property" />
            </div>
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
            <div
              v-for="property in restrictions"
              :key="property"
              class="bg-muted rounded-lg p-4"
            >
              <div class="grid grid-cols-2 gap-4 mb-2">
                <div>
                  <p class="font-semibold">{{ graphStoreService.getLabel(property) }}</p>
                  <div class="flex flex-wrap gap-1">
                    <Badge
                      variant="outline"
                      class="flex flex-wrap gap-1"
                    >{{ property }}</Badge>
                  </div>
                </div>
                <div>
                  <p class="text-sm font-medium text-muted-foreground">Range</p>
                  <div class="flex flex-wrap gap-1">
                    <Badge
                      v-for="range in graphStoreService.getRanges(property)"
                      :key="range"
                      variant="outline"
                    >
                      {{ range }}
                    </Badge>
                  </div>
                </div>
              </div>
              <Separator class="my-2" />
              <AnnotationPropertyList :subject="property" />
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-semibold mb-2">Individuals</h3>
          <p class="text-muted-foreground">No individuals listed.</p>
        </div>
      </div>
    </CardContent>
    <CardFooter class="flex justify-end">
      <Button>Save</Button>
    </CardFooter>
  </Card>
</template>