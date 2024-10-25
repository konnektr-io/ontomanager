import { BrowserLevel } from 'browser-level'
import {
  // BlankNode,
  DataFactory,
  NamedNode,
  Parser,
  Quad,
  Writer,
  // type BlankTriple,
  type DataFactoryInterface,
  type Quad_Object,
  type Quad_Predicate,
  type Quad_Subject
} from 'n3'
import { Quadstore } from 'quadstore'
// import { Engine } from 'quadstore-comunica'
import { vocab } from '@/utils/vocab'
import type { ResourceTreeNode } from '@/stores/graph'
import type { Scope } from 'node_modules/quadstore/dist/esm/scope'

export const classObjectNodes = [vocab.rdfs.Class, vocab.owl.Class]
export const labelNodes = [vocab.rdfs.label, vocab.skos.prefLabel]

class GraphStoreService {
  public constructor() {
    this._datafactory = DataFactory
    this._store = new Quadstore({
      dataFactory: this._datafactory,
      backend: new BrowserLevel('quadstore')
    })
    this._parser = new Parser()
    // this._engine = new Engine(this._store)
  }

  private _datafactory: DataFactoryInterface
  private _store: Quadstore
  private _parser: Parser
  // private _engine: Engine

  // Avoid blank node collisions
  private _scope: Scope | undefined

  public async init() {
    await this._store.open()

    if (this._scope) return

    // Try to get scope id from local storage
    const scopeId = localStorage.getItem('scopeId')
    if (scopeId) {
      this._scope = await this._store.loadScope(scopeId)
    } else {
      this._scope = await this._store.initScope()
      localStorage.setItem('scopeId', this._scope.id)
    }
  }

  public async close() {
    await this._store.close()
  }

  public async clear() {
    await this._store.clear()
  }

  public async isGraphLoaded(graph: NamedNode) {
    const { items } = await this._store.get({ graph }, { limit: 1 })
    return items.length > 0
  }

  public async loadGraph(ontologyContent: string) {
    await this.init()
    // if (graph.node) this._store.deleteGraph(graph.node)

    const graphPrefixes: { [prefix: string]: NamedNode<string> } = {}

    const quads = this._parser.parse(ontologyContent, null, (prefix, ns) => {
      if (prefix && ns) graphPrefixes[prefix] = ns as NamedNode<string>
    })

    // Find the owl:Ontology data, which we will use the graph node
    const ontologySubject = quads.find(
      (quad) =>
        quad.object.value === vocab.owl.Ontology.value ||
        quad.object.value === vocab.skos.ConceptScheme.value
    )?.subject

    if (!ontologySubject || ontologySubject.termType !== 'NamedNode') {
      throw new Error('Ontology subject not found')
    }

    // Delete existing graph in case it exists in the store
    await new Promise((resolve, reject) =>
      this._store.deleteGraph(ontologySubject).on('end', resolve).on('error', reject)
    )

    // Make sure that the preferred prefix is stored in the graph prefixes
    const preferredPrefixObject = quads.find(
      (quad) =>
        quad.subject.value === ontologySubject.value &&
        quad.predicate.value === vocab.vann.preferredNamespacePrefix.value
    )?.object
    // Store the preferred prefix for the ontology
    if (preferredPrefixObject && preferredPrefixObject.termType === 'Literal') {
      graphPrefixes[preferredPrefixObject.value] = ontologySubject
    }

    await this._store.multiPut(
      quads.map(
        (quad) =>
          this._datafactory.quad(quad.subject, quad.predicate, quad.object, ontologySubject),
        { scope: this._scope }
      )
    )

    return {
      node: ontologySubject,
      prefixes: graphPrefixes
    }
  }

  public async deleteGraph(graph: NamedNode) {
    await this.init()
    return await new Promise((resolve, reject) =>
      this._store.deleteGraph(graph).on('end', resolve).on('error', reject)
    )
  }

