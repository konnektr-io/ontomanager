import { DataFactory } from 'n3'

const { namedNode } = DataFactory

export const vocab = {
  rdf: {
    type: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')
  },
  rdfs: {
    Class: namedNode('http://www.w3.org/2000/01/rdf-schema#Class'),
    Property: namedNode('http://www.w3.org/2000/01/rdf-schema#Property'),
    label: namedNode('http://www.w3.org/2000/01/rdf-schema#label'),
    domain: namedNode('http://www.w3.org/2000/01/rdf-schema#domain'),
    range: namedNode('http://www.w3.org/2000/01/rdf-schema#range'),
    subClassOf: namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'),
    subPropertyOf: namedNode('http://www.w3.org/2000/01/rdf-schema#subPropertyOf')
  },
  owl: {
    Class: namedNode('http://www.w3.org/2002/07/owl#Class'),
    Thing: namedNode('http://www.w3.org/2002/07/owl#Thing'),
    ObjectProperty: namedNode('http://www.w3.org/2002/07/owl#ObjectProperty'),
    DatatypeProperty: namedNode('http://www.w3.org/2002/07/owl#DatatypeProperty'),
    AnnotationProperty: namedNode('http://www.w3.org/2002/07/owl#AnnotationProperty'),
    Individual: namedNode('http://www.w3.org/2002/07/owl#Individual'),
    Ontology: namedNode('http://www.w3.org/2002/07/owl#Ontology'),
    Restriction: namedNode('http://www.w3.org/2002/07/owl#Restriction'),
    intersectionOf: namedNode('http://www.w3.org/2002/07/owl#intersectionOf'),
    onClass: namedNode('http://www.w3.org/2002/07/owl#onClass')
  },
  skos: {
    prefLabel: namedNode('http://www.w3.org/2004/02/skos/core#prefLabel')
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
