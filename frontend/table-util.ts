import { RecordDef } from "@airtable/blocks/dist/types/src/types/record";
import { Base, FieldType, Table } from "@airtable/blocks/models";
import { difference, isArray, keys, reject } from "lodash";

const getTablesFromJsonStructure = (
  json,
  tables: Map<string, Array<any>>,
  parentTable: string
) => {
  keys(json).forEach((key) => {
    if (isArray(json[key])) {
      // TODO handle object
      const nonArrayKeys = reject(keys(json[key][0]), (_key) => {
        return isArray(json[key][0][_key]);
      });
      const fields = [];
      nonArrayKeys.forEach((_key) => {
        fields.push({
          name: _key,
          type: FieldType.SINGLE_LINE_TEXT,
        });
      });
      // Creating or updating `MULTIPLE_RECORD_LINKS` fields is not supported.
      // under https://airtable.com/developers/blocks/api/FieldType#MULTIPLE_RECORD_LINKS
      if (parentTable) {
        fields.push({
          name: `${parentTable}_id`,
          type: FieldType.MULTIPLE_RECORD_LINKS,
        });
      }
      tables.set(key, fields);
      getTablesFromJsonStructure(json[key][0], tables, null);
    }
  });
};

export enum TableStatus {
  "create",
  "modify",
  "match",
}

export const previewSchema = (base: Base, json) => {
  const _tables: Map<string, Array<any>> = new Map<string, Array<any>>();
  getTablesFromJsonStructure(json, _tables, null);
  const _tableStatuses: { [tableName: string]: TableStatus } = {};
  _tables.forEach((tableFields, tableName, _map) => {
    let table = base.getTableByNameIfExists(tableName);
    if (!table) {
      _tableStatuses[tableName] = TableStatus.create;
    } else if (
      table &&
      difference(
        tableFields.map((field) => field.name),
        table.fields.map((field) => field.name)
      ).length !== 0
    ) {
      _tableStatuses[tableName] = TableStatus.modify;
    } else {
      _tableStatuses[tableName] = TableStatus.match;
    }
  });

  return {
    tables: _tables,
    tableStatuses: _tableStatuses,
  };
};

export const findOrCreateTables = async (base: Base, json) => {
  const _tables: Map<string, Array<any>> = new Map<string, Array<any>>();
  getTablesFromJsonStructure(json, _tables, null);
  const tables: Array<Table> = [];
  _tables.forEach(async (tableFields, tableName, _map) => {
    let table = base.getTableByNameIfExists(tableName);
    if (!table) {
      if (base.unstable_hasPermissionToCreateTable()) {
        table = await base.unstable_createTableAsync(tableName, tableFields);
      }
    }
    tables.push(table);
  });
  return tables;
};

const getRecordDefsByTableFromJsonStructure = (
  json,
  tables: Array<Table>,
  recordDefsByTable: Map<string, Array<RecordDef>>
) => {
  keys(json).forEach((key) => {
    if (isArray(json[key])) {
      const tableName = key;
      const table = tables.find((table) => table.name === tableName);
      if (table) {
        json[tableName].forEach((item) => {
          const newRecord: RecordDef = {};
          table.fields.forEach((field) => {
            newRecord[field.id] = item[field.name]
              ? item[field.name].toString() // TODO handle object
              : "";
          });

          if (!recordDefsByTable.get(tableName)) {
            recordDefsByTable.set(tableName, []);
          }
          const recordDefs = recordDefsByTable.get(tableName);
          recordDefs.push(newRecord);
          recordDefsByTable.set(tableName, recordDefs);

          getRecordDefsByTableFromJsonStructure(
            item,
            tables,
            recordDefsByTable
          );
        });
      }
    }
  });
};

export const previewRecords = async (base: Base, json) => {
  const tables = base.tables;
  let recordDefsByTable = new Map<string, Array<RecordDef>>();
  getRecordDefsByTableFromJsonStructure(json, tables, recordDefsByTable);
  return recordDefsByTable;
};

const BATCH_SIZE = 50;
export const insertRecordsIntoTables = async (base: Base, json) => {
  const tables = await findOrCreateTables(base, json);
  let recordDefsByTable = new Map<string, Array<RecordDef>>();
  getRecordDefsByTableFromJsonStructure(json, tables, recordDefsByTable);
  recordDefsByTable.forEach(async (recordDefs, tableName) => {
    const table = tables.find((table) => table.name === tableName);
    if (table.checkPermissionsForCreateRecords()) {
      const records = recordDefs.map((recordDef) => {
        return {
          fields: recordDef,
        };
      });
      let i = 0;
      while (i < records.length) {
        const recordBatch = records.slice(i, i + BATCH_SIZE);
        // awaiting the delete means that next batch won't be deleted until the current
        // batch has been fully deleted, keeping you under the rate limit
        await table.createRecordsAsync(recordBatch);
        i += BATCH_SIZE;
      }
    }
  });
};

export const insertQueryIntoQueriesTable = async (base: Base, query, url) => {
  let table = base.getTableByNameIfExists("queries");
  if (!table) {
    if (base.unstable_hasPermissionToCreateTable()) {
      const fields = [
        {
          name: "url",
          type: FieldType.SINGLE_LINE_TEXT,
        },
        {
          name: "query",
          type: FieldType.SINGLE_LINE_TEXT,
        },
        {
          name: "timestamp",
          type: FieldType.DATE_TIME,
          options: {
            dateFormat: {
              name: "local",
              format: "l",
            },
            timeFormat: {
              name: "12hour",
              format: "h:mma",
            },
            timeZone: "client",
          },
        },
      ];
      table = await base.unstable_createTableAsync("queries", fields);
    }
  }
  if (table.checkPermissionsForCreateRecord()) {
    table.createRecordAsync({
      url: url,
      query: query,
      timestamp: new Date(),
    });
  }
};
