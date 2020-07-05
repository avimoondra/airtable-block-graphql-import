import { Box, Button, initializeBlock, useSynced } from "@airtable/blocks/ui";
import React from "react";
import GraphiQLWrapper from "./GraphiQLWrapper";
import ImportDialog from "./ImportDialog";
import {
  AIRTABLE_BLOCK_GQL_IMPORT_HEADERS,
  useLocalStorage,
} from "./local-storage-util";

function GraphqlImportBlock() {
  const [url, setUrl, canSetUrl] = useSynced("url");
  const [
    headers,
    setHeaders,
  ] = useLocalStorage(AIRTABLE_BLOCK_GQL_IMPORT_HEADERS, [
    { key: "Content-Type", value: "application/json" },
  ]);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <Box padding={"16px"}>
      {dialogOpen && (
        <ImportDialog
          onClose={() => setDialogOpen(false)}
          url={url as string}
          headers={headers}
        ></ImportDialog>
      )}
      <GraphiQLWrapper
        importButton={
          <Button
            variant="primary"
            onClick={() => {
              setDialogOpen(true);
            }}
          >
            Import
          </Button>
        }
        url={url as string}
        headers={headers}
        setUrl={(newUrl: string) => {
          if (canSetUrl) {
            setUrl(newUrl);
          }
        }}
        setHeaders={(newHeaders: Array<any>) => setHeaders(newHeaders)}
      ></GraphiQLWrapper>
    </Box>
  );
}

initializeBlock(() => <GraphqlImportBlock />);
