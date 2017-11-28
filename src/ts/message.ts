import {
  snakeToCamel, uppercaseFirst, isProto2, withinNamespaceFromExportEntry, filePathToPseudoNamespace
} from "../util";
import {ExportMap} from "../ExportMap";
import {FieldDescriptorProto, FileDescriptorProto, DescriptorProto} from "google-protobuf/google/protobuf/descriptor_pb";
import {MESSAGE_TYPE, BYTES_TYPE, getFieldType, getTypeName} from "./FieldTypes";
import {Printer} from "../Printer";
import {printEnum} from "./enum";
import {printExtension} from "./extensions";
import {printOneOfDecl} from "./oneOf";
import {printDocumentation} from "./documentation";
function hasFieldPresence(field: FieldDescriptorProto, fileDescriptor: FileDescriptorProto): boolean {
  if (field.getLabel() === FieldDescriptorProto.Label.LABEL_REPEATED) {
    return false;
  }

  if (field.hasOneofIndex()) {
    return true;
  }

  if (field.getType() === MESSAGE_TYPE) {
    return true;
  }

  if (isProto2(fileDescriptor)) {
    return true;
  }

  return false;
}

export function printMessage(fileName: string, exportMap: ExportMap, messageDescriptor: DescriptorProto, indentLevel: number, fileDescriptor: FileDescriptorProto) {
  const messageName = messageDescriptor.getName();
  const messageOptions = messageDescriptor.getOptions();
  if (messageOptions !== undefined && messageOptions.getMapEntry()) {
    // this message type is the entry tuple for a map - don't output it
    return "";
  }

  const objectTypeName = `AsObject`;
  const toObjectType = new Printer(indentLevel + 1);
  toObjectType.printLn(`export type ${objectTypeName} = {`);

  const printer = new Printer(indentLevel);

  printer.write(printDocumentation('interface', messageName, 0, `${messageName} interface that provides properties
 * and typings from the given gRPC ${messageName} Message.`));

  printer.printLn(`export interface ${messageName} {`);

  const oneOfGroups: Array<Array<FieldDescriptorProto>> = [];

  messageDescriptor.getFieldList().forEach(field => {
    if (field.hasOneofIndex()) {
      const oneOfIndex = field.getOneofIndex();
      let existing = oneOfGroups[oneOfIndex];
      if (existing === undefined) {
        existing = [];
        oneOfGroups[oneOfIndex] = existing;
      }
      existing.push(field);
    }
    const snakeCaseName = field.getName().toLowerCase();
    const camelCaseName = snakeToCamel(snakeCaseName);
    const withUppercase = uppercaseFirst(camelCaseName);
    const type = field.getType();

    let exportType = getTypeName(type);
    const fullTypeName = field.getTypeName().slice(1);
    
    if (type === MESSAGE_TYPE) {
      const fieldMessageType = exportMap.getMessage(fullTypeName);
      if (fieldMessageType === undefined) {
        throw new Error("No message export for: " + fullTypeName);
      }
      if (fieldMessageType.messageOptions !== undefined && fieldMessageType.messageOptions.getMapEntry()) {
        // This field is a map
        const keyTuple = fieldMessageType.mapFieldOptions!.key;
        const keyType = keyTuple[0];
        const keyTypeName = getFieldType(keyType, keyTuple[1], fileName, exportMap);
        const valueTuple = fieldMessageType.mapFieldOptions!.value;
        const valueType = valueTuple[0];
        let valueTypeName = getFieldType(valueType, valueTuple[1], fileName, exportMap);
        if (valueType === BYTES_TYPE) {
          valueTypeName = "Uint8Array | string";
        }
        printer.printIndentedLn(`get${withUppercase}Map(): jspb.Map<${keyTypeName}, ${valueTypeName}>;`);
        printer.printIndentedLn(`clear${withUppercase}Map(): void;`);
        toObjectType.printIndentedLn(`${camelCaseName}Map: Array<[${keyTypeName}${keyType === MESSAGE_TYPE ? ".AsObject" : ""}, ${valueTypeName}${valueType === MESSAGE_TYPE ? ".AsObject" : ""}]>,`);
        return;
      }
      const withinNamespace = withinNamespaceFromExportEntry(fullTypeName, fieldMessageType);
      if (fieldMessageType.fileName === fileName) {
        exportType = withinNamespace;
      } else {
        exportType = filePathToPseudoNamespace(fieldMessageType.fileName) + "." + withinNamespace;
      }
    }

    let hasClearMethod = false;
    function printClearIfNotPresent() {
      if (!hasClearMethod) {
        hasClearMethod = true;
        printer.printIndentedLn(`clear${withUppercase}${field.getLabel() === FieldDescriptorProto.Label.LABEL_REPEATED ? "List" : ""}(): void;`);
      }
    }

    if (hasFieldPresence(field, fileDescriptor)) {
      printer.printIndentedLn(`has${withUppercase}(): boolean;`);
      printClearIfNotPresent();
    }

    let canBeUndefined = false;
    if (type === MESSAGE_TYPE) {
      if (!isProto2(fileDescriptor) || (field.getLabel() === FieldDescriptorProto.Label.LABEL_OPTIONAL)) {
        canBeUndefined = true;
      }
    } else {
      if (isProto2(fileDescriptor)) {
        canBeUndefined = true;
      }
    }
    printer.printIndentedLn(`${camelCaseName}${canBeUndefined ? "?" : ""}: ${exportType}${field.getLabel() === FieldDescriptorProto.Label.LABEL_REPEATED ? '[]' : ''};`);
  });

  toObjectType.printLn(`}`);
/*
  messageDescriptor.getOneofDeclList().forEach(oneOfDecl => {
    printer.printIndentedLn(`get${oneOfName(oneOfDecl.getName())}Case(): ${messageName}.${oneOfName(oneOfDecl.getName())}Case;`);
  });

  printer.printIndentedLn(`serializeBinary(): Uint8Array;`);
  printer.printIndentedLn(`toObject(includeInstance?: boolean, msg?: ${messageName}): ${messageName}.${objectTypeName};`);
  printer.printIndentedLn(`extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};`);
  printer.printIndentedLn(`extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};`);
  printer.printIndentedLn(`serializeBinaryToWriter(message: ${messageName}, writer: jspb.BinaryWriter): void;`);
  printer.printIndentedLn(`deserializeBinary(bytes: Uint8Array): ${messageName};`);
  printer.printIndentedLn(`deserializeBinaryFromReader(message: ${messageName}, reader: jspb.BinaryReader): ${messageName};`);
*/
  printer.printLn(`}`);
//  printer.printEmptyLn();
/*
  printer.printLn(`export namespace ${messageName} {`);

  printer.print(toObjectType.getOutput());
*/
  //printer.printEmptyLn();
  messageDescriptor.getNestedTypeList().forEach(nested => {
    const msgOutput = printMessage(fileName, exportMap, nested, indentLevel, fileDescriptor);
    if (msgOutput !== "") {
      // If the message class is a Map entry then it isn't output, so don't print the namespace block
      printer.write(msgOutput);
    }
  });
  messageDescriptor.getEnumTypeList().forEach(enumType => {
    printer.write(`${printEnum(enumType, indentLevel)}`);
  });
  messageDescriptor.getOneofDeclList().forEach((oneOfDecl, index) => {
    printer.write(`${printOneOfDecl(oneOfDecl, oneOfGroups[index] || [], indentLevel)}`);
  });
  messageDescriptor.getExtensionList().forEach(extension => {
    printer.write(printExtension(fileName, exportMap, extension, indentLevel));
  });

  //printer.printLn(`}`);

  return printer.getOutput();
}
