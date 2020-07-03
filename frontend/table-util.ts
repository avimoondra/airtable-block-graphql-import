import { Base, FieldType } from "@airtable/blocks/models";
import { isArray, keys } from "lodash";
import { javascriptTypeToAirtableFieldType } from "./typeMapping";

export const createOrOverwriteTable = async (base: Base, json, key) => {
  console.log(json[key]);
  if (isArray(json[key])) {
    const tableName = key;
    const sampleObj = json[key][0];
    const tableFields = keys(sampleObj).map((key) => {
      const type = javascriptTypeToAirtableFieldType(sampleObj[key]);
      return {
        name: key,
        type: type,
        options:
          type === FieldType.CHECKBOX
            ? { icon: "check", color: "greenBright" }
            : undefined,
      };
    });

    console.log("createOrOverwriteTable");
    // console.log(sampleObj);
    // console.log(tableFields);

    if (base.unstable_hasPermissionToCreateTable(tableName, tableFields)) {
      let table = base.getTableByNameIfExists(tableName);
      // if (
      //   xor(
      //     table.fields.map((field) => field.name),
      //     tableFields.map((field) => field.name)
      //   ).length !== 0
      // ) {
      //   throw Error("Delete the table!");
      // }
      if (!table) {
        table = await base.unstable_createTableAsync(tableName, tableFields);
      }

      if (table.checkPermissionsForCreateRecords()) {
        console.log(key);
        const records = json[key].map((item) => {
          const fields = {};
          console.log(keys(item));
          tableFields.forEach((tableField) => {
            fields[tableField.name] = item[tableField.name];
          });
          return {
            fields,
          };
        });
        console.log(records);
        await table.createRecordsAsync(records);
      }
    }
  }
};

// const BATCH_SIZE = 50;
// async function deleteAllRecords(table) {
//   const records = useRecords(table);
//   let i = 0;
//   while (i < records.length) {
//     const recordBatch = records.slice(i, i + BATCH_SIZE);
//     // awaiting the delete means that next batch won't be deleted until the current
//     // batch has been fully deleted, keeping you under the rate limit
//     await table.deleteRecordsAsync(recordBatch);
//     i += BATCH_SIZE;
//   }
// }
