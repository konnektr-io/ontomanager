<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
import { useGitHubStore } from '@/stores/github'
import { useGraphStore } from '@/stores/graph'
import gitHubService from '@/services/GitHubService'
import CreateOntologyDialog from '@/components/CreateOntologyDialog.vue'
import { GitHubIcon } from 'vue3-simple-icons'

const { isSignedIn, username } = storeToRefs(useGitHubStore())
const { loginToGitHub } = useGitHubStore()
const { userGraphs } = storeToRefs(useGraphStore())
const { addGraph } = useGraphStore()
const newOntologyUrl = ref('')

const predefinedOntologies: {
    name: string
    description: string
    urls: string[]
    visible: boolean | (() => boolean)
}[] = [{
    name: 'SML',
    description: 'Building information modelling (BIM) - Semantic modelling and linking (SML) - CEN-EN 17632',
    urls: ['https://docs.crow.nl/sml/data/concat/sml.ttl'],
    visible: true
}, {
    name: 'BOT',
    description: 'The Building Topology Ontology (BOT) is a minimal ontology for describing the core topological concepts of a building.',
    urls: ['http://www.w3id.org/bot/bot.ttl'],
    visible: true
}, {
    name: 'RealEstateCore',
    description: 'RealEstateCore (REC) is an ontology for building-related data and applications.',
    urls: ['https://github.com/RealEstateCore/rec/blob/main/Source/SHACL/RealEstateCore/rec.ttl'],
    visible: () => isSignedIn.value
}, {
    name: 'DPROD + DCAT',
    description: 'The Data Product (DPROD) specification is a profile of the Data Catalog (DCAT) Vocabulary, designed to describe Data Products.',
    urls: ['https://ekgf.github.io/dprod/dprod.ttl', 'https://ekgf.github.io/dprod/dprod-shapes.ttl', 'https://www.w3.org/ns/dcat3.ttl'],
    visible: true
}, {
    name: 'International Data Spaces (IDS)',
    description: 'The International Data Spaces (IDS) is a peer-to-peer network, a virtual data space that supports the secure exchange and the simple linking of data in business eco-systems on the basis of standards.',
    urls: ['https://international-data-spaces-association.github.io/InformationModel/docs/serializations/ontology.ttl'],
    visible: true
}]

const importOntology = (urls: string | string[]) => {
    addGraph(urls)
    newOntologyUrl.value = ''
}

const repositories = ref<Awaited<ReturnType<typeof gitHubService.getRepositories>>>([])
watch(isSignedIn, async () => {
    if (isSignedIn.value && username.value) {
        repositories.value = (await gitHubService.getRepositories(username.value)).filter(repo => repo.permissions?.push)
    }
}, { immediate: true })

const ontologyRepository = ref<string>()
const branches = ref<string[]>([])
watch(ontologyRepository, async () => {
    if (ontologyRepository.value) {
        const repo = repositories.value.find(repo => repo.full_name === ontologyRepository.value)
        if (!repo) return
        const [owner, repoName] = repo.full_name.split('/')
        branches.value = (await gitHubService.getBranches(owner, repoName)).map(branch => branch.name)
    }
}, { immediate: true })

const ontologyBranch = ref<string>('main')
const createNewOntologyFilePath = ref<string>()

const ontologyFilesOptions = ref<string[]>([])
const ontologyFile = ref<string>()
const fileSearchQuery = ref<string>('')
const filesLoading = ref(false)

const fetchBranchFiles = async () => {
    if (ontologyBranch.value && ontologyRepository.value) {
        filesLoading.value = true
        const repo = repositories.value.find(repo => repo.full_name === ontologyRepository.value)
        if (!repo) {
            filesLoading.value = false
            return
        }
        const [owner, repoName] = repo.full_name.split('/')
        try {
            ontologyFilesOptions.value = await gitHubService.getTurtleFiles(owner, repoName, ontologyBranch.value)
        } catch (error) {
            console.error('Error fetching turtle files:', error)
            ontologyFilesOptions.value = []
        } finally {
            filesLoading.value = false
        }
    }
}

// Computed filtered files based on search query
const filteredOntologyFiles = computed(() => {
    if (!fileSearchQuery.value) {
        return ontologyFilesOptions.value
    }
    const query = fileSearchQuery.value.toLowerCase()
    return ontologyFilesOptions.value.filter(file => file.toLowerCase().includes(query))
})

watch(ontologyRepository, () => {
    ontologyFile.value = undefined
    fetchBranchFiles()
})
watch(ontologyBranch, () => {
    ontologyFile.value = undefined
    fetchBranchFiles()
})

// Dialog state
const createDialogOpen = ref(false)

const handleImportFromGitHub = () => {
    if (ontologyRepository.value && ontologyBranch.value && ontologyFile.value) {
        importOntology(`https://github.com/${ontologyRepository.value}/blob/${ontologyBranch.value}/${ontologyFile.value}`)
    }
}
</script>

