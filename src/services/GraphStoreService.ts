import { Store, Parser, DataFactory, NamedNode, Quad_Subject, Quad_Object } from 'n3';

const { namedNode, literal, blankNode } = DataFactory;

class GraphStoreService {
  private store: Store;

  constructor () {
    this.store = new Store();
  }

  loadTurtle (turtleString: string): void {
    const parser = new Parser();
    const quads = parser.parse(turtleString);
    this.store.addQuads(quads);
  }

  getClasses (): string[] {
    const classes = new Set<string>();
    const quads = this.store.getQuads(
      null,
      namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      namedNode('http://www.w3.org/2002/07/owl#Class'),
      null);
    quads.forEach((quad) => {
      classes.add(quad.subject.value);
    });
    return Array.from(classes);
  }

  getSubClasses (classUri: string): string[] {
    const subClasses = new Set<string>();
    const quads = this.store.getQuads(
      null,
      namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'),
      namedNode(classUri),
      null);
    quads.forEach((quad) => {
      subClasses.add(quad.subject.value);
    });
    return Array.from(subClasses);
  }

  getClassDetails (classUri: string): {
    label: string;
    comment: string;
    properties: { uri: string; label: string; range: string }[];
    // restrictions: { property: string; type: string; value: string }[];
  } {
    const label = this.getObjectValue(classUri, 'http://www.w3.org/2000/01/rdf-schema#label') ||
      this.getObjectValue(classUri, 'http://www.w3.org/2004/02/skos/core#prefLabel') || '';
    const comment = this.getObjectValue(classUri, 'http://www.w3.org/2000/01/rdf-schema#comment') ||
      this.getObjectValue(classUri, 'http://www.w3.org/2004/02/skos/core#definition') || '';

    const properties = this.getProperties(classUri);
    // const restrictions = this.getRestrictions(classUri);

    return { label, comment, properties/* , restrictions */ };
  }

  private getObjectValue (subject: string, predicate: string): string | null {
    const quad = this.store.getQuads(namedNode(subject), namedNode(predicate), null, null)[0];
    return quad ? quad.object.value : null;
  }

  private getProperties (classUri: string): { uri: string; label: string; range: string }[] {
    const properties: { uri: string; label: string; range: string }[] = [];
    const quads = this.store.getQuads(
      null,
      namedNode('http://www.w3.org/2000/01/rdf-schema#domain'),
      namedNode(classUri),
      null);
    quads.forEach((quad) => {
      const propertyUri = quad.subject.value;
      const label = this.getObjectValue(propertyUri, 'http://www.w3.org/2000/01/rdf-schema#label') || propertyUri;
      const range = this.getObjectValue(propertyUri, 'http://www.w3.org/2000/01/rdf-schema#range') || '';
      properties.push({ uri: propertyUri, label, range });
    });
    return properties;
  }

  /* private getRestrictions (classUri: string): { property: string; type: string; value: string }[] {
    const restrictions: { property: string; type: string; value: string }[] = [];
    this.store.forEach(
      (quad) => {
        if (quad.predicate.value === 'http://www.w3.org/2000/01/rdf-schema#subClassOf' &&
          quad.object.termType === 'BlankNode') {
          const restrictionNode = quad.object.value;
          const property = this.getObjectValue(restrictionNode, 'http://www.w3.org/2002/07/owl#onProperty');
          const type = this.getRestrictionType(restrictionNode);
          const value = this.getRestrictionValue(restrictionNode, type);
          if (property && type && value) {
            restrictions.push({ property, type, value });
          }
        }
      }
    );
    return restrictions;
  } */

  /* private getRestrictionType (restrictionNode: string): string {
    const types = [
      'http://www.w3.org/2002/07/owl#someValuesFrom',
      'http://www.w3.org/2002/07/owl#allValuesFrom',
      'http://www.w3.org/2002/07/owl#hasValue',
      'http://www.w3.org/2002/07/owl#minCardinality',
      'http://www.w3.org/2002/07/owl#maxCardinality',
      'http://www.w3.org/2002/07/owl#cardinality'
    ];
    for (const type of types) {
      if (this.store.getQuads(namedNode(restrictionNode), namedNode(type), null, null).length > 0) {
        return type;
      }
    }
    return '';
  } */

