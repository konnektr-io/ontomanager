<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Box, Link, User, Network, Globe } from 'lucide-vue-next'
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar'
import { TreeType } from '@/stores/graph'

const route = useRoute()

const navigationItems = [
    { icon: Box, title: 'Classes', value: TreeType.Classes },
    { icon: Link, title: 'Properties', value: TreeType.Properties },
    { icon: User, title: 'Individuals', value: TreeType.Individuals },
    { icon: Network, title: 'Decomposition', value: TreeType.Decomposition },
    { icon: Globe, title: 'Ontologies', value: TreeType.Ontologies }
]

const activeTreeType = computed(() => {
    const path = route.path.split('/')[1]
    return path || TreeType.Classes
})
</script>

<template>
    <Sidebar>
        <SidebarContent>
            <SidebarGroup>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem
                            v-for="item in navigationItems"
                            :key="item.value"
                        >
                            <SidebarMenuButton
                                :as-child="true"
                                :is-active="activeTreeType === item.value"
                            >
                                <router-link :to="`/${item.value}`">
                                    <component
                                        :is="item.icon"
                                        class="h-4 w-4"
                                    />
                                    <span>{{ item.title }}</span>
                                </router-link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        </SidebarContent>
    </Sidebar>
</template>