<template>
    <div class="bg-background px-6 py-12 md:px-12 lg:px-20">
        <div class="mb-12 font-bold text-xl">
            <span
                v-if="!userGraphs.length"
                class="text-foreground"
            >Get Started</span>
            <span
                v-else
                class="text-foreground"
            >Create or import ontologies</span>
        </div>

        <!-- Sign in section -->
        <div v-if="!isSignedIn">
            <div class="text-lg font-bold text-muted-foreground mb-2">
                Sign in to GitHub
            </div>
            <Button
                variant="outline"
                class="mb-12"
                @click="loginToGitHub()"
            >
                <GitHubIcon class="h-4 w-4 mr-2" />
                Sign in
            </Button>
        </div>

        <!-- Create new ontology section -->
        <div v-if="isSignedIn">
            <div class="text-lg font-bold text-muted-foreground mb-2">
                Create a new ontology
            </div>
            <div class="flex items-center gap-4 mb-4">
                <Select v-model="ontologyRepository">
                    <SelectTrigger class="flex-auto">
                        <SelectValue placeholder="Choose repository" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem
                            v-for="repo in repositories"
                            :key="repo.full_name"
                            :value="repo.full_name"
                        >
                            {{ repo.full_name }}
                        </SelectItem>
                    </SelectContent>
                </Select>

                <Select v-model="ontologyBranch">
                    <SelectTrigger class="flex-auto">
                        <SelectValue placeholder="Choose branch" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem
                            v-for="branch in branches"
                            :key="branch"
                            :value="branch"
                        >
                            {{ branch }}
                        </SelectItem>
                    </SelectContent>
                </Select>

                <Input
                    v-model="createNewOntologyFilePath"
                    placeholder="new-ontology.ttl"
                    class="flex-auto"
                />

                <Dialog v-model:open="createDialogOpen">
                    <DialogTrigger as-child>
                        <Button variant="outline">
                            Create
                        </Button>
                    </DialogTrigger>
                    <CreateOntologyDialog
                        v-if="ontologyRepository && createNewOntologyFilePath"
                        :repository="ontologyRepository"
                        :file-path="createNewOntologyFilePath"
                        :branch="ontologyBranch"
                        @close="createDialogOpen = false"
                    />
                </Dialog>
            </div>
            <div class="text-muted-foreground mb-12">
                Select the repository and file path to create a new ontology.
            </div>
        </div>

        <!-- Import ontology section -->
        <div class="text-lg font-bold text-muted-foreground mb-2">
            Import an ontology
        </div>

        <!-- Import from GitHub -->
        <div v-if="isSignedIn">
            <div class="text-muted-foreground mb-2">
                From your GitHub repository
            </div>
            <div class="flex items-center gap-4 mb-4">
                <Select v-model="ontologyRepository">
                    <SelectTrigger class="flex-auto">
                        <SelectValue placeholder="Choose repository" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem
                            v-for="repo in repositories"
                            :key="repo.full_name"
                            :value="repo.full_name"
                        >
                            {{ repo.full_name }}
                        </SelectItem>
                    </SelectContent>
                </Select>

                <Select v-model="ontologyBranch">
                    <SelectTrigger class="flex-auto">
                        <SelectValue placeholder="Choose branch" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem
                            v-for="branch in branches"
                            :key="branch"
                            :value="branch"
                        >
                            {{ branch }}
                        </SelectItem>
                    </SelectContent>
                </Select>

                <Select v-model="ontologyFile">
                    <SelectTrigger>
                        <SelectValue placeholder="Choose .ttl file" />
                    </SelectTrigger>
                    <SelectContent>
                        <div
                            v-if="filesLoading"
                            class="p-4 text-center text-muted-foreground"
                        >
                            Loading files...
                        </div>
                        <div
                            v-else-if="!filteredOntologyFiles.length"
                            class="p-4 text-center text-muted-foreground"
                        >
                            {{ ontologyFilesOptions.length ? 'No matching files' : 'No .ttl files found' }}
                        </div>
                        <SelectItem
                            v-for="file in filteredOntologyFiles"
                            :key="file"
                            :value="file"
                        >
                            {{ file }}
                        </SelectItem>
                    </SelectContent>
                </Select>

                <Button
                    variant="outline"
                    @click="handleImportFromGitHub"
                >
                    Import
                </Button>
            </div>

            <div class="text-muted-foreground mb-2">
                Or by URL
            </div>
        </div>

        <!-- Import by URL -->
        <div class="flex items-center gap-4 mb-4">
            <Input
                v-model="newOntologyUrl"
                placeholder="Enter ontology URL"
                class="flex-auto"
            />
            <Button
                variant="outline"
                @click="importOntology(newOntologyUrl)"
            >
                Import
            </Button>
        </div>

        <div class="text-muted-foreground mb-1">
            Load ontologies in .ttl format (eg.
            <span
                class="italic hover:text-foreground hover:underline cursor-pointer"
                @click="newOntologyUrl = 'https://github.com/konnektr-io/ontologies/blob/main/pizza.ttl'"
            >https://github.com/konnektr-io/ontologies/blob/main/pizza.ttl</span>).
        </div>
        <div class="text-muted-foreground mb-12">
            <span
                class="hover:text-foreground hover:underline cursor-pointer"
                @click="loginToGitHub"
            >Sign in</span> to load (and edit) ontologies hosted on GitHub.
        </div>

        <!-- Predefined ontologies -->
        <div class="text-muted-foreground mb-2">
            Or import one of these ontologies:
        </div>
        <div class="flex flex-wrap gap-4">
            <Card
                v-for="ontology in predefinedOntologies.filter(ontology => typeof ontology.visible === 'function' ? ontology.visible() : ontology.visible)"
                :key="ontology.urls.join('_')"
                class="cursor-pointer w-[15rem] hover:border-primary transition-colors"
                @click="importOntology(ontology.urls)"
            >
                <CardHeader>
                    <CardTitle>{{ ontology.name }}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p class="text-sm text-muted-foreground">{{ ontology.description }}</p>
                </CardContent>
            </Card>
        </div>
    </div>
</template>
