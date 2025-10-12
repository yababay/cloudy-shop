import { Column, TableDescription, TableSession, Types } from 'ydb-sdk'
import { readFileSync } from 'fs';

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
      this.columns.push(new Column('delivered_at', Types.optional(Types.DATETIME)))
      this.withPrimaryKey('item_id')
  }
} 

export class Codes extends TableDescription {
  constructor() {
      super();
      this.columns.push(new Column('code',        Types.UTF8))
      this.columns.push(new Column('offer_id',    Types.UTF8))
      this.columns.push(new Column('user',        Types.INT64))
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

const ORDERS_TABLE_NAME = 'ordered_items'
const CODES_TABLE_NAME = 'codes'
const SETTINGS_TABLE_NAME = 'settings'
const OFFERSS_TABLE_NAME = 'offers'

export const createTables = async (session: TableSession) => {

      await session.dropTable(ORDERS_TABLE_NAME)
      await session.createTable(ORDERS_TABLE_NAME, new OrderedItems())
      await session.dropTable(CODES_TABLE_NAME)
      await session.createTable(CODES_TABLE_NAME, new Codes())
      await session.dropTable(SETTINGS_TABLE_NAME)
      await session.createTable(SETTINGS_TABLE_NAME, new Settings())
      await session.dropTable(OFFERSS_TABLE_NAME)
      await session.createTable(OFFERSS_TABLE_NAME, new Offers())
      const values = getOffers().map(offer => `('APPLE${offer}')`).join(', ')
      const query = `upsert into ${OFFERSS_TABLE_NAME} (id) values ${values}`
      await session.executeQuery(query)
      await session.executeQuery(`
          insert into ${SETTINGS_TABLE_NAME} (key, value) values
          ('ACTIVATION_INSTRUCTION', '${readFileSync('src/lib/server/instructions/ACTIVATION.md', 'utf8')}'),   
          ('HOLIDAY_INSTRUCTION',    '${readFileSync('src/lib/server/instructions/HOLIDAY.md', 'utf8')}'),   
          ('CHAT_FIRST_MESSAGE',     '${readFileSync('src/lib/server/instructions/CHAT.md', 'utf8')}'),   
          ('OPENING_HOURS_FROM', '10:00'),   
          ('OPENING_HOURS_TO',   '20:00'),   
          ('FAKE_CODE', 'ОБРАТИТЕ ВНИМАНИЕ!'),   
          ('DELIVERY_TIMEOUT', '25')
      `)
}
