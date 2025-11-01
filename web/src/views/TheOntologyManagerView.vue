<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { TreeType, useGraphStore } from '@/stores/graph'
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable'
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import AppSidebar from '@/components/AppSidebar.vue'
import ResourceTree from '@/components/ResourceTree.vue'
import ResourceViewer from '@/components/ResourceViewer.vue'
import LoadOntologyView from '@/views/LoadOntologyView.vue'
import TheHeader from '@/components/TheHeader.vue'

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

const { initialize } = useGraphStore()
onMounted(initialize)
</script>

<template>
    <AppSidebar />
    <SidebarInset class="flex flex-col overflow-hidden">
        <header class="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background">
            <SidebarTrigger class="-ml-1" />
            <Separator
                orientation="vertical"
                class="mr-2 h-4"
            />
            <TheHeader />
        </header>
        <div class="flex-1 overflow-hidden bg-background">
            <ResizablePanelGroup
                direction="horizontal"
                class="h-full"
            >
                <ResizablePanel
                    :default-size="25"
                    :min-size="10"
                    class="bg-background"
                >
                    <div class="h-full overflow-auto bg-background">
                        <ResourceTree :type="type || TreeType.Classes" />
                    </div>
                </ResizablePanel>

                <ResizableHandle class="w-1 bg-border hover:bg-primary/20 transition-colors" />

                <ResizablePanel
                    :default-size="75"
                    class="bg-background"
                >
                    <div class="h-full overflow-auto bg-background">
                        <ResourceViewer v-if="selectedResource" />
                        <LoadOntologyView v-else />
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    </SidebarInset>
</template>
