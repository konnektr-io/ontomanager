import { /* computed,  */ computed, ref } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import {
  Store,
  Parser,
  DataFactory,
  NamedNode,
  Literal,
  Quad,
  type Quad_Object,
  type OTerm
} from 'n3'
import gitHubService from '@/services/GitHubService'

const { namedNode, literal /* , blankNode */ } = DataFactory

const vocab = {
  rdf: {
    type: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')
  },
  rdfs: {
    domain: namedNode('http://www.w3.org/2000/01/rdf-schema#domain'),
    range: namedNode('http://www.w3.org/2000/01/rdf-schema#range'),
    subClassOf: namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'),
    subPropertyOf: namedNode('http://www.w3.org/2000/01/rdf-schema#subPropertyOf')
  },
  owl: {
    AnnotationProperty: namedNode('http://www.w3.org/2002/07/owl#AnnotationProperty'),
    Ontology: namedNode('http://www.w3.org/2002/07/owl#Ontology'),
    Restriction: namedNode('http://www.w3.org/2002/07/owl#Restriction'),
    intersectionOf: namedNode('http://www.w3.org/2002/07/owl#intersectionOf')
  },
  sh: {
    name: namedNode('http://www.w3.org/ns/shacl#name'),
    property: namedNode('http://www.w3.org/ns/shacl#property'),
    rule: namedNode('http://www.w3.org/ns/shacl#rule')
  },
  vann: {
    preferredNamespacePrefix: namedNode('http://purl.org/vocab/vann/preferredNamespacePrefix')
  }
}
const classObjectNodes = [
  namedNode('http://www.w3.org/2000/01/rdf-schema#Class'),
  namedNode('http://www.w3.org/2002/07/owl#Class')
]
const labelNodes = [
  namedNode('http://www.w3.org/2000/01/rdf-schema#label'),
  namedNode('http://www.w3.org/2004/02/skos/core#prefLabel')
]
const languages = ['en']

export interface ClassTreeNode {
  key: string
  label: string
  data?: unknown
  icon?: string
  children?: ClassTreeNode[]
}

export interface GraphDetails {
  url: string
  owner?: string
  repo?: string
  branches?: string[]
  branch?: string
  visible?: boolean
  loaded?: boolean
  namespace?: string
  prefixes?: { [prefix: string]: NamedNode<string> }
}

