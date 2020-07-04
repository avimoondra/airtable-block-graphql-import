export const headerListToObj = (
  headers: Array<{ key: string; value: string }>
) => {
  let headerObj = {};
  headers.forEach((header) => {
    headerObj[header.key] = header.value;
  });
  return headerObj;
};
