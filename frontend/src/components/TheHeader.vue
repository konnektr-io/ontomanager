<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Plus, ExternalLink, Eye, EyeOff, Trash2, Settings, AlertCircle, Network } from 'lucide-vue-next'
import { GitHubIcon } from 'vue3-simple-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'vue-sonner'
import gitHubService from '@/services/GitHubService'
import { useGraphStore, type GraphDetails } from '@/stores/graph'
import UserMenu from './UserMenu.vue'
import AIService from '@/services/AIService'
import { NamedNode } from 'n3'
import {
    labelNodes,
    classObjectNodes,
    propertyObjectNodes
} from '@/services/GraphStoreService'

const {
    selectedResource,
    userGraphs,
    graphsLoading,
    selectedOntology,
    undoStackSize
} = storeToRefs(useGraphStore())
const {
    toggleGraphVisibility,
    addGraph,
    removeGraph,
    writeGraph,
    loadGraph,
    clearUndoRedoStacks,
    serializeUndoStack,
    saveUserGraphsToLocalStorage
} = useGraphStore()

const openUrl = (url: string) => {
    if (url) {
        window.open(url, '_blank')
    }
}

const showLoadOntologyPage = () => {
    selectedResource.value = null
}

watch(selectedOntology, async (graph) => {
    if (graph && graph.owner && graph.repo) {
        await fetchBranches(graph)
    }
})

watch(
    userGraphs,
    (graphs) => {
        if (!graphs.length) {
            selectedResource.value = null
        }
    },
    { immediate: true, deep: true }
)

// Change ontology confirmation
const changeOntologyAlertOpen = ref(false)
const pendingOntologyChange = ref<GraphDetails | null>(null)

const changeSelectedOntology = async (graphUrl: any) => {
    if (typeof graphUrl !== 'string' && graphUrl !== null) return
    const graph = graphUrl ? userGraphs.value.find((g) => g.url === graphUrl) : null

    if (undoStackSize.value) {
        pendingOntologyChange.value = graph || null
        changeOntologyAlertOpen.value = true
    } else {
        selectedOntology.value = graph || null
    }
}

const confirmOntologyChange = () => {
    clearUndoRedoStacks()
    selectedOntology.value = pendingOntologyChange.value
    changeOntologyAlertOpen.value = false
}

const fetchBranches = async (graph: GraphDetails) => {
    if (graph.owner && graph.repo) {
        graph.branches = await gitHubService.getBranches(graph.owner, graph.repo)
    }
}

// Change branch confirmation
const changeBranchAlertOpen = ref(false)
const pendingBranchChange = ref<{ graph: GraphDetails; branch: string } | null>(null)

const changeBranch = async (branch: any) => {
    if (typeof branch !== 'string') return
    const graph = selectedOntology.value
    if (!graph || !graph.branch || !branch) return

    if (undoStackSize.value) {
        pendingBranchChange.value = { graph, branch }
        changeBranchAlertOpen.value = true
    } else {
        executeBranchChange(graph, branch)
    }
}

const confirmBranchChange = () => {
    if (pendingBranchChange.value) {
        clearUndoRedoStacks()
        executeBranchChange(pendingBranchChange.value.graph, pendingBranchChange.value.branch)
        changeBranchAlertOpen.value = false
    }
}

const executeBranchChange = (graph: GraphDetails, branch: string) => {
    if (graph.branch && branch && graph.node) {
        const newUrl = graph.url.replace(graph.branch, branch)
        removeGraph(graph)
        addGraph(newUrl)
        graph.branch = branch
    }
}

// New branch dialog
const newBranchDialogVisible = ref(false)
const newBranchName = ref('')
const createNewBranch = async () => {
    try {
        const currentBranch = selectedOntology.value?.branches?.find(
            (b) => b.name === selectedOntology.value?.branch
        )
        if (
            selectedOntology.value &&
            newBranchName.value &&
            selectedOntology.value.owner &&
            selectedOntology.value.repo &&
            currentBranch?.commit?.sha &&
            selectedOntology.value.branch
        ) {
            await gitHubService.createNewBranch(
                selectedOntology.value.owner,
                selectedOntology.value.repo,
                currentBranch.commit.sha,
                newBranchName.value
            )
            selectedOntology.value.branches = await gitHubService.getBranches(
                selectedOntology.value.owner,
                selectedOntology.value.repo
            )
            changeBranch(newBranchName.value)
            newBranchDialogVisible.value = false
            newBranchName.value = ''
        }
    } catch (error) {
        toast.error(`Error creating branch: ${error}`)
        console.error(error)
    }
}