export const useGraphStore = defineStore('graph', () => {
  const store = ref<Store>(new Store())
  const parser = new Parser()

  const builtinVocabularyGraphs = ref<GraphDetails[]>([
    {
      url: '../vocab/rdf.ttl'
    },
    {
      url: '../vocab/rdfs.ttl'
    },
    {
      url: '../vocab/owl.ttl'
    },
    {
      url: '../vocab/skos.ttl'
    }
  ])
  const userGraphs = ref<GraphDetails[]>([])
  const allGraphs = computed(() => [...builtinVocabularyGraphs.value, ...userGraphs.value])
  const visibleGraphIds = computed(() =>
    userGraphs.value.filter((graph) => graph.visible).map((graph) => literal(graph.url))
  )

  const selectedOntology = ref<GraphDetails | null>(null)
  const editMode = computed(
    () =>
      selectedOntology.value?.loaded &&
      selectedOntology.value?.visible &&
      selectedOntology.value?.repo &&
      selectedOntology.value?.owner &&
      selectedOntology.value?.branch
  )

  const initialize = async () => {
    // TODO: Get config from local storage
    getUserGraphsFromLocalStorage()
    for (const graph of allGraphs.value) {
      await loadGraph(graph)
    }
    getClassesTree()
  }

  const getUserGraphsFromLocalStorage = () => {
    const storedGraphs = localStorage.getItem('userGraphs')
    if (storedGraphs) {
      userGraphs.value = JSON.parse(storedGraphs)
    }
  }

  const saveUserGraphsToLocalStorage = () => {
    localStorage.setItem('userGraphs', JSON.stringify(userGraphs.value))
  }

  const loadGraph = async (graph: GraphDetails) => {
    const userGraph = userGraphs.value.find((g) => g.url === graph.url)
    if (userGraph) userGraph.loaded = false
    try {
      let content: string
      if (graph.url.includes('github.com')) {
        const urlParts = graph.url.split('/')
        const owner = urlParts[3]
        const repo = urlParts[4]
        const ref = urlParts[6] || 'main'
        const path = urlParts.slice(7).join('/')
        content = await gitHubService.getFileContent(owner, repo, path, ref)
        if (userGraph) {
          userGraph.owner = owner
          userGraph.repo = repo
          userGraph.branch = ref
        }
      } else {
        const response = await axios.get(graph.url)
        content = response.data
      }
      loadOntology(content, graph)
      if (userGraph) {
        userGraph.loaded = true
        userGraphs.value = [...userGraphs.value]
        saveUserGraphsToLocalStorage
      }
    } catch (error) {
      console.error(`Failed to load ${graph.url}: ${error}`)
    }
  }

  const loadOntology = (ontologyContent: string, graph: GraphDetails) => {
    store.value.deleteGraph(graph.url)

    const graphPrefixes: { [prefix: string]: NamedNode<string> } = {}
    const quads = parser.parse(ontologyContent, null, (prefix, ns) => {
      if (prefix && ns && prefix !== '_' && prefix !== ':')
        graphPrefixes[prefix] = ns as NamedNode<string>
    })
    // Find the owl:Ontology data
    const ontologySubject = quads.find(
      (quad) => quad.object.value === vocab.owl.Ontology.value
    )?.subject
    if (ontologySubject) {
      // Store the main namespace for the ontology
      graph.namespace = ontologySubject?.value
      // Check if there is a preferred prefix for the ontology
      const preferredPrefixObject = quads.find(
        (quad) =>
          quad.subject.value === ontologySubject.value &&
          quad.predicate.value === vocab.vann.preferredNamespacePrefix.value
      )?.object
      // Store the preferred prefix for the ontology
      if (preferredPrefixObject && preferredPrefixObject.termType === 'Literal') {
        graphPrefixes[preferredPrefixObject.value] = namedNode(graph.namespace)
      }
    }
    graph.prefixes = graphPrefixes
    store.value.addQuads(
      quads.map((quad) => new Quad(quad.subject, quad.predicate, quad.object, literal(graph.url)))
    )
  }

  const toggleOntologyVisibility = (url: string): void => {
    const ontologyIndex = userGraphs.value.findIndex((graph) => graph.url === url)
    if (ontologyIndex !== -1) {
      userGraphs.value[ontologyIndex] = {
        ...userGraphs.value[ontologyIndex],
        visible: !userGraphs.value[ontologyIndex].visible
      }
      saveUserGraphsToLocalStorage()
      getClassesTree()
    }
  }

  const addOntology = async (url: string): Promise<void> => {
    const existingUserGraphIndex = userGraphs.value.findIndex((g) => g.url === url)
    if (existingUserGraphIndex !== -1) {
      userGraphs.value.splice(existingUserGraphIndex, 1)
    }

    const graph: GraphDetails = {
      url,
      visible: true,
      loaded: false,
      ...(url.includes('github') && { gitHubUrl: url })
    }
    await loadGraph(graph)
    userGraphs.value.push(graph)
    saveUserGraphsToLocalStorage()
    getClassesTree()
  }

  const removeOntology = (url: string): void => {
    const graphIndex = userGraphs.value.findIndex((graph) => graph.url === url)
    if (graphIndex !== -1) {
      store.value.deleteGraph(url)
      userGraphs.value.splice(graphIndex, 1)
      saveUserGraphsToLocalStorage()
      getClassesTree()
    }
  }

  const createClassTreeNode = (classUri: string): ClassTreeNode => {
    const subClasses = getVisibleSubClasses(classUri)
    const children: ClassTreeNode[] = []
    subClasses.forEach((subClass) => {
      children.push(createClassTreeNode(subClass))
    })
    return {
      key: classUri,
      label: getLabel(classUri),
      data: getPrefixedUri(classUri),
      children
    }
  }

  const classesTree = ref<ClassTreeNode[]>([])
  const getClassesTree = () => {
    const rootClasses = getRootClasses()
    const tree: ClassTreeNode[] = []

    rootClasses.forEach((rootClass) => {
      tree.push(createClassTreeNode(rootClass))
    })

    classesTree.value = tree
  }

  const getRootClasses = (): string[] => {
    const classes = new Set<string>()
    const allClasses = getAllVisibleClasses()
    const subClasses = new Set<string>()

    allClasses.forEach((classUri) => {
      const subs = getVisibleSubClasses(classUri)
      subs.forEach((sub) => subClasses.add(sub))
    })

    allClasses.forEach((classUri) => {
      if (!subClasses.has(classUri)) {
        classes.add(classUri)
      }
    })

    return Array.from(classes)
  }

  const getAllVisibleClasses = (): string[] => {
    const classes = new Set<string>()
    visibleGraphIds.value.forEach((graphId) => {
      classObjectNodes.forEach((classNode) => {
        store.value.getSubjects(vocab.rdf.type, classNode, graphId).forEach((subject) => {
          if (subject.termType !== 'BlankNode') classes.add(subject.value)
        })
      })
    })

    return Array.from(classes)
  }

  const getVisibleSubjects = (
    predicate: NamedNode<string>,
    object: NamedNode<string>
  ): string[] => {
    const subjects = new Set<string>()
    visibleGraphIds.value.forEach((graphId) => {
      store.value.getQuads(null, predicate, null, graphId).forEach((quad) => {
        if (quad.object.equals(object)) subjects.add(quad.subject.value)
        // TODO: This is crazy inefficient if shacl is used, this is only useful for owl:intersectionOf
        // TODO: do this separately in the shacl properties and restrictions
        else if (quad.object.termType === 'BlankNode') {
          store.value.getQuads(quad.object, null, null, graphId).forEach((subQuad) => {
            if (subQuad.object.equals(object)) {
              subjects.add(subQuad.subject.value)
            } else if (
              subQuad.object.termType === 'BlankNode' &&
              subQuad.predicate.value === vocab.owl.intersectionOf.value
            ) {
              store.value.getQuads(subQuad.object, null, null, graphId).forEach((subSubQuad) => {
                if (subSubQuad.object.equals(object)) {
                  subjects.add(quad.subject.value)
                }
              })
            }
          })
        }
      })
    })
    return Array.from(subjects)
  }

  const getVisibleSubClasses = (classUri: string): string[] => {
    return getVisibleSubjects(vocab.rdfs.subClassOf, namedNode(classUri))
  }

  const getVisibleProperties = (classUri: string): string[] => {
    return getVisibleSubjects(vocab.rdfs.domain, namedNode(classUri))
  }

  const getVisibleRanges = (propertyUri: string): Quad_Object[] => {
    const ranges = new Set<Quad_Object>()
    store.value.getObjects(namedNode(propertyUri), vocab.rdfs.range, null).forEach((object) => {
      ranges.add(object)
    })
    return Array.from(ranges)
  }

  const getRestrictions = (classUri: string): string[] => {
    const restrictions = new Set<string>()
    store.value.getQuads(namedNode(classUri), vocab.rdfs.subClassOf, null, null).forEach((quad) => {
      if (quad.object.termType === 'BlankNode') {
        const restrictionNode = quad.object.value
        const property = getObjectValue(restrictionNode, 'http://www.w3.org/2002/07/owl#onProperty')
        if (property) {
          restrictions.add(property)
        }
      }
    })
    return Array.from(restrictions)
  }

  const getLabel = (uri: string): string => {
    for (const labelNode of labelNodes) {
      const label = getObjectValue(uri, labelNode.value)
      if (label) {
        return label
      }
    }
    return uri?.split('/').pop()?.split('#').pop() || uri
  }

  /*   const getAnnotationProperties = (): string[] => {
    const properties = new Set<string>()
    const quads = store.value.getQuads(
      null,
      vocab.rdf.type,
      namedNode('http://www.w3.org/2002/07/owl#AnnotationProperty'),
      null
    )
    quads.forEach((quad) => {
      properties.add(quad.subject.value)
    })
    return Array.from(properties)
  } */

  const getSubjectQuads = (uri: string): Quad[] => {
    return store.value.getQuads(namedNode(uri), null, null, null)
  }

  const getShaclPropertyQuads = (uri: string): Quad[] => {
    return store.value.getQuads(namedNode(uri), vocab.sh.property, null, null)

    /*     const quads = store.value.getQuads(namedNode(uri), vocab.sh.property, null, null)
    const expandedQuads: Quad[] = []

    quads.forEach((quad) => {
      if (quad.object.termType === 'BlankNode') {
        const blankNodeQuads = store.value.getQuads(quad.object, null, null, null)
        expandedQuads.push(...blankNodeQuads)
      } else {
        expandedQuads.push(quad)
      }
    })
    return expandedQuads */
  }

  const getObjectValue = (subject: string, predicate: string): string | null => {
    const quads = store.value.getQuads(namedNode(subject), namedNode(predicate), null, null)
    const quad =
      quads.find(
        (q) => q.object.termType !== 'Literal' || languages.includes((q.object as Literal).language)
      ) || quads[0]
    return quad ? quad.object.value : null
  }

  const getPrefixedUri = (uri: string): string => {
    // TODO pass the correct graph id
    for (const graph of allGraphs.value) {
      const prefixes = graph.prefixes
      for (const prefix in prefixes) {
        const ns = prefixes[prefix].value
        if (uri.startsWith(ns)) {
          return `${prefix}:${uri.slice(ns.length)}`
        }
      }
    }
    return uri
  }

  const getQuads = (subject: OTerm, predicate: OTerm, object: OTerm | OTerm[], graph: OTerm) => {
    return store.value.getQuads(subject, predicate, object, graph)
  }

  const addQuad = (
    graphUrl: string,
    subject: NamedNode<string>,
    predicate: NamedNode<string>,
    object: NamedNode | Literal
  ) => {
    store.value.addQuad(subject, predicate, object, namedNode(graphUrl))
  }

  const editQuad = (
    graphUrl: string,
    subject: NamedNode<string>,
    predicate: NamedNode<string>,
    oldObject: NamedNode | Literal,
    newObject: NamedNode | Literal
  ) => {
    store.value.removeQuad(subject, predicate, oldObject, namedNode(graphUrl))
    store.value.addQuad(subject, predicate, newObject, namedNode(graphUrl))
  }

  const removeQuad = (
    graphUrl: string,
    subject: NamedNode<string>,
    predicate: NamedNode<string>,
    object: NamedNode | Literal
  ) => {
    store.value.removeQuad(subject, predicate, object, namedNode(graphUrl))
  }

  return {
    userGraphs,
    selectedOntology,
    editMode,

    initialize,
    toggleOntologyVisibility,
    addOntology,
    removeOntology,
    classesTree,

    getProperties: getVisibleProperties,
    getRanges: getVisibleRanges,
    getRestrictions,
    getLabel,
    getSubjectQuads,
    getShaclPropertyQuads,
    getPrefixedUri,

    getQuads,
    addQuad,
    editQuad,
    removeQuad
  }
})
