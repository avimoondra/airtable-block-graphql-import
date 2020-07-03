import { FieldType } from "@airtable/blocks/models";
import {
  isBoolean,
  isDate,
  isEmpty,
  isInteger,
  isNull,
  isNumber,
  isString,
  isUndefined,
} from "lodash";

export const javascriptTypeToAirtableFieldType = (value: any): FieldType => {
  if (isUndefined(value) || isNull(value) || isEmpty(value)) {
    return FieldType.SINGLE_LINE_TEXT;
  }
  if (isDate(value)) {
    return FieldType.DATE;
  }
  if (isString(value)) {
    return FieldType.SINGLE_LINE_TEXT;
  }
  if (isNumber(value) || isInteger(value)) {
    return FieldType.SINGLE_LINE_TEXT;
  }
  if (isBoolean(value)) {
    return FieldType.SINGLE_LINE_TEXT; // TODO: update to checkbox.
  }
};