  public async writeGraph(graph: NamedNode, prefixes?: { [prefix: string]: NamedNode<string> }) {
    const writer = new Writer({
      end: false,
      prefixes: prefixes
    })

    /*     const retrieveBlankNodeContentRecursive = async (
      blankNode: BlankNode
    ): Promise<BlankNode | Quad_Object[]> => {
      const { items: blankNodeQuads } = await this._store.get({
        subject: blankNode,
        graph
      })
      if (
        blankNodeQuads.length > 1 &&
        blankNodeQuads.every(
          (q) =>
            q.predicate.value === vocab.rdf.first.value ||
            q.predicate.value === vocab.rdf.rest.value
        )
      ) {
        const quadObjects: Quad_Object[] = []

        for (const q of blankNodeQuads) {
          if (q.object.termType === 'BlankNode') {
            quadObjects.push(await retrieveBlankNodeContentRecursive(q.object as BlankNode))
          } else {
            quadObjects.push(q.object as Quad_Object)
          }
        }
        return writer.list(quadObjects)
      } else {
        const blankTriples: BlankTriple[] = []
        for (const q of blankNodeQuads) {
          if (q.object.termType === 'BlankNode') {
            blankTriples.push({
              predicate: q.predicate,
              object: await retrieveBlankNodeContentRecursive(q.object as BlankNode)
            })
          } else {
            blankTriples.push({
              predicate: q.predicate,
              object: q.object
            })
          }
        }
        return writer.blank(blankTriples)
      }
    } */

    let count = 0

    const { iterator } = await this._store.getStream({ graph })

    for await (const quad of iterator) {
      if (quad.subject.termType !== 'NamedNode') {
        // Skip writing quads with blank node subjects
        continue
      }

      if (quad.object.termType === 'BlankNode') {
        // Recursively retrieve and write quads for blank node objects
        /* const blankNodeContent = retrieveBlankNodeContentRecursive(quad.object as BlankNode)
        const writeQuad = new Quad(
          quad.subject as Quad_Subject,
          quad.predicate as Quad_Predicate,
          blankNodeContent
        )
        writer.addQuad(writeQuad) */
      } else {
        writer.addQuad(
          new Quad(
            quad.subject as Quad_Subject,
            quad.predicate as Quad_Predicate,
            quad.object as Quad_Object
          )
        )
      }
      count++
      console.log(count, quad)
    }

    return await new Promise<string>((resolve, reject) => {
      writer.end((error, result) => {
        if (error) {
          console.error(`Failed to write graph: ${error}`)
          reject(error)
        } else {
          console.log(result)
          resolve(result)
        }
      })
    })
  }

  public async getClassesTree(graphs: NamedNode[]) {
    await this.init()

    if (!graphs.length) return []

    const allClassTreeNodesMap: { [classUri: string]: ResourceTreeNode } = {}
    const allClassTypeQuads: Quad[] = []
    for (const classNode of classObjectNodes) {
      const { items: quads } = await this._store.get({
        predicate: vocab.rdf.type,
        object: classNode
      })
      quads.forEach((quad) => {
        if (
          quad.subject.termType === 'NamedNode' &&
          graphs.map((g) => g.value).includes(quad.graph.value)
        ) {
          allClassTypeQuads.push(quad as Quad)
        }
      })
    }
    // Holds the class uris for all classes that are a subclass of another class (to filter the root classes)
    const allSubClasses = new Set<string>()

    const createClassTreeNodeRecursive = async (classTypeQuad: Quad): Promise<ResourceTreeNode> => {
      const classUri = classTypeQuad.subject.value
      // Get all subclasses
      // for (const graph of graphs) {
      const { items: quads } = await this._store.get({
        predicate: vocab.rdfs.subClassOf,
        object: classTypeQuad.subject
      })
      const children: ResourceTreeNode[] = []
      for (const subClassQuad of quads.filter<Quad>(
        (quad): quad is Quad =>
          graphs.map((g) => g.value).includes(quad.graph.value) &&
          // Make sure it's a class
          allClassTypeQuads.some((q) => q.subject.value === quad.subject.value)
      )) {
        const subClassUri = subClassQuad.subject.value
        allSubClasses.add(subClassUri)
        if (allClassTreeNodesMap[subClassUri]) {
          children.push(allClassTreeNodesMap[subClassUri])
        } else {
          allClassTreeNodesMap[subClassUri] = await createClassTreeNodeRecursive(subClassQuad)
          children.push(allClassTreeNodesMap[subClassUri])
        }
      }
      return {
        key: classUri,
        label: await this.getLabel(classUri),
        data: {
          graph: classTypeQuad.graph.value
        },
        children
      }
    }

    await Promise.all(
      allClassTypeQuads.map(async (quad) => {
        if (!allClassTreeNodesMap[quad.subject.value]) {
          allClassTreeNodesMap[quad.subject.value] = await createClassTreeNodeRecursive(quad)
        }
      })
    )

    return Object.values(allClassTreeNodesMap)
      .filter((node) => !allSubClasses.has(node.key))
      .sort((a, b) => a.label.localeCompare(b.label))
  }

