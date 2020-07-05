import { RecordDef } from "@airtable/blocks/dist/types/src/types/record";
import {
  Box,
  Button,
  Dialog,
  FormField,
  Heading,
  Icon,
  Input,
  RecordCardList,
  useBase,
} from "@airtable/blocks/ui";
import { JSONPath } from "jsonpath-plus";
import { isEmpty } from "lodash";
import React from "react";
import { headerListToObj } from "./header-util";
import {
  AIRTABLE_BLOCK_GQL_IMPORT_IMPORT_QUERY,
  AIRTABLE_BLOCK_GQL_IMPORT_JSON_PATH,
  useLocalStorage,
} from "./local-storage-util";
import { interGridSpacing } from "./style";
import {
  findOrCreateTables,
  insertQueryIntoQueriesTable,
  insertRecordsIntoTables,
  previewRecords,
  previewSchema,
  TableStatus,
} from "./table-util";

function ImportDialog(props: {
  onClose: () => void;
  url: string;
  headers: Array<{ key: string; value: string }>;
}) {
  const base = useBase();
  const [importQuery, setImportQuery] = useLocalStorage(
    AIRTABLE_BLOCK_GQL_IMPORT_IMPORT_QUERY,
    ""
  );
  const [jsonPath, setJsonPath] = useLocalStorage(
    AIRTABLE_BLOCK_GQL_IMPORT_JSON_PATH,
    ""
  );
  const [queryResponse, setQueryResponse] = React.useState({});
  const [previewTables, setPreviewTables] = React.useState<
    Map<string, Array<any>>
  >();
  const [previewTableStatuses, setPreviewTableStatuses] = React.useState<{
    [tableName: string]: TableStatus;
  }>();
  const [recordDefsByTable, setRecordDefsByTable] = React.useState<
    Map<string, Array<RecordDef>>
  >();

  let previewTableDivs = [];
  if (previewTables && previewTableStatuses) {
    previewTables.forEach((tableFields, tableName, _map) => {
      let icon;
      if (previewTableStatuses[tableName] === TableStatus.create) {
        icon = <Icon name="grid"></Icon>;
      } else if (previewTableStatuses[tableName] === TableStatus.modify) {
        icon = <Icon name="warning"></Icon>;
      } else if (previewTableStatuses[tableName] === TableStatus.match) {
        icon = <Icon name="check"></Icon>;
      }
      previewTableDivs.push(
        <div>
          table name: {tableName}, {icon}
          <div>{tableFields.map((field) => field.name)}</div>
        </div>
      );
    });
    console.log(previewTables);
  }

  let recordCardListByTable = new Map();
  if (recordDefsByTable) {
    recordDefsByTable.forEach((recordDefs, tableName, map) => {
      const table = base.getTableByName(tableName);
      recordCardListByTable.set(
        table,
        <RecordCardList
          width={"200px"}
          records={recordDefs}
          fields={table.fields}
        ></RecordCardList>
      );
    });
  }

  return (
    <Dialog onClose={props.onClose} height={"90vh"}>
      <Dialog.CloseButton />
      <Heading>Import</Heading>
      <Box display="flex" alignItems="center">
        <FormField label="Query" marginRight={interGridSpacing}>
          <Input
            value={importQuery}
            onChange={(e) => {
              setImportQuery(e.target.value);
            }}
          ></Input>
        </FormField>
        <FormField label="JSON path" marginRight={interGridSpacing}>
          <Input
            value={jsonPath}
            onChange={(e) => {
              setJsonPath(e.target.value);
            }}
          ></Input>
        </FormField>
        <Button
          variant="primary"
          onClick={async () => {
            let response = await fetch(props.url, {
              method: "post",
              headers: headerListToObj(props.headers),
              body: JSON.stringify({ query: importQuery }),
            });
            let responseData = await response.json();
            setQueryResponse(
              jsonPath
                ? JSONPath({
                    path: jsonPath,
                    json: responseData,
                  })[0] // see wrap
                : responseData
            );
          }}
        >
          Run
        </Button>
      </Box>

      <Box
        height={"200px"}
        overflowY="auto"
        border={"1px solid lightgray"}
        borderRadius="3px"
      >
        <pre style={{ margin: "0px", padding: "8px" }}>
          {isEmpty(queryResponse) ? "" : JSON.stringify(queryResponse, null, 2)}
        </pre>
      </Box>
      <Box>{previewTableDivs}</Box>

      <Button
        variant="primary"
        onClick={async () => {
          await findOrCreateTables(base, queryResponse);
          const { tables, tableStatuses } = previewSchema(base, queryResponse);
          setPreviewTableStatuses(tableStatuses);
          setPreviewTables(tables);
        }}
        disabled={isEmpty(queryResponse)}
      >
        Confirm Schema
      </Button>

      <Button
        onClick={async () => {
          const recordDefsByTable = await previewRecords(base, queryResponse);
          console.log(recordDefsByTable);
          setRecordDefsByTable(recordDefsByTable);
        }}
      >
        Preview Data
      </Button>

      <Box display="flex" flexDirection="row" height="300px">
        {Array.from(recordCardListByTable).map(([key, value]) => {
          return value;
        })}
      </Box>

      <Button
        onClick={() => {
          insertRecordsIntoTables(base, queryResponse);
          insertQueryIntoQueriesTable(base, importQuery, props.url);
        }}
      >
        Import
      </Button>
    </Dialog>
  );
}

export default ImportDialog;
