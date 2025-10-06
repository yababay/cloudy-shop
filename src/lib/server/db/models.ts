//import YDB from 'ydb-sdk'
import { Column, TableDescription, TableSession, Types, Ydb } from 'ydb-sdk'
//const { TableDescription, Ydb } = YDB

export class OrderedItems extends TableDescription {
  constructor() {
      super();
      this.columns.push(new Column('item_id',      Types.INT64))
      this.columns.push(new Column('order_id',     Types.INT64))
      this.columns.push(new Column('campaign_id',  Types.INT64))
      this.columns.push(new Column('offer_id',     Types.UTF8))
      this.columns.push(new Column('amount',       Types.INT32))
      this.columns.push(new Column('created_at',   Types.DATETIME))
      this.columns.push(new Column('fulfilled_at', Types.optional(Types.DATETIME)))
      this.withPrimaryKey('item_id')
  }
} 

export class Codes extends TableDescription {
  constructor() {
      super();
      this.columns.push(new Column('code',        Types.UTF8))
      this.columns.push(new Column('offer_id',    Types.UTF8))
      this.columns.push(new Column('created_at',  Types.DATETIME))
      this.columns.push(new Column('updated_at',  Types.optional(Types.DATETIME)))
      this.columns.push(new Column('order_id',    Types.optional(Types.INT64)))
      this.withPrimaryKey('code')
  }
} 

export class Settings extends TableDescription {
  constructor() {
      super();
      this.columns.push(new Column('key',   Types.UTF8))
      this.columns.push(new Column('value', Types.UTF8))
      this.withPrimaryKey('key')
  }
} 

export class Offers extends TableDescription {
  constructor() {
      super();
      this.columns.push(new Column('id',          Types.UTF8))
      this.columns.push(new Column('name',        Types.optional(Types.UTF8)))
      this.columns.push(new Column('description', Types.optional(Types.UTF8)))
      this.columns.push(new Column('price',       Types.optional(Types.INT32)))
      this.withPrimaryKey('id')
  }
} 

export const getOffers = () => {
  const arr = new Array<number>()
  let id = 500
  while(id <= 9000) {
      arr.push(id)
      id += 50
  }
  return arr
}