  public async getDecompositionTree(graphs: NamedNode[]) {
    if (!graphs.length) return []
    // A decomposition tree is a tree of all classes that are defined in a restriction on property 'hasPart'
    // Different ontologies will have a different uri for this, so we try to make an educated guess
    // In the future we will make this configurable

    // Find a named node, which has 'hasPart' in the uri, which is of type owl:ObjectProperty or rdfs:Property,
    // and which has a restriction on it
    // It would be better to store this in the configuration instead of having to find them
    const hasPartPropertyUris: string[] = []
    for await (const quad of (
      await this._store.getStream({
        predicate: vocab.rdf.type
      })
    ).iterator) {
      if (
        (quad.object.equals(vocab.owl.ObjectProperty) || quad.object.equals(vocab.rdfs.Property)) &&
        quad.subject.value.includes('hasPart') &&
        !hasPartPropertyUris.includes(quad.subject.value)
      ) {
        hasPartPropertyUris.push(quad.subject.value)
      }
    }

    const allDecompositionTreeNodesMap: { [classUri: string]: ResourceTreeNode } = {}
    const allChildClassUris: string[] = []

    // Get 'parts' and parent classes from restrictions
    for (const propertyUri of hasPartPropertyUris) {
      // await Promise.all(
      //   hasPartPropertyUris.map(async (propertyUri) => {
      const { items: onPropertyQuads } = await this._store.get({
        predicate: vocab.owl.onProperty,
        object: this._datafactory.namedNode(propertyUri)
      })
      for (const quad of onPropertyQuads) {
        // await Promise.all(
        //   onPropertyQuads.map(async (quad) => {
        const blankNode = quad.subject
        if (quad.subject.termType !== 'BlankNode') continue // must be something weird ...
        const { items: partQuads } = await this._store.get({
          subject: blankNode,
          predicate: vocab.owl.someValuesFrom
        })
        const { items: parentClassQuads } = await this._store.get(
          {
            predicate: vocab.rdfs.subClassOf,
            object: blankNode
          },
          { limit: 1 }
        )
        const parentClass = parentClassQuads.filter((q) =>
          graphs.map((q) => q.value).includes(q.graph.value)
        )[0]?.subject
        if (!parentClass) continue
        if (!allDecompositionTreeNodesMap[parentClass.value]) {
          allDecompositionTreeNodesMap[parentClass.value] = {
            key: parentClass.value,
            label: await this.getLabel(parentClass.value),
            data: {
              // prefixedUri: parentClass.value,
              graph: quad.graph.value
            },
            children: []
          }
        }
        partQuads.forEach(async (partQuad) => {
          const part = partQuad.object
          if (!allChildClassUris.find((value) => value === part.value)) {
            allChildClassUris.push(part.value)
          }

          if (!allDecompositionTreeNodesMap[part.value]) {
            allDecompositionTreeNodesMap[part.value] = {
              key: part.value,
              label: await this.getLabel(part.value),
              data: {
                // prefixedUri: part.value,
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
      }
    }

    // Now return the root nodes
    return Object.values(allDecompositionTreeNodesMap).filter(
      (t) => t.children.length && !allChildClassUris.find((u) => u === t.key)
    )
  }

  public async getPropertiesTree(graphs: NamedNode[]) {}

  public async getIndividualsTree(graphs: NamedNode[]) {}

  public async getSubjectQuads(uri: string): Promise<Quad[]> {
    await this.init()
    const { items } = await this._store.get({ subject: this._datafactory.namedNode(uri) })
    return items as Quad[]
  }

  public async getProperties(uri: string): Promise<{ label: string; uri: string }[]> {
    await this.init()
    const { items } = await this._store.get({
      predicate: vocab.rdfs.domain,
      object: DataFactory.namedNode(uri)
    })
    return await Promise.all(
      items.map(async (quad) => {
        const label = await this.getLabel(quad.subject.value)
        return {
          label,
          uri: quad.subject.value
        }
      })
    )
  }

  public async getIndividuals(uri: string): Promise<{ label: string; uri: string }[]> {
    await this.init()
    const { items } = await this._store.get({
      predicate: vocab.rdf.type,
      object: DataFactory.namedNode(uri)
    })
    return await Promise.all(
      items.map(async (quad) => {
        const label = await this.getLabel(quad.subject.value)
        return {
          label,
          uri: quad.subject.value
        }
      })
    )
  }

  public async getLabel(uri: string) {
    await this.init()
    for (const labelNode of labelNodes) {
      for await (const quad of (
        await this._store.getStream({
          subject: this._datafactory.namedNode(uri),
          predicate: labelNode
        })
      ).iterator) {
        const label = quad.object.value
        if (
          label &&
          label.length > 0 &&
          quad.object.termType === 'Literal' &&
          quad.object.language &&
          quad.object.language === 'en'
        ) {
          return label
        }
      }
    }
    return uri?.split('/').pop()?.split('#').pop() || uri
  }

  public async put(quad: Quad) {
    await this.init()
    return this._store.put(quad, { scope: this._scope })
  }

  public async del(quad: Quad) {
    await this.init()
    return this._store.del(quad, { scope: this._scope })
  }
}

export default new GraphStoreService()