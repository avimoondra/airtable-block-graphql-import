import {
  Box,
  Button,
  Dialog,
  FormField,
  Heading,
  Input,
} from "@airtable/blocks/ui";
import { JSONPath } from "jsonpath-plus";
import React from "react";
import { headerListToObj } from "./header-util";

function ImportDialog(props: {
  onClose: () => void;
  url: string;
  headers: Array<{ key: string; value: string }>;
}) {
  const [query, setQuery] = React.useState("");
  const [jsonPath, setJsonPath] = React.useState("");
  const [queryResponse, setQueryResponse] = React.useState({});

  // const { JSONPath } = require("jsonpath-plus");

  return (
    <Dialog onClose={props.onClose} height={"90vh"}>
      <Dialog.CloseButton />
      <Heading>Import</Heading>
      <Box display="flex" alignItems="center">
        <FormField label="Query" marginRight="4px">
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
          ></Input>
        </FormField>
        <FormField label="JSON path" marginRight="4px">
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
              body: JSON.stringify({ query }),
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

      <Box height={"200px"} overflowY="auto" border={"1px solid gray"}>
        <pre>{JSON.stringify(queryResponse, null, 2)}</pre>
      </Box>
    </Dialog>
  );
}

export default ImportDialog;
