<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { BlankNode, NamedNode, Term } from 'n3'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import {
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  MessageSquare,
  ExternalLink,
  Box,
  Link as LinkIcon,
  Users,
  Shapes
} from 'lucide-vue-next'
import { TreeType, useGraphStore } from '@/stores/graph'
import graphStoreService from '@/services/GraphStoreService'
import gitHubService from '@/services/GitHubService'
import TermValue from './TermValue.vue'
import PropertyValues from './PropertyValues.vue'
import AddPropertyDialog from './AddPropertyDialog.vue'
import NewResourceDialog from './NewResourceDialog.vue'
import EditRestrictionDialog from './EditRestrictionDialog.vue'
import EditPropertyShapeDialog from './EditPropertyShapeDialog.vue'
import NewIssueDialog from './NewIssueDialog.vue'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'

const {
  editMode,
  selectedResource,
  userGraphs,
  reloadTrigger,
  selectedOntology
} = storeToRefs(useGraphStore())
const scopeId = computed(() => selectedOntology.value?.scopeId)
const { getPrefixedUri, removeNode } = useGraphStore()

// Resource data
const label = ref<string>('')
const properties = ref<
  {
    label: string
    node: NamedNode
    ranges: Term[]
  }[]
>([])
const restrictions = ref<
  {
    label: string
    propertyNode: NamedNode
    blankNode: BlankNode
    valueNodes: Term[]
  }[]
>([])
const propertyShapes = ref<
  {
    label: string
    propertyNode: NamedNode
    blankNode: BlankNode
    valueNodes: Term[]
  }[]
>([])
const individuals = ref<{ label: string; node: NamedNode }[]>([])

// Load resource data
watch(
  [selectedResource, userGraphs, reloadTrigger],
  async () => {
    if (!selectedResource.value) {
      label.value = ''
      properties.value = []
      restrictions.value = []
      propertyShapes.value = []
      individuals.value = []
    } else {
      label.value = await graphStoreService.getLabel(selectedResource.value)
      properties.value = await graphStoreService.getProperties(selectedResource.value)
      restrictions.value = await graphStoreService.getRestrictions(selectedResource.value)
      individuals.value = await graphStoreService.getIndividuals(selectedResource.value)
      if (isNodeShape.value) {
        propertyShapes.value = await graphStoreService.getShaclPropertyShapes(
          selectedResource.value
        )
      } else {
        propertyShapes.value = []
      }
    }
  },
  { immediate: true, deep: true }
)

const isClass = ref<boolean>(false)
watch(
  selectedResource,
  async () => {
    if (selectedResource.value) {
      isClass.value = await graphStoreService.isClass(selectedResource.value)
    }
  },
  { immediate: true }
)

const isNodeShape = ref<boolean>(false)
watch(
  selectedResource,
  async () => {
    if (selectedResource.value) {
      isNodeShape.value = await graphStoreService.isShaclNodeShape(selectedResource.value)
    }
  },
  { immediate: true }
)

// GitHub Issues
const issues = ref<Awaited<ReturnType<typeof gitHubService.searchIssues>>>([])
const getResourceIssues = async () => {
  issues.value = []
  if (!selectedOntology.value?.owner || !selectedOntology.value.repo || !selectedResource.value)
    return

  issues.value = await gitHubService.searchIssues(
    selectedOntology.value.owner,
    selectedOntology.value.repo,
    selectedResource.value
  )
}
watch(selectedResource, getResourceIssues, { immediate: true })

const openIssueInGitHub = (issueNumber: number) => {
  if (!selectedOntology.value) return
  const issueUrl = `https://github.com/${selectedOntology.value.owner}/${selectedOntology.value.repo}/issues/${issueNumber}`
  window.open(issueUrl, '_blank')
}

// Dialog handlers - TODO: Implement with Dialog pattern when components are migrated


// Dialog state
const newIssueDialogOpen = ref(false)
const addPropertyDialogOpen = ref(false)
const addRestrictionDialogOpen = ref(false)
const addIndividualDialogOpen = ref(false)
const editPropertyShapeDialogOpen = ref(false)
const editPropertyShapeNode = ref<BlankNode>()
const editRestrictionDialogOpen = ref(false)
const editRestrictionNode = ref<BlankNode>()

const openEditPropertyShapeDialog = (shapeNode?: BlankNode) => {
  editPropertyShapeNode.value = shapeNode
  editPropertyShapeDialogOpen.value = true
}

const openNewIssueDialog = () => {
  newIssueDialogOpen.value = true
}

const deleteRestriction = async (restrictionNode: BlankNode) => {
  // TODO: Implement with AlertDialog
  if (!selectedOntology.value?.node || !scopeId.value) return
  const confirmed = confirm('Are you sure you want to delete this restriction?')
  if (!confirmed) return

  await removeNode(restrictionNode.value, selectedOntology.value.node, scopeId.value)
  reloadTrigger.value++
}

