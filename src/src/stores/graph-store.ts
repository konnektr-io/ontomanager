import { /* computed,  */ computed, ref, shallowRef } from 'vue'
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
import { vocab } from './vocab'

const { namedNode, literal /* , blankNode */ } = DataFactory

const classObjectNodes = [vocab.rdfs.Class, vocab.owl.Class]
const labelNodes = [vocab.rdfs.label, vocab.skos.prefLabel]

export enum TreeType {
  Classes = 'classes',
  Properties = 'properties'
}

export interface ClassTreeNode {
  key: string
  label: string
  data?: {
    graph: string
    prefixedUri: string
  }
  icon?: string
  children: ClassTreeNode[]
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
  const selectedResource = ref<string>()

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
    await getClassesTree()
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

  const toggleOntologyVisibility = async (url: string): Promise<void> => {
    const ontologyIndex = userGraphs.value.findIndex((graph) => graph.url === url)
    if (ontologyIndex !== -1) {
      userGraphs.value[ontologyIndex] = {
        ...userGraphs.value[ontologyIndex],
        visible: !userGraphs.value[ontologyIndex].visible
      }
      saveUserGraphsToLocalStorage()
      await getClassesTree()
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
    await getClassesTree()
  }

  const removeOntology = async (url: string): Promise<void> => {
    const graphIndex = userGraphs.value.findIndex((graph) => graph.url === url)
    if (graphIndex !== -1) {
      store.value.deleteGraph(url)
      userGraphs.value.splice(graphIndex, 1)
      saveUserGraphsToLocalStorage()
      await getClassesTree()
    }
  }

  const getVisibleSubjects = async (
    predicate: NamedNode<string>,
    object: NamedNode<string>
  ): Promise<string[]> => {
    const subjects = new Set<string>()
    const promises = visibleGraphIds.value.map(async (graphId) => {
      await new Promise<void>((resolve) =>
        setTimeout(() => {
          const quads = store.value.getQuads(null, predicate, null, graphId)
          for (const quad of quads) {
            if (quad.subject.termType !== 'NamedNode') continue
            if (quad.object.equals(object)) {
              subjects.add(quad.subject.value)
            } else if (quad.object.termType === 'BlankNode') {
              const subQuads = store.value.getQuads(quad.object, null, null, graphId)
              for (const subQuad of subQuads) {
                if (subQuad.object.equals(object)) {
                  subjects.add(quad.subject.value)
                } else if (
                  subQuad.object.termType === 'BlankNode' &&
                  subQuad.predicate.value === vocab.owl.intersectionOf.value // This only makes sense for intersection of
                ) {
                  const subSubQuads = store.value.getQuads(subQuad.object, null, null, graphId)
                  for (const subSubQuad of subSubQuads) {
                    if (subSubQuad.object.equals(object)) {
                      subjects.add(quad.subject.value)
                    }
                  }
                }
              }
            }
          }
          resolve()
        }, 0)
      )
    })
    await Promise.all(promises)
    return Array.from(subjects)
  }

  const getVisibleSubjectsSync = (
    predicate: NamedNode<string>,
    object: NamedNode<string>
  ): string[] => {
    const subjects = new Set<string>()
    for (const graphId of visibleGraphIds.value) {
      const quads = store.value.getQuads(null, predicate, null, graphId)
      for (const quad of quads) {
        if (quad.subject.termType !== 'NamedNode') continue
        if (quad.object.equals(object)) {
          subjects.add(quad.subject.value)
        } else if (quad.object.termType === 'BlankNode') {
          const subQuads = store.value.getQuads(quad.object, null, null, graphId)
          for (const subQuad of subQuads) {
            if (subQuad.object.equals(object)) {
              subjects.add(quad.subject.value)
            } else if (
              subQuad.object.termType === 'BlankNode' &&
              subQuad.predicate.value === vocab.owl.intersectionOf.value // This only makes sense for intersection of
            ) {
              const subSubQuads = store.value.getQuads(subQuad.object, null, null, graphId)
              for (const subSubQuad of subSubQuads) {
                if (subSubQuad.object.equals(object)) {
                  subjects.add(quad.subject.value)
                }
              }
            }
          }
        }
      }
    }
    return Array.from(subjects)
  }

  /* const createClassTreeNode = async (classUri: string): Promise<ClassTreeNode> => {
    const subClasses = await getSubClasses(classUri)
    const children: ClassTreeNode[] = []
    for (const subClass of subClasses) {
      children.push(await createClassTreeNode(subClass))
    }
    return {
      key: classUri,
      label: getLabel(classUri),
      data: getPrefixedUri(classUri),
      children
    }
  } */

  /* const createClassTreeNode = async (
    quad: Quad,
    allQuads: Quad[]
  ): Promise<ClassTreeNode> => {


    return {
      key: classUri,
      label: getLabel(classUri),
      data: getPrefixedUri(classUri),
      graph: graphId,
      children
    }
  } */

  const classesTree = ref<ClassTreeNode[]>([])
  const getClassesTree = async () => {
    const allClassTreeNodesMap: { [classUri: string]: ClassTreeNode } = {}
    const allClassTypeQuads: Quad[] = []
    for (const graph of visibleGraphIds.value) {
      for (const classNode of classObjectNodes) {
        store.value.getQuads(null, vocab.rdf.type, classNode, graph).forEach((quad) => {
          if (quad.subject.termType === 'NamedNode') {
            allClassTypeQuads.push(quad)
          }
        })
      }
    }
    /** Holds the class uris for all classes that are a subclass of another class (to filter the root classes) */
    const allSubClasses = new Set<string>()

    const createClassTreeNodeRecursive = async (classTypeQuad: Quad): Promise<ClassTreeNode> => {
      const classUri = classTypeQuad.subject.value
      // Get all subclasses
      const subClassQuads: Quad[] = []
      for (const graph of visibleGraphIds.value) {
        store.value
          .getQuads(null, vocab.rdfs.subClassOf, namedNode(classUri), graph)
          .forEach((quad) => {
            if (
              // Make sure it's a class
              allClassTypeQuads.find((q) => q.subject.value === quad.subject.value)
            ) {
              subClassQuads.push(quad)
            }
          })
      }
      const children: ClassTreeNode[] = []
      for (const subClassQuad of subClassQuads) {
        const subClass = subClassQuad.subject.value
        allSubClasses.add(subClass)
        if (allClassTreeNodesMap[subClass]) {
          children.push(allClassTreeNodesMap[subClass])
        } else {
          allClassTreeNodesMap[subClass] = await createClassTreeNodeRecursive(subClassQuad)
          children.push(allClassTreeNodesMap[subClass])
        }
      }
      return {
        key: classUri,
        label: getLabel(classUri),
        data: {
          prefixedUri: getPrefixedUri(classUri),
          graph: classTypeQuad.graph.value
        },
        children
      }
    }

    for (const quad of allClassTypeQuads) {
      const classUri = quad.subject.value
      if (allSubClasses.has(classUri) || allClassTreeNodesMap[classUri]) continue
      allClassTreeNodesMap[classUri] = await createClassTreeNodeRecursive(quad)
    }

    // Get subclasses from intersections
    // This needs to be done after all the other class tree nodes have been created
    store.value.getQuads(null, vocab.owl.intersectionOf, null, null).forEach((quad) => {
      let subClass: string | null = null
      store.value.getQuads(null, null, quad.subject, null).forEach((quad) => {
        if (allClassTreeNodesMap[quad.subject.value]) {
          // Found child class (there should only be one in this case)
          subClass = quad.subject.value
          allSubClasses.add(subClass)
        }
      })

      if (!subClass) return
      store.value.getQuads(quad.object, null, null, null).forEach((quad) => {
        // Now push the children
        if (allClassTreeNodesMap[quad.object.value] && subClass && allClassTreeNodesMap[subClass]) {
          allClassTreeNodesMap[quad.object.value].children.push(allClassTreeNodesMap[subClass])
        }
      })
    })

    classesTree.value = Object.values(allClassTreeNodesMap).filter(
      (node) => !allSubClasses.has(node.key)
    )
    return classesTree.value
  }

  /*   const classesTree = ref<ClassTreeNode[]>([])
  const getClassesTree = async () => {
    const rootClasses = getRootClasses()
    const tree: ClassTreeNode[] = []

    for (const rootClass of rootClasses) {
      tree.push(await createClassTreeNode(rootClass))
    }

    classesTree.value = tree
  } */

  /*   const getRootClasses = async (): string[] => {
    const classes = new Set<string>()
    const allClasses = getAllClasses()
    const subClasses = new Set<string>()

    for (const classUri of allClasses) {
      const subs = await getSubClasses(classUri)
      subs.forEach((sub) => subClasses.add(sub))
    }

    
    allClasses.forEach((classUri) => {
      if (!subClasses.has(classUri)) {
        classes.add(classUri)
      }
    })

    return Array.from(classes)
  } */

  /*   const getRootClasses = async (): Promise<string[]> => {
    const classes = new Set<string>()
    visibleGraphIds.value.forEach((graphId) => {
      classObjectNodes.forEach((classNode) => {
        store.value.getSubjects(vocab.rdf.type, classNode, graphId).forEach((subject) => {
          if (
            subject.termType !== 'BlankNode' &&
            // Check whether the class is not a subclass of another class
            store.value
              .getObjects(subject, vocab.rdfs.subClassOf, graphId)
              .filter(
                (o) =>
                  o.termType === 'NamedNode' ||
                  (!o.equals(vocab.owl.Class) &&
                    !o.equals(vocab.rdfs.Class) &&
                    !o.equals(vocab.owl.Thing))
              ).length === 0
          ) {
            classes.add(subject.value)
          }
        })
      })
    })

    return Array.from(classes)
  } */

  const getSubClasses = async (classUri: string): Promise<string[]> => {
    return getVisibleSubjects(vocab.rdfs.subClassOf, namedNode(classUri))
  }

  const getProperties = (classUri: string): Promise<string[]> => {
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

  const getSubjectQuads = (uri: OTerm): Quad[] => {
    return store.value.getQuads(uri, null, null, null)
  }

  const getShaclPropertyQuads = (uri: string): Quad[] => {
    return store.value.getQuads(namedNode(uri), vocab.sh.property, null, null)
  }

  const getObjectValue = (subject: string, predicate: string): string | null => {
    const quads = store.value.getQuads(namedNode(subject), namedNode(predicate), null, null)
    const quad =
      quads.find(
        (q) => q.object.termType !== 'Literal' || ['en'].includes((q.object as Literal).language)
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

  const getRdfTypes = (uri: string): string[] => {
    const quads = store.value.getQuads(namedNode(uri), vocab.rdf.type, null, null)
    return quads.map((quad) => getPrefixedUri(quad.object.value))
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
    selectedResource,
    editMode,

    initialize,
    toggleOntologyVisibility,
    addOntology,
    removeOntology,
    classesTree,

    // getRootClasses,
    getSubClasses,

    getProperties: getProperties,
    getRanges: getVisibleRanges,
    getRestrictions,
    getLabel,
    getSubjectQuads,
    getShaclPropertyQuads,
    getPrefixedUri,

    getRdfTypes,

    getQuads,
    addQuad,
    editQuad,
    removeQuad
  }
})
