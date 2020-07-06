import { isEmpty } from "lodash";

export const headerListToObj = (
  headers: Array<{ key: string; value: string }>
) => {
  let headerObj = {};
  headers.forEach((header) => {
    if (!isEmpty(header.key) && !isEmpty(header.value)) {
      headerObj[header.key] = header.value;
    }
  });
  return headerObj;
};