const deletePropertyShape = async (shapeNode: BlankNode) => {
  // TODO: Implement with AlertDialog
  if (!selectedOntology.value?.node || !scopeId.value) return
  const confirmed = confirm('Are you sure you want to delete this property shape?')
  if (!confirmed) return

  await removeNode(shapeNode.value, selectedOntology.value.node, scopeId.value)
  reloadTrigger.value++
}

// Collapsible state
const annotationsOpen = ref(true)
const propertyShapesOpen = ref(false)
const restrictionsOpen = ref(false)
const propertiesOpen = ref(false)
const individualsOpen = ref(false)
</script>

<template>
  <div
    v-if="selectedResource"
    class="w-full p-6 space-y-6 bg-background"
  >
    <!-- Header Section -->
    <div class="space-y-3">
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1 space-y-2">
          <h1 class="text-2xl font-bold">{{ label }}</h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger as-child>
                <Badge
                  variant="outline"
                  class="font-mono text-xs cursor-help text-muted-foreground"
                >
                  {{ getPrefixedUri(selectedResource) }}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p class="max-w-xs break-all">{{ selectedResource }}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <!-- Issues Actions -->
        <div
          v-if="editMode"
          class="flex items-center gap-2"
        >
          <DropdownMenu v-if="issues.length">
            <DropdownMenuTrigger as-child>
              <Button
                variant="outline"
                size="sm"
              >
                <MessageSquare class="mr-2 h-4 w-4" />
                Issues
                <Badge
                  variant="outline"
                  class="ml-2 text-muted-foreground font-mono"
                >{{ issues.length }}</Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              class="w-64"
            >
              <DropdownMenuItem
                v-for="issue in issues"
                :key="issue.number"
                @click="openIssueInGitHub(issue.number)"
              >
                <ExternalLink class="mr-2 h-4 w-4" />
                <span class="truncate">{{
                  issue.title.replace(`\`${selectedResource}\``, '')
                }}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            @click="openNewIssueDialog"
          >
            <Plus class="mr-2 h-4 w-4" />
            New Issue
          </Button>
        </div>
      </div>
    </div>

    <Separator />

    <!-- Annotations Section -->
    <Collapsible v-model:open="annotationsOpen">
      <Card>
        <CardHeader class="cursor-pointer hover:bg-accent/50 transition-colors py-3">
          <CollapsibleTrigger class="flex items-center justify-between w-full">
            <div class="flex items-center gap-2">
              <ChevronRight
                class="h-4 w-4 transition-transform duration-200"
                :class="{ 'transform rotate-90': annotationsOpen }"
              />
              <h3 class="text-lg font-semibold">Annotations</h3>
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent class="pt-0 space-y-2">
            <PropertyValues :subject="selectedResource" />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>

    <!-- Property Shapes Section -->
    <Dialog v-model:open="editPropertyShapeDialogOpen">
      <div
        v-if="propertyShapes.length || (editMode && isNodeShape)"
        class="space-y-3"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Shapes class="h-5 w-5 text-muted-foreground" />
            <h2 class="text-xl font-semibold">Property Shapes</h2>
            <Badge
              v-if="propertyShapes.length"
              variant="outline"
              class="text-muted-foreground font-mono"
            >{{
              propertyShapes.length
            }}</Badge>
          </div>
          <DialogTrigger
            v-if="editMode"
            as-child
          >
            <Button
              variant="outline"
              size="sm"
            >
              <Plus class="mr-2 h-4 w-4" />
              Add Shape
            </Button>
          </DialogTrigger>
        </div>

        <p
          v-if="!propertyShapes.length"
          class="text-sm text-muted-foreground"
        >
          No property shapes defined.
        </p>

        <div
          v-else
          class="space-y-2"
        >
          <Collapsible
            v-for="propertyShape in propertyShapes"
            :key="propertyShape.blankNode.value"
            v-model:open="propertyShapesOpen"
          >
            <Card>
              <CardHeader class="cursor-pointer hover:bg-accent/50 transition-colors py-3">
                <CollapsibleTrigger class="flex items-center justify-between w-full">
                  <div class="flex items-center gap-3 flex-1">
                    <ChevronRight
                      class="h-4 w-4 transition-transform duration-200 flex-shrink-0"
                      :class="{ 'transform rotate-90': propertyShapesOpen }"
                    />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger as-child>
                          <span
                            class="font-semibold cursor-pointer hover:text-primary"
                            @click.stop="selectedResource = propertyShape.propertyNode.value"
                          >
                            {{ propertyShape.label }}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{{ getPrefixedUri(propertyShape.propertyNode.value) }}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div class="flex flex-wrap items-center gap-1">
                      <TermValue
                        v-for="valueNode of propertyShape.valueNodes"
                        :key="valueNode.id"
                        :term="valueNode"
                        class="text-sm"
                        @click-uri="selectedResource = valueNode.value"
                      />
                    </div>
                  </div>
                  <div
                    v-if="editMode"
                    class="flex items-center gap-1 ml-2"
                    @click.stop
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8"
                      @click="openEditPropertyShapeDialog(propertyShape.blankNode)"
                    >
                      <Pencil class="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8 text-destructive hover:text-destructive"
                      @click="deletePropertyShape(propertyShape.blankNode)"
                    >
                      <Trash2 class="h-4 w-4" />
                    </Button>
                  </div>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent class="pt-0 space-y-2">
                  <PropertyValues :subject="propertyShape.blankNode.value" />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
        <EditPropertyShapeDialog
          v-if="selectedOntology?.node?.value && scopeId"
          :shape-node="editPropertyShapeNode"
          :subject="selectedResource"
          :graph-id="selectedOntology.node.value"
          :scope-id="scopeId"
          @close="editPropertyShapeDialogOpen = false"
          @updated="reloadTrigger++"
        />
      </div>
    </Dialog>

    <!-- Restrictions Section -->
    <Dialog v-model:open="editRestrictionDialogOpen">
      <div
        v-if="restrictions.length || (editMode && isClass)"
        class="space-y-3"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Box class="h-5 w-5 text-muted-foreground" />
            <h2 class="text-xl font-semibold">Restrictions</h2>
            <Badge
              v-if="restrictions.length"
              variant="outline"
              class="text-muted-foreground font-mono"
            >{{ restrictions.length }}</Badge>
          </div>
          <Dialog v-model:open="addRestrictionDialogOpen">
            <DialogTrigger
              v-if="editMode"
              as-child
            >
              <Button
                variant="outline"
                size="sm"
              >
                <Plus class="mr-2 h-4 w-4" />
                Add Restriction
              </Button>
            </DialogTrigger>
            <EditRestrictionDialog
              v-if="selectedResource && selectedOntology?.node?.value && scopeId"
              :subject="selectedResource"
              :graph-id="selectedOntology.node.value"
              :scope-id="scopeId"
              @confirm="addRestrictionDialogOpen = false; reloadTrigger++"
              @cancel="addRestrictionDialogOpen = false"
            />
          </Dialog>
        </div>

        <p
          v-if="!restrictions.length"
          class="text-sm text-muted-foreground"
        >
          No restrictions defined.
        </p>

        <div
          v-else
          class="space-y-2"
        >
          <Collapsible
            v-for="restriction in restrictions"
            :key="restriction.blankNode.value"
            v-model:open="restrictionsOpen"
          >
            <Card>
              <CardHeader class="cursor-pointer hover:bg-accent/50 transition-colors py-3">
                <CollapsibleTrigger class="flex items-center justify-between w-full">
                  <div class="flex items-center gap-3 flex-1">
                    <ChevronRight
                      class="h-4 w-4 transition-transform duration-200 flex-shrink-0"
                      :class="{ 'transform rotate-90': restrictionsOpen }"
                    />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger as-child>
                          <span
                            class="font-semibold cursor-pointer hover:text-primary"
                            @click.stop="selectedResource = restriction.propertyNode.value"
                          >
                            {{ restriction.label }}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{{ getPrefixedUri(restriction.propertyNode.value) }}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div class="flex flex-wrap items-center gap-1">
                      <TermValue
                        v-for="valueNode of restriction.valueNodes"
                        :key="valueNode.id"
                        :term="valueNode"
                        class="text-sm"
                        @click-uri="selectedResource = valueNode.value"
                      />
                    </div>
                  </div>
                  <div
                    v-if="editMode"
                    class="flex items-center gap-1 ml-2"
                    @click.stop
                  >
                    <DialogTrigger as-child>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8"
                        @click="editRestrictionNode = restriction.blankNode"
                      >
                        <Pencil class="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8 text-destructive hover:text-destructive"
                      @click="deleteRestriction(restriction.blankNode)"
                    >
                      <Trash2 class="h-4 w-4" />
                    </Button>
                  </div>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent class="pt-0">
                  <PropertyValues :subject="restriction.blankNode.value" />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
        <EditRestrictionDialog
          v-if="selectedResource && selectedOntology?.node?.value"
          :subject="selectedResource"
          :graph-id="selectedOntology.node.value"
          :restriction-node="editRestrictionNode"
          @confirm="editRestrictionDialogOpen = false; reloadTrigger++"
          @cancel="editRestrictionDialogOpen = false"
        />
      </div>
    </Dialog>

    <!-- Properties Section -->
    <div
      v-if="properties.length || (editMode && isClass)"
      class="space-y-3"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <LinkIcon class="h-5 w-5 text-muted-foreground" />
          <h2 class="text-xl font-semibold">Properties</h2>
          <Badge
            v-if="properties.length"
            variant="outline"
            class="text-muted-foreground font-mono"
          >{{ properties.length }}</Badge>
        </div>
        <Dialog v-model:open="addPropertyDialogOpen">
          <DialogTrigger
            v-if="editMode"
            as-child
          >
            <Button
              variant="outline"
              size="sm"
            >
              <Plus class="mr-2 h-4 w-4" />
              Add Property
            </Button>
          </DialogTrigger>
          <AddPropertyDialog
            v-if="selectedResource && selectedOntology?.node?.value"
            :existing-property-nodes="properties.map(p => p.node.value)"
            :domain="selectedResource"
            :graph-id="selectedOntology.node.value"
            @confirm="addPropertyDialogOpen = false; reloadTrigger++"
            @cancel="addPropertyDialogOpen = false"
          />
        </Dialog>
      </div>

      <p
        v-if="!properties.length"
        class="text-sm text-muted-foreground"
      >
        No properties defined.
      </p>

      <div
        v-else
        class="space-y-2"
      >
        <Collapsible
          v-for="property in properties"
          :key="property.node.value"
          v-model:open="propertiesOpen"
        >
          <Card>
            <CardHeader class="cursor-pointer hover:bg-accent/50 transition-colors py-3">
              <CollapsibleTrigger class="flex items-center justify-between w-full">
                <div class="flex items-center gap-3 flex-1">
                  <ChevronRight
                    class="h-4 w-4 transition-transform duration-200 flex-shrink-0"
                    :class="{ 'transform rotate-90': propertiesOpen }"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <span
                          class="font-semibold cursor-pointer hover:text-primary"
                          @click.stop="selectedResource = property.node.value"
                        >
                          {{ property.label }}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{{ getPrefixedUri(property.node.value) }}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <div class="flex flex-wrap items-center gap-1">
                    <TermValue
                      v-for="range of property.ranges"
                      :key="range.id"
                      :term="range"
                      class="text-sm"
                      @click-uri="selectedResource = range.value"
                    />
                  </div>
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent class="pt-0">
                <PropertyValues :subject="property.node.value" />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </div>

    <!-- Individuals Section -->
    <div
      v-if="individuals.length || (editMode && isClass)"
      class="space-y-3"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Users class="h-5 w-5 text-muted-foreground" />
          <h2 class="text-xl font-semibold">Individuals</h2>
          <Badge
            v-if="individuals.length"
            variant="outline"
            class="text-muted-foreground font-mono"
          >{{ individuals.length }}</Badge>
        </div>
        <Dialog v-model:open="addIndividualDialogOpen">
          <DialogTrigger
            v-if="editMode"
            as-child
          >
            <Button
              variant="outline"
              size="sm"
            >
              <Plus class="mr-2 h-4 w-4" />
              Add Individual
            </Button>
          </DialogTrigger>
          <NewResourceDialog
            v-if="selectedResource && selectedOntology?.node?.value"
            :parent-uri="selectedResource"
            :type="TreeType.Individuals"
            :graph-id="selectedOntology.node.value"
            @close="addIndividualDialogOpen = false"
            @created="reloadTrigger++"
          />
        </Dialog>
      </div>

      <p
        v-if="!individuals.length"
        class="text-sm text-muted-foreground"
      >
        No individuals defined.
      </p>

      <div
        v-else
        class="space-y-2"
      >
        <Collapsible
          v-for="individual in individuals"
          :key="individual.node.value"
          v-model:open="individualsOpen"
        >
          <Card>
            <CardHeader class="cursor-pointer hover:bg-accent/50 transition-colors py-3">
              <CollapsibleTrigger class="flex items-center justify-between w-full">
                <div class="flex items-center gap-3 flex-1">
                  <ChevronRight
                    class="h-4 w-4 transition-transform duration-200 flex-shrink-0"
                    :class="{ 'transform rotate-90': individualsOpen }"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <span
                          class="font-semibold cursor-pointer hover:text-primary"
                          @click.stop="selectedResource = individual.node.value"
                        >
                          {{ individual.label }}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{{ getPrefixedUri(individual.node.value) }}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent class="pt-0 space-y-2">
                <PropertyValues :subject="individual.node.value" />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </div>

    <!-- Dialogs -->
    <Dialog v-model:open="newIssueDialogOpen">
      <NewIssueDialog
        v-if="selectedResource"
        :parent-uri="selectedResource"
        @confirm="newIssueDialogOpen = false; reloadTrigger++"
        @cancel="newIssueDialogOpen = false"
      />
    </Dialog>
  </div>
</template>