// Commit dialog
const commitDialogVisible = ref(false)
const commitMessage = ref('')
const openCommitDialog = async () => {
    commitDialogVisible.value = true
    const changes = serializeUndoStack()
    commitMessage.value =
        selectedOntology.value?.path?.split('/').pop()?.replace('.ttl', '') + ' - '
    commitMessage.value += await AIService.suggestCommitMessage(changes)
}

const discardChanges = () => {
    if (selectedOntology.value) {
        loadGraph(selectedOntology.value)
    }
    clearUndoRedoStacks()
    commitDialogVisible.value = false
    commitMessage.value = ''
}

const commitLoading = ref(false)
const commitChanges = async () => {
    commitLoading.value = true
    try {
        if (selectedOntology.value) {
            const content = await writeGraph(selectedOntology.value)
            if (
                !content ||
                !selectedOntology.value.owner ||
                !selectedOntology.value.repo ||
                !selectedOntology.value.path ||
                !selectedOntology.value.branch ||
                !commitMessage.value
            )
                return
            await gitHubService.commitFile(
                selectedOntology.value.owner,
                selectedOntology.value.repo,
                selectedOntology.value.path,
                content,
                commitMessage.value,
                selectedOntology.value.branch
            )
            clearUndoRedoStacks()
            commitDialogVisible.value = false
            commitMessage.value = ''
            toast.success('Changes committed successfully')
        }
    } catch (error) {
        toast.error(`Error committing changes: ${error}`)
        console.error(error)
    } finally {
        commitLoading.value = false
    }
}

// Defaults dialog
const defaultsDialogVisible = ref(false)
const defaultsEditGraph = ref<GraphDetails | null>(null)
const defaultsDraft = ref({ label: '', class: '', property: '' })

function toGraphAllowedNamedNode<T extends NamedNode> (
    value: string | NamedNode | undefined,
    allowed: readonly T[]
): T | undefined {
    if (!value) return undefined
    if (typeof value === 'object' && value.termType === 'NamedNode') {
        return allowed.find((n) => n.value === value.value)
    }
    if (typeof value === 'string') {
        return allowed.find((n) => n.value === value)
    }
    return undefined
}

const openGraphDefaultsDialog = (graph: GraphDetails) => {
    defaultsEditGraph.value = graph
    defaultsDraft.value = {
        label:
            typeof graph.defaults?.label === 'object'
                ? graph.defaults.label.value
                : graph.defaults?.label || '',
        class:
            typeof graph.defaults?.class === 'object'
                ? graph.defaults.class.value
                : graph.defaults?.class || '',
        property:
            typeof graph.defaults?.property === 'object'
                ? graph.defaults.property.value
                : graph.defaults?.property || ''
    }
    defaultsDialogVisible.value = true
}

const saveGraphDefaults = () => {
    if (defaultsEditGraph.value) {
        const label = toGraphAllowedNamedNode(defaultsDraft.value.label, labelNodes)
        const classNode = toGraphAllowedNamedNode(defaultsDraft.value.class, classObjectNodes)
        const property = toGraphAllowedNamedNode(defaultsDraft.value.property, propertyObjectNodes)
        defaultsEditGraph.value.defaults = {
            ...(label ? { label } : {}),
            ...(classNode ? { class: classNode } : {}),
            ...(property ? { property } : {})
        }
        saveUserGraphsToLocalStorage()
    }
    defaultsDialogVisible.value = false
}

// Helper function to get display name for a graph
const getGraphDisplayName = (graph: GraphDetails) => {
    // If it's a GitHub URL, use the filename
    if (graph.path) {
        return graph.path.split('/').pop()?.replace('.ttl', '') || graph.url
    }
    // Otherwise, extract the last part of the URL
    try {
        const url = new URL(graph.url)
        const pathParts = url.pathname.split('/').filter(Boolean)
        if (pathParts.length > 0) {
            return pathParts[pathParts.length - 1].replace('.ttl', '')
        }
    } catch {
        // If URL parsing fails, use the full URL
    }
    return graph.url
}
</script>