  /* private getRestrictionValue (restrictionNode: string, type: string): string {
    const quad = this.store.getQuads(namedNode(restrictionNode), namedNode(type), null, null)[0];
    return quad ? quad.object.value : '';
  } */

  updateClassDetails (classUri: string, details: {
    label?: string;
    comment?: string;
  }): void {
    if (details.label) {
      this.updateTriple(classUri, 'http://www.w3.org/2000/01/rdf-schema#label', details.label);
    }
    if (details.comment) {
      this.updateTriple(classUri, 'http://www.w3.org/2000/01/rdf-schema#comment', details.comment);
    }
  }

  addProperty (classUri: string, propertyUri: string, label: string, range: string): void {
    this.store.addQuad(namedNode(propertyUri), namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode('http://www.w3.org/2002/07/owl#DatatypeProperty'));
    this.store.addQuad(namedNode(propertyUri), namedNode('http://www.w3.org/2000/01/rdf-schema#domain'), namedNode(classUri));
    this.store.addQuad(namedNode(propertyUri), namedNode('http://www.w3.org/2000/01/rdf-schema#label'), literal(label));
    this.store.addQuad(namedNode(propertyUri), namedNode('http://www.w3.org/2000/01/rdf-schema#range'), namedNode(range));
  }

  updateProperty (propertyUri: string, label: string, range: string): void {
    this.updateTriple(propertyUri, 'http://www.w3.org/2000/01/rdf-schema#label', label);
    this.updateTriple(propertyUri, 'http://www.w3.org/2000/01/rdf-schema#range', range);
  }

  deleteProperty (propertyUri: string): void {
    this.store.removeQuads(this.store.getQuads(namedNode(propertyUri), null, null, null));
  }

  addRestriction (classUri: string, property: string, type: string, value: string): void {
    const restrictionNode = blankNode();
    this.store.addQuad(namedNode(classUri), namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'), restrictionNode);
    this.store.addQuad(restrictionNode, namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode('http://www.w3.org/2002/07/owl#Restriction'));
    this.store.addQuad(restrictionNode, namedNode('http://www.w3.org/2002/07/owl#onProperty'), namedNode(property));
    this.store.addQuad(restrictionNode, namedNode(type), this.getValueNode(type, value));
  }

  updateRestriction (classUri: string, oldProperty: string, oldType: string, oldValue: string,
    newProperty: string, newType: string, newValue: string): void {
    const restrictionNode = this.findRestrictionNode(classUri, oldProperty, oldType, oldValue);
    if (restrictionNode) {
      this.store.removeQuads(this.store.getQuads(restrictionNode, null, null, null));
      this.addRestriction(classUri, newProperty, newType, newValue);
    }
  }

  deleteRestriction (classUri: string, property: string, type: string, value: string): void {
    const restrictionNode = this.findRestrictionNode(classUri, property, type, value);
    if (restrictionNode) {
      this.store.removeQuads(this.store.getQuads(restrictionNode, null, null, null));
      this.store.removeQuads(this.store.getQuads(namedNode(classUri), namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'), restrictionNode, null));
    }
  }

  private updateTriple (subject: string, predicate: string, object: string): void {
    this.store.removeQuads(this.store.getQuads(namedNode(subject), namedNode(predicate), null, null));
    this.store.addQuad(namedNode(subject), namedNode(predicate), literal(object));
  }

  private getValueNode (type: string, value: string): NamedNode | Quad_Object {
    if (type.includes('Cardinality')) {
      return literal(parseInt(value, 10));
    } else {
      return namedNode(value);
    }
  }

  private findRestrictionNode (classUri: string, property: string, type: string, value: string): Quad_Subject | null {
    const quads = this.store.getQuads(namedNode(classUri), namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'), null, null);
    for (const quad of quads) {
      if (quad.object.termType === 'BlankNode') {
        const restrictionNode = quad.object;
        const propertyQuad = this.store.getQuads(restrictionNode, namedNode('http://www.w3.org/2002/07/owl#onProperty'), namedNode(property), null)[0];
        const typeQuad = this.store.getQuads(restrictionNode, namedNode(type), null, null)[0];
        if (propertyQuad && typeQuad && typeQuad.object.value === value) {
          return restrictionNode;
        }
      }
    }
    return null;
  }
}

export default GraphStoreService;