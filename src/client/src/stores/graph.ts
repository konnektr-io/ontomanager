import { /* computed,  */ computed, ref } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import { DataFactory, NamedNode, Literal, Quad, Writer, BlankNode } from 'n3'
import type { Quad_Object, OTerm, BlankTriple } from 'n3'
import gitHubService from '@/services/GitHubService'
import graphStoreService from '@/services/GraphStoreService'
import { vocab } from './vocab'
import rdfVocab from '../assets/vocab/rdf.ttl?raw'
import rdfsVocab from '../assets/vocab/rdfs.ttl?raw'
import owlVocab from '../assets/vocab/owl.ttl?raw'
import skosVocab from '../assets/vocab/skos.ttl?raw'

const { namedNode, literal /* , blankNode */ } = DataFactory

const classObjectNodes = [vocab.rdfs.Class, vocab.owl.Class]
const propertyObjectNodes = [
  vocab.rdfs.Property,
  vocab.owl.ObjectProperty,
  vocab.owl.DatatypeProperty
]
// const annotationPropertyNodes = [vocab.owl.AnnotationProperty]
const labelNodes = [vocab.rdfs.label, vocab.skos.prefLabel]

export enum TreeType {
  Classes = 'classes',
  Decomposition = 'decomposition',
  Properties = 'properties',
  Individuals = 'individuals'
}

export interface ResourceTreeNode {
  key: string
  label: string
  data?: {
    graph: string
    prefixedUri: string
  }
  icon?: string
  children: ResourceTreeNode[]
}

export interface GraphDetails {
  url: string
  owner?: string
  repo?: string
  branches?: string[]
  branch?: string
  path?: string
  visible?: boolean
  loaded?: boolean
  namespace?: string
  node?: NamedNode<string>
  prefixes?: { [prefix: string]: NamedNode<string> }
}

interface BuiltinGraphDetails extends GraphDetails {
  content: string
}

const builtinGraphs: BuiltinGraphDetails[] = [
  {
    content: owlVocab,
    url: 'https://www.w3.org/2002/07/owl',
    namespace: 'https://www.w3.org/2002/07/owl#',
    visible: false,
    loaded: false,
    prefixes: {}
  },
  {
    content: rdfVocab,
    url: 'https://www.w3.org/2000/01/rdf-schema',
    namespace: 'https://www.w3.org/2000/01/rdf-schema#',
    visible: false,
    loaded: false,
    prefixes: {}
  },
  {
    content: rdfsVocab,
    url: 'https://www.w3.org/1999/02/22-rdf-syntax-ns',
    namespace: 'https://www.w3.org/1999/02/22-rdf-syntax-ns#',
    visible: false,
    loaded: false,
    prefixes: {}
  },
  {
    content: skosVocab,
    url: 'http://www.w3.org/2004/02/skos/core',
    namespace: 'http://www.w3.org/2004/02/skos/core#',
    visible: false,
    loaded: false,
    prefixes: {}
  }
]

export const commonDataTypes = [
  vocab.xsd.string,
  vocab.xsd.integer,
  vocab.xsd.decimal,
  vocab.xsd.boolean,
  vocab.xsd.dateTime,
  vocab.xsd.date,
  vocab.xsd.time
  // vocab.rdf.langString
]

