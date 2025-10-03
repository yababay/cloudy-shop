//import YDB from 'ydb-sdk'
import { Column, TableDescription, TableSession, Types, Ydb } from 'ydb-sdk'
//const { TableDescription, Ydb } = YDB

export class OrderedItems extends TableDescription {
  constructor() {
      super();
      this.columns.push(new Column('item_id',     Types.INT64))
      this.columns.push(new Column('order_id',    Types.INT64))
      this.columns.push(new Column('campaign_id', Types.INT64))
      this.columns.push(new Column('offer_id',    Types.UTF8))
      this.columns.push(new Column('amount',      Types.INT32))
      this.columns.push(new Column('created_at',  Types.DATETIME))
      this.columns.push(new Column('updated_at',  Types.optional(Types.DATETIME)))
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