<template>
    <div class="flex items-center justify-between w-full gap-4">
        <!-- Left: Ontology Select & Controls -->
        <div class="flex items-center gap-3 flex-1">
            <!-- Product Title -->
            <div class="flex items-center gap-2 text-lg font-semibold">
                <Network class="h-5 w-5" />
                <span>Konnektr Lexicon</span>
            </div>

            <!-- Loading Spinner -->
            <div
                v-if="Object.values(graphsLoading).some((l) => l)"
                class="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"
            ></div>

            <!-- Ontology Select -->
            <Select
                v-if="userGraphs.length"
                :model-value="selectedOntology?.url"
                @update:model-value="changeSelectedOntology"
            >
                <SelectTrigger class="w-[280px]">
                    <SelectValue placeholder="Select Ontology to Edit">
                        <span v-if="selectedOntology">{{ getGraphDisplayName(selectedOntology) }}</span>
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    <div class="p-2">
                        <div
                            v-for="graph in userGraphs"
                            :key="graph.url"
                            class="group relative flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer"
                            @click="changeSelectedOntology(graph.url)"
                        >
                            <div class="flex items-center gap-2 flex-1 min-w-0">
                                <div
                                    v-if="graphsLoading[graph.url]"
                                    class="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full flex-shrink-0"
                                ></div>
                                <span
                                    class="text-sm truncate"
                                    :title="graph.url"
                                >{{ getGraphDisplayName(graph) }}</span>
                            </div>

                            <div class="flex items-center gap-1 flex-shrink-0">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger as-child>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                class="h-7 w-7"
                                                @click.stop="openUrl(graph.url)"
                                            >
                                                <GitHubIcon
                                                    v-if="graph.repo"
                                                    class="h-3 w-3"
                                                />
                                                <ExternalLink
                                                    v-else
                                                    class="h-3 w-3"
                                                />
                                                <AlertCircle
                                                    v-if="graph.error"
                                                    class="h-3 w-3 text-destructive"
                                                />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {{ graph.error || 'Open URL' }}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>

                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger as-child>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                class="h-7 w-7"
                                                @click.stop="openGraphDefaultsDialog(graph)"
                                            >
                                                <Settings class="h-3 w-3" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent> Set defaults (label, class, property) </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>

                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger as-child>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                class="h-7 w-7"
                                                @click.stop="toggleGraphVisibility(graph)"
                                            >
                                                <Eye
                                                    v-if="graph.visible"
                                                    class="h-3 w-3"
                                                />
                                                <EyeOff
                                                    v-else
                                                    class="h-3 w-3"
                                                />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {{ graph.visible ? 'Hide from tree' : 'Show in tree' }}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    class="h-7 w-7 text-destructive hover:text-destructive"
                                    @click.stop="removeGraph(graph)"
                                >
                                    <Trash2 class="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    <div class="p-2">
                        <Button
                            variant="ghost"
                            class="w-full justify-start"
                            size="sm"
                            @click="showLoadOntologyPage"
                        >
                            <Plus class="mr-2 h-4 w-4" />
                            Create or Import Ontology
                        </Button>
                    </div>
                </SelectContent>
            </Select>

            <!-- Branch Select -->
            <Select
                v-if="userGraphs.length && selectedOntology && selectedOntology.branch"
                :model-value="selectedOntology.branch"
                @update:model-value="changeBranch"
                @click="fetchBranches(selectedOntology)"
            >
                <SelectTrigger class="w-[140px]">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem
                        v-for="branch in selectedOntology.branches ?? []"
                        :key="branch.name"
                        :value="branch.name"
                    >
                        {{ branch.name }}
                    </SelectItem>

                    <Separator />

                    <div class="p-2">
                        <Button
                            variant="ghost"
                            class="w-full justify-start"
                            size="sm"
                            @click="newBranchDialogVisible = true"
                        >
                            <Plus class="mr-2 h-4 w-4" />
                            New Branch
                        </Button>
                    </div>
                </SelectContent>
            </Select>

            <!-- Error Indicator -->
            <TooltipProvider v-if="userGraphs.some((g) => g.error)">
                <Tooltip>
                    <TooltipTrigger as-child>
                        <AlertCircle class="h-5 w-5 text-destructive" />
                    </TooltipTrigger>
                    <TooltipContent>
                        <div class="space-y-1">
                            <p
                                v-for="graph in userGraphs.filter((g) => g.error)"
                                :key="graph.url"
                            >
                                {{ graph.error }}
                            </p>
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <!-- Commit Button -->
            <Button
                v-if="selectedOntology && selectedOntology.branch"
                variant="outline"
                size="sm"
                @click="openCommitDialog"
            >
                Commit
                <Badge
                    v-if="undoStackSize"
                    variant="secondary"
                    class="ml-2"
                >{{ undoStackSize }}</Badge>
            </Button>
        </div>

        <!-- Right-aligned content -->
        <div class="flex items-center gap-3">
            <UserMenu />
        </div>

        <!-- Change Ontology Alert Dialog -->
        <AlertDialog v-model:open="changeOntologyAlertOpen">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Change Ontology</AlertDialogTitle>
                    <AlertDialogDescription>
                        Changing ontologies will remove all unsaved changes. Do you want to proceed?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction @click="confirmOntologyChange">Change Ontology</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <!-- Change Branch Alert Dialog -->
        <AlertDialog v-model:open="changeBranchAlertOpen">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Change Branch</AlertDialogTitle>
                    <AlertDialogDescription>
                        Changing branches will remove all unsaved changes. Do you want to proceed?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction @click="confirmBranchChange">Change Branch</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <!-- New Branch Dialog -->
        <Dialog v-model:open="newBranchDialogVisible">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>New Branch</DialogTitle>
                    <DialogDescription>Create new branch based on current branch.</DialogDescription>
                </DialogHeader>

                <div class="space-y-4 py-4">
                    <div class="text-sm text-muted-foreground">
                        <p><span class="font-semibold">Source:</span> {{ selectedOntology?.branch }}</p>
                    </div>

                    <div class="space-y-2">
                        <label class="text-sm font-medium">Branch Name</label>
                        <Input
                            v-model="newBranchName"
                            placeholder="Enter branch name"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="ghost"
                        @click="newBranchDialogVisible = false"
                    >Cancel</Button>
                    <Button
                        type="button"
                        variant="outline"
                        @click="createNewBranch"
                    >Create</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Commit Dialog -->
        <Dialog v-model:open="commitDialogVisible">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Commit Changes</DialogTitle>
                    <DialogDescription>Commit changes to the selected ontology.</DialogDescription>
                </DialogHeader>

                <div class="space-y-4 py-4">
                    <div class="text-sm text-muted-foreground space-y-1">
                        <p><span class="font-semibold">File:</span> {{ selectedOntology?.url }}</p>
                        <p><span class="font-semibold">Repository:</span> {{ selectedOntology?.repo }}</p>
                        <p><span class="font-semibold">Branch:</span> {{ selectedOntology?.branch }}</p>
                    </div>

                    <div class="space-y-2">
                        <label class="text-sm font-medium">Commit Message</label>
                        <Textarea
                            v-model="commitMessage"
                            rows="5"
                            placeholder="Enter commit message"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="ghost"
                        @click="discardChanges"
                    >Discard</Button>
                    <Button
                        type="button"
                        variant="outline"
                        :disabled="!commitMessage || !commitMessage.length || commitLoading"
                        @click="commitChanges"
                    >
                        <span
                            v-if="commitLoading"
                            class="mr-2 animate-spin"
                        >⏳</span>
                        Commit
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Defaults Dialog -->
        <Dialog v-model:open="defaultsDialogVisible">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Set Graph Defaults</DialogTitle>
                    <DialogDescription>
                        Set default label, class, and property annotations for this graph.
                    </DialogDescription>
                </DialogHeader>

                <div class="space-y-4 py-4">
                    <div class="space-y-2">
                        <label class="text-sm font-medium">Label annotation</label>
                        <Select v-model="defaultsDraft.label">
                            <SelectTrigger>
                                <SelectValue placeholder="Select label annotation" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem
                                    v-for="node in labelNodes"
                                    :key="node.value"
                                    :value="node.value"
                                >
                                    {{ node.value }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div class="space-y-2">
                        <label class="text-sm font-medium">Class annotation</label>
                        <Select v-model="defaultsDraft.class">
                            <SelectTrigger>
                                <SelectValue placeholder="Select class annotation" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem
                                    v-for="node in classObjectNodes"
                                    :key="node.value"
                                    :value="node.value"
                                >
                                    {{ node.value }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div class="space-y-2">
                        <label class="text-sm font-medium">Property annotation</label>
                        <Select v-model="defaultsDraft.property">
                            <SelectTrigger>
                                <SelectValue placeholder="Select property annotation" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem
                                    v-for="node in propertyObjectNodes"
                                    :key="node.value"
                                    :value="node.value"
                                >
                                    {{ node.value }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="ghost"
                        @click="defaultsDialogVisible = false"
                    >Cancel</Button>
                    <Button
                        type="button"
                        variant="outline"
                        @click="saveGraphDefaults"
                    >Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>