export const useGraphStore = defineStore('graph', () => {
  const userGraphs = ref<GraphDetails[]>([])

  const visibleGraphNodes = computed<NamedNode[]>(() =>
    userGraphs.value
      .filter((graph) => graph.visible && graph.node)
      .map<NamedNode>((graph) => graph.node as NamedNode)
  )

  const selectedOntology = ref<GraphDetails | null>(null)
  const selectedResource = ref<string | null>(null)

  const editMode = computed(() =>
    selectedOntology.value?.loaded &&
    selectedOntology.value.visible &&
    selectedOntology.value.repo &&
    selectedOntology.value.owner &&
    selectedOntology.value.branch
      ? true
      : false
  )

  const initialize = async () => {
    for (const graph of builtinGraphs) {
      loadOntology(graph.content, graph)
    }

    // TODO: Get config from local storage
    getUserGraphsFromLocalStorage()
    for (const graph of userGraphs.value) {
      await loadGraph(graph)
    }
    // TODO: only run these if the relevant tree is visible
    await getClassesTree()
    await getDecompositionTree()
    await getPropertiesTree()
    await getIndividualsTree()
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
    const userGraph = userGraphs.value.find((g) => g.node === graph.node)
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
          userGraph.path = path
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
      /* const toast = useToast()
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: `Failed to load ${graph.url}: ${error}`,
        life: 3000
      }) */
      console.error(`Failed to load ${graph.url}: ${error}`)
    }
  }

  const loadOntology = (ontologyContent: string, graph: GraphDetails) => {
    if (graph.node) graphStoreService.store.deleteGraph(graph.node)

    const graphPrefixes: { [prefix: string]: NamedNode<string> } = {}
    const quads = graphStoreService.parser.parse(ontologyContent, null, (prefix, ns) => {
      if (prefix && ns && prefix !== '_' && prefix !== ':')
        graphPrefixes[prefix] = ns as NamedNode<string>
    })
    // Find the owl:Ontology data
    const ontologySubject = quads.find(
      (quad) =>
        quad.object.value === vocab.owl.Ontology.value ||
        quad.object.value === vocab.skos.ConceptScheme.value
    )?.subject
    if (ontologySubject) {
      // Store the main namespace for the ontology
      graph.namespace = ontologySubject.value
      graph.node = namedNode(ontologySubject.value)
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
    } else {
      graph.node = namedNode(
        graph.namespace || (graph.path && `${graph.repo}_${graph.path}`) || graph.url
      ) // TODO: URL might cause issues on github, but then there would be repo and path
    }
    graph.prefixes = graphPrefixes
    graphStoreService.store.addQuads(
      quads.map((quad) => new Quad(quad.subject, quad.predicate, quad.object, graph.node))
    )
  }

  const toggleOntologyVisibility = async (g: GraphDetails): Promise<void> => {
    const ontologyIndex = userGraphs.value.findIndex((graph) => graph.node?.value === g.node?.value)
    if (ontologyIndex !== -1) {
      userGraphs.value[ontologyIndex] = {
        ...userGraphs.value[ontologyIndex],
        visible: !userGraphs.value[ontologyIndex].visible
      }
      saveUserGraphsToLocalStorage()
      await getClassesTree()
      await getDecompositionTree()
      await getPropertiesTree()
      await getIndividualsTree()
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
      prefixes: {},
      ...(url.includes('github') && { gitHubUrl: url })
    }
    await loadGraph(graph)
    userGraphs.value.push(graph)
    saveUserGraphsToLocalStorage()
    await getClassesTree()
    await getDecompositionTree()
    await getPropertiesTree()
    await getIndividualsTree()
  }

  const removeOntology = async (g: GraphDetails): Promise<void> => {
    const graphIndex = userGraphs.value.findIndex((graph) => graph.node?.value === g.node?.value)
    if (g.node?.value && graphIndex !== -1) {
      graphStoreService.store.deleteGraph(g.node)
      userGraphs.value.splice(graphIndex, 1)
      saveUserGraphsToLocalStorage()
      await getClassesTree()
      await getDecompositionTree()
      await getPropertiesTree()
      await getIndividualsTree()
    }
  }

  const getVisibleSubjects = async (
    predicate: NamedNode<string>,
    object: NamedNode<string>
  ): Promise<string[]> => {
    const subjects = new Set<string>()
    const promises = visibleGraphNodes.value.map(async (graphNode) => {
      await new Promise<void>((resolve) =>
        setTimeout(() => {
          const quads = graphStoreService.store.getQuads(null, predicate, null, graphNode)
          for (const quad of quads) {
            if (quad.subject.termType !== 'NamedNode') continue
            if (quad.object.equals(object)) {
              subjects.add(quad.subject.value)
            } else if (quad.object.termType === 'BlankNode') {
              const subQuads = graphStoreService.store.getQuads(quad.object, null, null, graphNode)
              for (const subQuad of subQuads) {
                if (subQuad.object.equals(object)) {
                  subjects.add(quad.subject.value)
                } else if (
                  subQuad.object.termType === 'BlankNode' &&
                  // This only makes sense for these predicates
                  (subQuad.predicate.value === vocab.owl.intersectionOf.value ||
                    subQuad.predicate.value === vocab.owl.unionOf.value ||
                    subQuad.predicate.value === vocab.owl.complementOf.value)
                ) {
                  const subSubQuads = graphStoreService.store.getQuads(
                    subQuad.object,
                    null,
                    null,
                    graphNode
                  )
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

  const classesTree = ref<ResourceTreeNode[]>([])
  const getClassesTree = async () => {
    const allClassTreeNodesMap: { [classUri: string]: ResourceTreeNode } = {}
    const allClassTypeQuads: Quad[] = []
    for (const graph of visibleGraphNodes.value) {
      for (const classNode of classObjectNodes) {
        graphStoreService.store.getQuads(null, vocab.rdf.type, classNode, graph).forEach((quad) => {
          if (quad.subject.termType === 'NamedNode') {
            allClassTypeQuads.push(quad)
          }
        })
      }
    }
    /** Holds the class uris for all classes that are a subclass of another class (to filter the root classes) */
    const allSubClasses = new Set<string>()

    const createClassTreeNodeRecursive = async (classTypeQuad: Quad): Promise<ResourceTreeNode> => {
      const classUri = classTypeQuad.subject.value
      // Get all subclasses
      const subClassQuads: Quad[] = []
      for (const graph of visibleGraphNodes.value) {
        graphStoreService.store
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
      const children: ResourceTreeNode[] = []
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
    graphStoreService.store.getQuads(null, vocab.owl.intersectionOf, null, null).forEach((quad) => {
      let subClass: string | null = null
      graphStoreService.store.getQuads(null, null, quad.subject, null).forEach((quad) => {
        if (allClassTreeNodesMap[quad.subject.value]) {
          // Found child class (there should only be one in this case)
          subClass = quad.subject.value
          allSubClasses.add(subClass)
        }
      })

      if (!subClass) return
      graphStoreService.store.getQuads(quad.object, null, null, null).forEach((quad) => {
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

  const propertiesTree = ref<ResourceTreeNode[]>([])
  const getPropertiesTree = async () => {
    const allPropertyTreeNodesMap: { [propertyUri: string]: ResourceTreeNode } = {}
    const allPropertyTypeQuads: Quad[] = []
    for (const graph of visibleGraphNodes.value) {
      for (const propertyNode of propertyObjectNodes) {
        graphStoreService.store
          .getQuads(null, vocab.rdf.type, propertyNode, graph)
          .forEach((quad) => {
            if (quad.subject.termType === 'NamedNode') {
              allPropertyTypeQuads.push(quad)
            }
          })
      }
    }

    const allSubProperties = new Set<string>()

    const createPropertyTreeNodeRecursive = async (
      propertyTypeQuad: Quad
    ): Promise<ResourceTreeNode> => {
      const propertyUri = propertyTypeQuad.subject.value
      const subPropertyQuads: Quad[] = []
      for (const graph of visibleGraphNodes.value) {
        graphStoreService.store
          .getQuads(null, vocab.rdfs.subPropertyOf, propertyUri, graph)
          .forEach((quad) => {
            if (
              // Make sure it's a property
              allPropertyTypeQuads.find((q) => q.subject.value === quad.subject.value)
            ) {
              subPropertyQuads.push(quad)
            }
          })
      }

      const children: ResourceTreeNode[] = []
      for (const subPropertyQuad of subPropertyQuads) {
        const subProperty = subPropertyQuad.subject.value
        allSubProperties.add(subProperty)
        if (allPropertyTreeNodesMap[subProperty]) {
          children.push(allPropertyTreeNodesMap[subProperty])
        } else {
          allPropertyTreeNodesMap[subProperty] =
            await createPropertyTreeNodeRecursive(subPropertyQuad)
          children.push(allPropertyTreeNodesMap[subProperty])
        }
      }

      return {
        key: propertyUri,
        label: getLabel(propertyUri),
        data: {
          prefixedUri: getPrefixedUri(propertyUri),
          graph: propertyTypeQuad.graph.value
        },
        children
      }
    }

    for (const quad of allPropertyTypeQuads) {
      const propertyUri = quad.subject.value
      if (allPropertyTreeNodesMap[propertyUri]) continue
      allPropertyTreeNodesMap[propertyUri] = await createPropertyTreeNodeRecursive(quad)
    }

    propertiesTree.value = Object.values(allPropertyTreeNodesMap).filter(
      (node) => !allSubProperties.has(node.key)
    )
    return propertiesTree.value
  }

  const decompositionTree = ref<ResourceTreeNode[]>([])
  const getDecompositionTree = async () => {
    // A decomposition tree is a tree of all classes that are defined in a restriction on property 'hasPart'
    // Different ontologies will have a different uri for this, so we try to make an educated guess
    // In the future we will make this configurable

    // Find a named node, which has 'hasPart' in the uri, which is of type owl:ObjectProperty or rdfs:Property,
    // and which has a restriction on it
    const hasPartProperties = graphStoreService.store
      .getQuads(null, vocab.rdf.type, null, null)
      .filter((quad) => {
        return (
          (quad.object.equals(vocab.owl.ObjectProperty) ||
            quad.object.equals(vocab.rdfs.Property)) &&
          quad.subject.value.includes('hasPart')
        )
      })
      .map((quad) => quad.subject)
      .filter((subject, index, self) => self.findIndex((s) => s.value === subject.value) === index)

    const allDecompositionTreeNodesMap: { [classUri: string]: ResourceTreeNode } = {}
    const allChildClassUris: string[] = []

    // Get 'parts' and parent classes from restrictions
    hasPartProperties.forEach((propertyUri) => {
      graphStoreService.store
        .getQuads(null, vocab.owl.onProperty, propertyUri, null)
        .forEach((quad) => {
          const blankNode = quad.subject
          const parts = graphStoreService.store.getObjects(
            blankNode,
            vocab.owl.someValuesFrom,
            null
          )
          // There should only be one parent class
          const parentClass = graphStoreService.store.getSubjects(
            vocab.rdfs.subClassOf,
            blankNode,
            null
          )[0]
          if (!parentClass) return
          if (!allDecompositionTreeNodesMap[parentClass.value]) {
            allDecompositionTreeNodesMap[parentClass.value] = {
              key: parentClass.value,
              label: getLabel(parentClass.value),
              data: {
                prefixedUri: getPrefixedUri(parentClass.value),
                graph: quad.graph.value
              },
              children: []
            }
          }
          parts.forEach((part) => {
            if (!allChildClassUris.find((value) => value === part.value)) {
              allChildClassUris.push(part.value)
            }

            if (!allDecompositionTreeNodesMap[part.value]) {
              allDecompositionTreeNodesMap[part.value] = {
                key: part.value,
                label: getLabel(part.value),
                data: {
                  prefixedUri: getPrefixedUri(part.value),
                  graph: quad.graph.value
                },
                children: []
              }
            }
            if (
              !allDecompositionTreeNodesMap[parentClass.value].children.find(
                (child) => child.key === part.value
              )
            ) {
              allDecompositionTreeNodesMap[parentClass.value].children.push(
                allDecompositionTreeNodesMap[part.value]
              )
            }
          })
        })
    })

    /* // Now recursively traverse the tree to add all children
    const getChildren = (parent: ResourceTreeNode) => {
      parent.children = parent.children.map((child) => {
        if (allDecompositionTreeNodesMap[child.key]) {
          return allDecompositionTreeNodesMap[child.key]
        }
        return child
      })
    }

    allParentClassUris.forEach((parent) => {
      getChildren(allDecompositionTreeNodesMap[parent])
    }) */

    // Now return the root nodes
    decompositionTree.value = Object.values(allDecompositionTreeNodesMap).filter(
      (t) => t.children.length && !allChildClassUris.find((u) => u === t.key)
    )
  }

  /** Retrieves all individuals and groups them by class */
  const individualsTree = ref<ResourceTreeNode[]>([])
  const getIndividualsTree = async () => {
    const allIndividualTypeQuads: Quad[] = []
    for (const graph of visibleGraphNodes.value) {
      graphStoreService.store.getQuads(null, vocab.rdf.type, null, graph).forEach((quad) => {
        if (
          quad.subject.termType === 'NamedNode' &&
          quad.object.termType === 'NamedNode' &&
          quad.object.value !== vocab.rdfs.Class.value &&
          quad.object.value !== vocab.owl.Class.value &&
          quad.object.value !== vocab.rdfs.Property.value &&
          quad.object.value !== vocab.owl.ObjectProperty.value &&
          quad.object.value !== vocab.owl.DatatypeProperty.value &&
          quad.object.value !== vocab.owl.AnnotationProperty.value &&
          quad.object.value !== vocab.owl.TransitiveProperty.value &&
          quad.object.value !== vocab.rdfs.Datatype.value &&
          quad.object.value !== vocab.owl.Restriction.value &&
          quad.object.value !== vocab.owl.Ontology.value &&
          quad.object.value !== vocab.skos.ConceptScheme.value &&
          quad.object.value !== vocab.owl.NamedIndividual.value
        ) {
          allIndividualTypeQuads.push(quad)
        }
      })
    }

    // Construct the tree of individuals by class
    const treeNodesMap: { [classUri: string]: ResourceTreeNode } = {}

    for (const quad of allIndividualTypeQuads) {
      const classUri = quad.object.value
      if (!treeNodesMap[classUri])
        treeNodesMap[classUri] = {
          key: classUri,
          label: getLabel(classUri),
          data: {
            prefixedUri: getPrefixedUri(classUri),
            graph: quad.graph.value
          },
          children: []
        }
      if (!treeNodesMap[classUri].children.find((c) => c.key === quad.subject.value)) {
        treeNodesMap[classUri].children.push({
          key: quad.subject.value,
          label: getLabel(quad.subject.value),
          data: {
            prefixedUri: getPrefixedUri(quad.subject.value),
            graph: quad.graph.value
          },
          children: []
        })
      }
    }

    individualsTree.value = Object.values(treeNodesMap)
  }

  const getProperties = (classUri: string): string[] => {
    const set = new Set<string>()
    graphStoreService.store
      .getSubjects(vocab.rdfs.domain, namedNode(classUri), null)
      .forEach((subject) => {
        set.add(subject.value)
      })
    return Array.from(set)
  }

  const getIndividuals = (classUri: string): string[] => {
    const set = new Set<string>()
    graphStoreService.store
      .getSubjects(vocab.rdf.type, namedNode(classUri), null)
      .forEach((subject) => {
        set.add(subject.value)
      })
    return Array.from(set)
  }

  const getAllNamedNodes = (): NamedNode<string>[] => {
    const namedNodeMap = graphStoreService.store
      .getQuads(null, null, null, null)
      .reduce((acc, quad) => {
        if (quad.subject.termType === 'NamedNode') acc.set(quad.subject.value, quad.subject)
        if (quad.object.termType === 'NamedNode') acc.set(quad.object.value, quad.object)
        return acc
      }, new Map<string, NamedNode<string>>())
    return Array.from(namedNodeMap.values())
  }

  const getRanges = (propertyUri: string): Quad_Object[] => {
    const ranges = new Set<Quad_Object>()
    graphStoreService.store
      .getObjects(namedNode(propertyUri), vocab.rdfs.range, null)
      .forEach((object) => {
        ranges.add(object)
      })
    return Array.from(ranges)
  }

  const getPropertyRangeValueRestrictions = (propertyRangeObjectUri: BlankNode) => {
    const restrictions: BlankTriple[] = []
    const restrictionQuads = graphStoreService.store.getQuads(
      propertyRangeObjectUri,
      null,
      null,
      null
    )
    if (
      restrictionQuads.some(
        (q) =>
          q.predicate.value === vocab.rdf.type.value &&
          q.object.value === vocab.owl.Restriction.value
      ) &&
      restrictionQuads.some(
        (q) =>
          q.predicate.value === vocab.owl.onProperty.value &&
          q.object.value === vocab.rdf.value.value
      )
    ) {
      const restrictionValueQuad = restrictionQuads.find(
        (q) =>
          q.predicate.value === vocab.owl.allValuesFrom.value ||
          q.predicate.value === vocab.owl.someValuesFrom.value ||
          q.predicate.value === vocab.owl.hasValue.value
      )
      if (restrictionValueQuad) {
        restrictions.push({
          predicate: restrictionValueQuad.predicate,
          object: restrictionValueQuad.object
        })
      }
    }
    return restrictions
  }

  const getRestrictions = (classUri: string): string[] => {
    const restrictions = new Set<string>()
    graphStoreService.store
      .getQuads(namedNode(classUri), vocab.rdfs.subClassOf, null, null)
      .forEach((quad) => {
        if (quad.object.termType === 'BlankNode') {
          const restrictionNode = quad.object.value
          const property = getObjectValue(
            restrictionNode,
            'http://www.w3.org/2002/07/owl#onProperty'
          )
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

  const getSubjectQuads = (uri: string): Quad[] => {
    const quads: Quad[] = []
    for (const graph of [...builtinGraphs, ...userGraphs.value]) {
      if (!graph.node) continue
      graphStoreService.store
        .getQuads(namedNode(uri), null, null, namedNode(graph.node.value))
        .forEach((quad) => {
          quads.push(quad)
        })
    }
    console.log(quads)
    return quads
  }

  const getShaclPropertyQuads = (uri: string): Quad[] => {
    return graphStoreService.store.getQuads(namedNode(uri), vocab.sh.property, null, null)
  }

  const getObjectValue = (subject: string, predicate: string): string | null => {
    const quads = graphStoreService.store.getQuads(
      namedNode(subject),
      namedNode(predicate),
      null,
      null
    )
    const quad =
      quads.find(
        (q) => q.object.termType !== 'Literal' || ['en'].includes((q.object as Literal).language)
      ) || quads[0]
    return quad ? quad.object.value : null
  }

  const getPrefixedUri = (uri: string): string => {
    // TODO pass the correct graph id
    for (const graph of [...builtinGraphs, ...userGraphs.value]) {
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
    const quads = graphStoreService.store.getQuads(namedNode(uri), vocab.rdf.type, null, null)
    return quads.map((quad) => getPrefixedUri(quad.object.value))
  }

  const getQuads = (subject: OTerm, predicate: OTerm, object: OTerm | OTerm[], graph: OTerm) => {
    return graphStoreService.store.getQuads(subject, predicate, object, graph)
  }

  interface QuadChange {
    action: 'add' | 'remove'
    quad: Quad
  }

  const undoStack = ref<QuadChange[]>([])
  const redoStack = ref<QuadChange[]>([])

  const addQuad = (quad: Quad) => {
    graphStoreService.store.addQuad(quad)
    undoStack.value.push({ action: 'add', quad })
    redoStack.value = [] // Clear redo stack on new action
  }

  const editQuad = (oldQuad: Quad, newQuad: Quad) => {
    graphStoreService.store.removeQuad(oldQuad)
    graphStoreService.store.addQuad(newQuad)
    undoStack.value.push({ action: 'remove', quad: oldQuad })
    undoStack.value.push({ action: 'add', quad: newQuad })
    redoStack.value = [] // Clear redo stack on new action
  }

  const removeQuad = (quad: Quad) => {
    graphStoreService.store.removeQuad(quad)
    undoStack.value.push({ action: 'remove', quad })
    redoStack.value = [] // Clear redo stack on new action
  }

  const undo = () => {
    const lastChange = undoStack.value.pop()
    if (!lastChange) return

    const { action, quad } = lastChange
    if (action === 'add') {
      graphStoreService.store.removeQuad(quad)
      redoStack.value.push({ action: 'remove', quad })
    } else if (action === 'remove') {
      graphStoreService.store.addQuad(quad)
      redoStack.value.push({ action: 'add', quad })
    }
  }

  const redo = () => {
    const lastUndo = redoStack.value.pop()
    if (!lastUndo) return

    const { action, quad } = lastUndo
    if (action === 'add') {
      graphStoreService.store.addQuad(quad)
      undoStack.value.push({ action: 'add', quad })
    } else if (action === 'remove') {
      graphStoreService.store.removeQuad(quad)
      undoStack.value.push({ action: 'remove', quad })
    }
  }

  const undoStackSize = computed(() => undoStack.value.length)

  const clearUndoRedoStacks = () => {
    undoStack.value = []
    redoStack.value = []
  }

  const writeGraph = async (graphUrl: string) => {
    return await new Promise<string>((resolve, reject) => {
      const userGraph = userGraphs.value.find((g) => g.url === graphUrl)

      const writer = new Writer({
        end: false,
        prefixes: userGraph?.prefixes
      })

      const retrieveBlankNodeContentRecursive = (blankNode: BlankNode) => {
        const blankNodeQuads = graphStoreService.store.getQuads(
          blankNode,
          null,
          null,
          literal(graphUrl)
        )
        if (
          blankNodeQuads.length > 1 &&
          blankNodeQuads.every(
            (q) =>
              q.predicate.value === vocab.rdf.first.value ||
              q.predicate.value === vocab.rdf.rest.value
          )
        ) {
          return writer.list(
            blankNodeQuads.map((q) => {
              if (q.object.termType === 'BlankNode') {
                return retrieveBlankNodeContentRecursive(q.object)
              } else {
                return q.object
              }
            })
          )
        } else {
          return writer.blank(
            blankNodeQuads.map((q) => ({
              predicate: q.predicate,
              object:
                q.object.termType === 'BlankNode'
                  ? retrieveBlankNodeContentRecursive(q.object)
                  : q.object
            }))
          )
        }
      }

      const allQuads = graphStoreService.store.getQuads(null, null, null, literal(graphUrl))
      let count = 0

      for (const quad of allQuads) {
        if (quad.subject.termType === 'BlankNode') {
          // Skip writing quads with blank node subjects
          continue
        }

        if (quad.object.termType === 'BlankNode') {
          // Recursively retrieve and write quads for blank node objects
          const blankNodeContent = retrieveBlankNodeContentRecursive(quad.object)
          const writeQuad = new Quad(quad.subject, quad.predicate, blankNodeContent)
          writer.addQuad(writeQuad)
        } else {
          writer.addQuad(new Quad(quad.subject, quad.predicate, quad.object))
        }
        count++
        console.log(count, quad)
      }

      writer.end((error, result) => {
        if (error) {
          console.error(`Failed to write graph: ${error}`)
          reject(error)
        } else {
          console.log(result)
          resolve(result as string)
        }
      })
    })
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
    decompositionTree,
    propertiesTree,
    individualsTree,

    getProperties,
    getIndividuals,
    getRanges,
    getAllNamedNodes,
    getPropertyRangeValueRestrictions,
    getRestrictions,
    getLabel,
    getSubjectQuads,
    getShaclPropertyQuads,
    getPrefixedUri,

    getRdfTypes,

    getQuads,
    addQuad,
    editQuad,
    removeQuad,
    undoStackSize,
    undo,
    redo,
    clearUndoRedoStacks,

    loadGraph,
    writeGraph
  }
})
