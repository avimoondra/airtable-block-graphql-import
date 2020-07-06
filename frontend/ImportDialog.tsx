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
  Tooltip,
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
  const [confirmedSchema, setConfirmedSchema] = React.useState(false);
  const [importButtonSuccess, setImportButtonSuccess] = React.useState(false);

  let recordCardListByTable = new Map();
  if (recordDefsByTable) {
    recordDefsByTable.forEach((recordDefs, tableName, _map) => {
      const table = base.getTableByName(tableName);
      recordCardListByTable.set(
        table,
        <Box>
          <b>{tableName}</b> ({recordDefs.length} records)
          <RecordCardList
            width={"300px"}
            records={recordDefs.slice(0, 5)}
            fields={table.fields}
          ></RecordCardList>
        </Box>
      );
    });
  }

  return (
    <Dialog onClose={props.onClose} height={"95vh"}>
      <Dialog.CloseButton />
      <Heading>Import</Heading>
      <Box display="flex" alignItems="center">
        <FormField
          label={
            <span>
              Query{" "}
              <Tooltip
                className="nowrap"
                content="Copy/paste from GraphiQL. Headers will automatically be sent!"
              >
                <Icon name="help" size={10} fillColor={"lightgray"} />
              </Tooltip>
            </span>
          }
          marginRight={interGridSpacing}
        >
          <Input
            value={importQuery}
            onChange={(e) => {
              setImportQuery(e.target.value);
            }}
          ></Input>
        </FormField>
        <FormField
          label={
            <span>
              JSON path{" "}
              <Tooltip className="nowrap" content="What is JSONPath?">
                <a
                  className="pointer link-quiet"
                  href="https://jsonpath.com/"
                  target="_new"
                >
                  <Icon name="help" size={10} fillColor={"lightgray"} />
                </a>
              </Tooltip>
            </span>
          }
          marginRight={interGridSpacing}
        >
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
            setConfirmedSchema(false);
            let response = await fetch(props.url, {
              method: "post",
              headers: headerListToObj(props.headers),
              body: JSON.stringify({ query: importQuery }),
            });
            let responseData = await response.json();
            const queryResponse = jsonPath
              ? JSONPath({
                  path: jsonPath,
                  json: responseData,
                })[0] // see wrap
              : responseData;
            setQueryResponse(queryResponse);
            const { tables, tableStatuses } = previewSchema(
              base,
              queryResponse
            );
            setPreviewTableStatuses(tableStatuses);
            setPreviewTables(tables);
          }}
        >
          Request Data
        </Button>
      </Box>
      <Box
        height={"150px"}
        overflowY="auto"
        border={"1px solid lightgray"}
        borderRadius="3px"
      >
        <pre style={{ margin: "0px", padding: "8px" }}>
          {isEmpty(queryResponse) ? "" : JSON.stringify(queryResponse, null, 2)}
        </pre>
      </Box>
      {!isEmpty(previewTables) &&
        !isEmpty(previewTableStatuses) &&
        !isEmpty(queryResponse) && (
          <Box marginTop="20px" marginBottom="8px">
            <Heading as="h6"> {"Tables & Fields"} </Heading>
            <Box display="flex" flexDirection="row">
              {Array.from(previewTables).map(([tableName, tableFields]) => {
                let icon;
                if (previewTableStatuses[tableName] === TableStatus.create) {
                  icon = "(new)";
                } else if (
                  previewTableStatuses[tableName] === TableStatus.modify
                ) {
                  icon = (
                    <span>
                      <span style={{ color: "rgb(248,43,96)" }}>
                        (schema mismatch){" "}
                      </span>
                      <Tooltip content="Either delete the table, or update the fields">
                        <Icon
                          name="help"
                          size={10}
                          fillColor={"rgb(248,43,96)"}
                        />
                      </Tooltip>
                    </span>
                  );
                } else if (
                  previewTableStatuses[tableName] === TableStatus.match
                ) {
                  icon = "(exists)";
                }
                return (
                  <Box
                    key={tableName}
                    style={{
                      border: "1px solid lightgray",
                      padding: "8px",
                      borderRadius: "3px",
                      marginRight: "4px",
                    }}
                  >
                    <Box>
                      <b>{tableName}</b> {icon}
                    </Box>
                    <div
                      style={{
                        fontWeight: 400,
                        color: "rgb(137, 137, 137)",
                        letterSpacing: "0.1em",
                        fontSize: "11px",
                        lineHeight: "13px",
                      }}
                    >
                      {tableFields.map((field) => field.name).join(", ")}
                    </div>
                  </Box>
                );
              })}
            </Box>
            <Box display="flex" flexDirection="row-reverse">
              <Button
                variant="primary"
                marginTop="8px"
                onClick={async () => {
                  await findOrCreateTables(base, queryResponse);
                  setConfirmedSchema(true);
                  const recordDefsByTable = await previewRecords(
                    base,
                    queryResponse
                  );
                  setRecordDefsByTable(recordDefsByTable);
                }}
                disabled={isEmpty(queryResponse)}
              >
                Confirm Schema
              </Button>
            </Box>
          </Box>
        )}

      {confirmedSchema && (
        <Box>
          <Heading as="h6">Data</Heading>
          <Box
            display="flex"
            flexDirection="row"
            height="300px"
            overflow="auto"
          >
            {Array.from(recordCardListByTable).map(([key, value]) => {
              return value;
            })}
          </Box>
          <Box display="flex" flexDirection="row-reverse">
            <Button
              marginTop="8px"
              variant="primary"
              style={importButtonSuccess ? { backgroundColor: "green" } : {}}
              onClick={async () => {
                await insertRecordsIntoTables(base, queryResponse);
                await insertQueryIntoQueriesTable(base, importQuery, props.url);
                setImportButtonSuccess(true);
                setTimeout(() => {
                  setImportButtonSuccess(false);
                }, 1000);
              }}
            >
              {importButtonSuccess ? (
                <span>
                  Success! <Icon name="check"></Icon>
                </span>
              ) : (
                "Import"
              )}
            </Button>
          </Box>
        </Box>
      )}
    </Dialog>
  );
}

export default ImportDialog;
