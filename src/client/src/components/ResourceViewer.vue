<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { BlankNode, NamedNode, Term } from 'n3'
import Button from 'primevue/button'
import Panel from 'primevue/panel'
import Menu from 'primevue/menu'
import Tag from 'primevue/tag'
import { useConfirm } from 'primevue/useconfirm'
import { useDialog } from 'primevue/usedialog'
import { TreeType, useGraphStore } from '@/stores/graph'
import graphStoreService from '@/services/GraphStoreService'
import gitHubService from '@/services/GitHubService'
import TermValue from './TermValue.vue'
import PropertyValues from './PropertyValues.vue'
import AddPropertyDialog from './AddPropertyDialog.vue'
import NewResourceDialog from './NewResourceDialog.vue'
import EditRestrictionDialog from './EditRestrictionDialog.vue'
import EditPropertyShapeDialog from './EditPropertyShapeDialog.vue'
// import IssueDialog from './IssueDialog.vue'
import NewIssueDialog from './NewIssueDialog.vue'

const {
  editMode,
  selectedResource,
  userGraphs,
  reloadTrigger,
  selectedOntology
} = storeToRefs(useGraphStore())
const scopeId = computed(() => selectedOntology.value?.scopeId)
const {
  getPrefixedUri,
  removeNode
} = useGraphStore()

const label = ref<string>('')
const properties = ref<{
  label: string,
  node: NamedNode,
  ranges: Term[]
}[]>([])
const restrictions = ref<{
  label: string
  propertyNode: NamedNode
  blankNode: BlankNode
  valueNodes: Term[]
}[]>([])
const propertyShapes = ref<{
  label: string
  propertyNode: NamedNode
  blankNode: BlankNode
  valueNodes: Term[]
}[]>([])
const individuals = ref<{ label: string, node: NamedNode }[]>([])
watch([
  selectedResource,
  userGraphs,
  reloadTrigger
], async () => {
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
      propertyShapes.value = await graphStoreService.getShaclPropertyShapes(selectedResource.value)
    } else {
      propertyShapes.value = []
    }
  }
}, { immediate: true, deep: true })

const isClass = ref<boolean>(false)
watch(selectedResource, async () => {
  if (selectedResource.value) {
    isClass.value = await graphStoreService.isClass(selectedResource.value)
  }
}, { immediate: true })

const isNodeShape = ref<boolean>(false)
watch(selectedResource, async () => {
  if (selectedResource.value) {
    isNodeShape.value = await graphStoreService.isShaclNodeShape(selectedResource.value)
  }
}, { immediate: true })

const dialog = useDialog()
const openAddPropertyDialog = () => {
  if (!selectedResource.value || !selectedOntology.value?.node) return
  dialog.open(AddPropertyDialog, {
    props: {
      header: 'Add Property',
      style: {
        width: '60vw',
      },
      breakpoints: {
        '960px': '75vw',
        '640px': '90vw'
      },
      modal: true
    },
    data: {
      existingPropertyNodes: properties.value.map(p => p.node.value),
      domain: selectedResource.value,
      graphId: selectedOntology.value.node.value
    }
  })
}

const openNewIndividualDialog = (parentUri?: string) => {
  dialog.open(NewResourceDialog, {
    props: {
      header: `New Individual`,
      style: {
        width: '60vw',
      },
      breakpoints: {
        '960px': '75vw',
        '640px': '90vw'
      },
      modal: true
    },
    data: {
      parentUri,
      type: TreeType.Individuals,
      graphId: selectedOntology.value?.node?.value
    }
  })
}

const openEditRestrictionDialog = (restrictionNode?: BlankNode) => {
  if (!selectedResource.value || !selectedOntology.value?.node) return
  dialog.open(EditRestrictionDialog, {
    props: {
      header: 'Edit Restriction',
      style: {
        width: '60vw',
      },
      breakpoints: {
        '960px': '75vw',
        '640px': '90vw'
      },
      modal: true
    },
    data: {
      subject: selectedResource.value,
      graphId: selectedOntology.value.node.value,
      restrictionNode
    }
  })
}


const confirm = useConfirm()

const deleteRestriction = async (restrictionNode: BlankNode) => {
  if (!selectedOntology.value?.node) return
  confirm.require({
    header: 'Delete restriction',
    message: 'Are you sure you want to delete this restriction?',
    icon: 'pi pi-exclamation-triangle',
    modal: false,
    rejectProps: {
      label: 'Cancel',
      severity: 'secondary',
      text: true
    },
    acceptProps: {
      label: 'Delete',
      severity: 'secondary',
      outlined: true
    },
    accept: async () => {
      if (!selectedOntology.value?.node) {
        console.warn('No ontology selected')
        return
      }
      if (!scopeId.value) {
        console.warn('No scopeId selected')
        return
      }
      await removeNode(restrictionNode.value, selectedOntology.value.node, scopeId.value)

      reloadTrigger.value++
    }
  })
}


