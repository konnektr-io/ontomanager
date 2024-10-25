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

  public async init() {
    await this._store.open()
  }

  public async close() {
    await this._store.close()
  }

  public async clear() {
    await this._store.clear()
  }

  public get store() {
    return this._store
  }
  public get parser() {
    return this._parser
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

    for (const quad of quads) {
      await this._store.put(
        this._datafactory.quad(quad.subject, quad.predicate, quad.object, ontologySubject)
      )
    }

    return {
      node: ontologySubject,
      prefixes: graphPrefixes
    }
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
}

export default new GraphStoreService()
