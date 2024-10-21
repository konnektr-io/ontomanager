import { Parser, Store } from 'n3'

class GraphStoreService {
  public constructor() {
    this._store = new Store()
    this._parser = new Parser()
  }
  private _store: Store
  private _parser: Parser

  public get store(): Store {
    return this._store
  }
  public get parser() {
    return this._parser
  }
}

export default new GraphStoreService()