const openEditPropertyShapeDialog = (shapeNode?: BlankNode) => {
  if (!selectedResource.value || !selectedOntology.value?.node) return
  dialog.open(EditPropertyShapeDialog, {
    props: {
      header: 'Edit Property Shape',
      style: {
        width: '60vw',
      },
      breakpoints: {
        '960px': '75vw',
        '640px': '90vw'
      },
      modal: true
    },
    data: {
      subject: selectedResource.value,
      graphId: selectedOntology.value.node.value,
      shapeNode
    }
  })
}


const deletePropertyShape = async (shapeNode: BlankNode) => {
  if (!selectedOntology.value?.node) return
  confirm.require({
    header: 'Delete Property Shape',
    message: 'Are you sure you want to delete this property shape?',
    icon: 'pi pi-exclamation-triangle',
    modal: false,
    rejectProps: {
      label: 'Cancel',
      severity: 'secondary',
      text: true
    },
    acceptProps: {
      label: 'Delete',
      severity: 'secondary',
      outlined: true
    },
    accept: async () => {
      if (!selectedOntology.value?.node) {
        console.warn('No ontology selected')
        return
      }
      if (!scopeId.value) {
        console.warn('No scopeId selected')
        return
      }
      await removeNode(shapeNode.value, selectedOntology.value.node, scopeId.value)

      reloadTrigger.value++
    }
  })
}

const issues = ref<Awaited<ReturnType<typeof gitHubService.searchIssues>>>([])
const getResourceIssues = async () => {
  issues.value = []
  if (!selectedOntology.value?.owner ||
    !selectedOntology.value.repo ||
    !selectedResource.value) return

  issues.value = await gitHubService.searchIssues(
    selectedOntology.value.owner,
    selectedOntology.value.repo,
    selectedResource.value
  )
}
watch(selectedResource, getResourceIssues, { immediate: true })
const issuesMenu = ref<InstanceType<typeof Menu>>()
const issuesItems = computed(() => issues.value.map(issue => ({
  label: issue.title.replace(`\`${selectedResource.value}\``, ''),
  command: () => {
    if (!selectedOntology.value) return
    const issueUrl = `https://github.com/${selectedOntology.value.owner}/${selectedOntology.value.repo}/issues/${issue.number}`
    window.open(issueUrl, '_blank')
    /* dialog.open(IssueDialog, {
      props: {
        header: issue.title.replace('[' + selectedResource.value + '] ', ''),
        style: {
          width: '60vw',
        },
        breakpoints: {
          '960px': '75vw',
          '640px': '90vw'
        },
        modal: true
      },
      data: {
        issueNumber: issue.number
      }
    }) */
  }
})))
const openNewIssueDialog = () => {
  dialog.open(NewIssueDialog, {
    props: {
      header: 'New Issue',
      style: {
        width: '60vw',
      },
      breakpoints: {
        '960px': '75vw',
        '640px': '90vw'
      },
      modal: true
    },
    data: {
      parentUri: selectedResource.value,
      type: TreeType.Classes
    }
  })
}
</script>

<template>
  <div
    v-if="selectedResource"
    class="w-full p-4"
  >
    <div class="flex items-center gap-2 mb-4">
      <p class="text-lg font-semibold">{{ label }}</p>
      <div class="flex flex-wrap gap-1">
        <Tag
          v-tooltip="selectedResource"
          :value="getPrefixedUri(selectedResource)"
        ></Tag>
      </div>
      <Button
        v-if="editMode && issues.length"
        icon="pi pi-comments"
        label="Issues"
        :badge="`${issues.length}`"
        outlined
        @click="issuesMenu?.toggle"
      ></Button>
      <Menu
        ref="issuesMenu"
        :model="issuesItems"
        popup
      />
      <Button
        v-if="editMode"
        icon="pi pi-plus"
        label="New Issue"
        outlined
        @click="openNewIssueDialog"
      />
    </div>
    <div>
      <div class="mb-6">
        <PropertyValues :subject="selectedResource" />
      </div>

      <div class="space-y-6">
        <div v-if="propertyShapes.length || (editMode && isNodeShape)">
          <div class="flex items-center gap-2 mb-4">
            <h3 class="text-lg font-semibold">Property Shapes (SHACL)</h3>
            <Button
              v-if="editMode"
              icon="pi pi-plus"
              size="small"
              text
              label="Add"
              @click="openEditPropertyShapeDialog()"
            />
          </div>
          <div
            v-if="propertyShapes.length || (editMode && isClass)"
            class="space-y-4"
          >
            <Panel
              v-for="propertyShape in propertyShapes"
              :key="propertyShape.blankNode.value"
              toggleable
              collapsed
            >
              <template #header>
                <div class="flex items-center gap-4">
                  <div
                    v-tooltip="getPrefixedUri(propertyShape.propertyNode.value)"
                    class="font-semibold cursor-pointer"
                    @click="selectedResource = propertyShape.propertyNode.value"
                  >{{ propertyShape.label }}</div>
                  <TermValue
                    v-for="valueNode of propertyShape.valueNodes"
                    :key="valueNode.id"
                    :term="valueNode"
                    class="text-sm"
                    @click-uri="selectedResource = valueNode.value"
                  />
                  <Button
                    v-if="editMode"
                    icon="pi pi-pencil"
                    size="small"
                    text
                    @click="openEditPropertyShapeDialog(propertyShape.blankNode)"
                  />
                  <Button
                    v-if="editMode"
                    icon="pi pi-trash"
                    size="small"
                    text
                    @click="deletePropertyShape(propertyShape.blankNode)"
                  />
                </div>
              </template>
              <PropertyValues :subject="propertyShape.blankNode.value" />
            </Panel>
          </div>
        </div>

        <div v-if="restrictions.length || (editMode && isClass)">
          <div class="flex items-center gap-2 mb-4">
            <h3 class="text-lg font-semibold">Restrictions</h3>
            <Button
              v-if="editMode"
              icon="pi pi-plus"
              size="small"
              text
              label="Add"
              @click="openEditRestrictionDialog()"
            />
          </div>
          <p
            v-if="!restrictions.length"
            class="text-slate-500"
          >No restrictions defined.</p>
          <div
            v-else
            class="space-y-4"
          >
            <Panel
              v-for="restriction in restrictions"
              :key="restriction.blankNode.value"
              toggleable
              collapsed
            >
              <template #header>
                <div class="flex items-center gap-4">
                  <div
                    v-tooltip="getPrefixedUri(restriction.propertyNode.value)"
                    class="font-semibold cursor-pointer"
                    @click="selectedResource = restriction.propertyNode.value"
                  >{{ restriction.label }}</div>
                  <TermValue
                    v-for="valueNode of restriction.valueNodes"
                    :key="valueNode.id"
                    :term="valueNode"
                    class="text-sm"
                    @click-uri="selectedResource = valueNode.value"
                  />
                  <Button
                    v-if="editMode"
                    icon="pi pi-pencil"
                    size="small"
                    text
                    @click="openEditRestrictionDialog(restriction.blankNode)"
                  />
                  <Button
                    v-if="editMode"
                    icon="pi pi-trash"
                    size="small"
                    text
                    @click="deleteRestriction(restriction.blankNode)"
                  />
                </div>
              </template>
              <PropertyValues :subject="restriction.blankNode.value" />
            </Panel>
          </div>
        </div>

        <div v-if="properties.length || (editMode && isClass)">
          <div class="flex items-center gap-2 mb-4">
            <h3 class="text-lg font-semibold">Properties</h3>
            <Button
              v-if="editMode"
              icon="pi pi-plus"
              size="small"
              text
              label="Add"
              @click="openAddPropertyDialog"
            />
          </div>
          <p
            v-if="!properties.length"
            class="text-slate-500"
          >No properties defined.</p>
          <div
            v-else
            class="space-y-4"
          >
            <Panel
              v-for="property in properties"
              :key="property.node.value"
              toggleable
              collapsed
            >
              <template #header>
                <div class="flex items-center gap-4">
                  <div
                    v-tooltip="getPrefixedUri(property.node.value)"
                    class="font-semibold cursor-pointer"
                    @click="selectedResource = property.node.value"
                  >{{ property.label }}</div>
                  <TermValue
                    v-for="range of property.ranges"
                    :key="range.id"
                    :term="range"
                    class="text-sm"
                    @click-uri="selectedResource = range.value"
                  />
                </div>

              </template>
              <PropertyValues :subject="property.node.value" />
            </Panel>
          </div>
        </div>


        <div v-if="individuals.length || (editMode && isClass)">
          <div class="flex items-center gap-2 mb-4">
            <h3 class="text-lg font-semibold">Individuals</h3>
            <Button
              v-if="editMode"
              icon="pi pi-plus"
              size="small"
              text
              label="Add"
              @click="openNewIndividualDialog(selectedResource)"
            />
          </div>
          <p
            v-if="!individuals.length"
            class="text-slate-500"
          >No individuals defined.</p>
          <div
            v-else
            class="space-y-4"
          >
            <Panel
              v-for="individual in individuals"
              :key="individual.node.value"
              toggleable
              collapsed
            >
              <template #header>
                <div class="flex items-center gap-4">
                  <div
                    v-tooltip="getPrefixedUri(individual.node.value)"
                    class="font-semibold cursor-pointer"
                    @click="selectedResource = individual.node.value"
                  >{{ individual.label }}</div>
                </div>
              </template>
              <PropertyValues :subject="individual.node.value" />
            </Panel>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>