import { filePathToPseudoNamespace, getPathToRoot, lowercaseFirst, getRequestType, getResponseType } from "../util";
import { ExportMap } from "../ExportMap";
import { Printer } from "../Printer";
import { FileDescriptorProto } from "google-protobuf/google/protobuf/descriptor_pb";
import { WellKnownTypesMap } from "../WellKnown";
import { getFieldType, MESSAGE_TYPE } from "./FieldTypes";
import { printMessage } from "./message";
import { printEnum } from "./enum";
import { printExtension } from "./extensions";
import { printDocumentation } from "./documentation";

export function printFileDescriptorTSServices(fileDescriptor: FileDescriptorProto, exportMap: ExportMap) {
  if (fileDescriptor.getServiceList().length === 0) {
    return "";
  }

  const fileName = fileDescriptor.getName();
  //const packageName = fileDescriptor.getPackage();
  const upToRoot = getPathToRoot(fileName);

  const printer = new Printer(0);
  //printer.printLn(`// package: ${packageName}`);
  //printer.printLn(`// file: ${fileDescriptor.getName()}`);
  printer.printLn(`import * as grpc from "grpc";`);
  //printer.printLn(`import * as jspb from "google-protobuf";`);
  //printer.printEmptyLn();

  // Need to import the non-service file that was generated for this .proto file
  //const asPseudoNamespace = filePathToPseudoNamespace(fileName);
  //printer.printLn(`import * as ${asPseudoNamespace} from "${upToRoot}${filePathFromProtoWithoutExtension(fileName)}";`);

  fileDescriptor.getDependencyList().forEach((filePath: string) => {
    const pseudoNamespace = filePathToPseudoNamespace(filePath);
    if (filePath in WellKnownTypesMap) {
      printer.printLn(`import * as ${pseudoNamespace} from "${WellKnownTypesMap[filePath]}";`);
    } else {
      printer.printLn(`import * as ${pseudoNamespace} from "${upToRoot + filePath}";`);
    }
  });

  fileDescriptor.getServiceList().forEach(service => {
    /*
    printer.printLn(`export class ${service.getName()} {`);
    printer.printIndentedLn(`static serviceName = "${packageName ? packageName + "." : ""}${service.getName()}";`);
    printer.printLn(`}`);
    */
    //printer.printEmptyLn();
    /**
     * Service NameSpace
     */
    printer.printLn(`export namespace ${service.getName()} {`);
    // Service Interface
    printer.print(printDocumentation('interface', `${service.getName()}.Service`, 1, `${service.getName()} interface that provides types
   * for methods from the given gRPC ${service.getName()} Service.`));
    printer.printIndentedLn(`export interface Service {`);
    const methodPrinter = new Printer(1);
    service.getMethodList().forEach(method => {
      methodPrinter.write(printDocumentation('method', `${service.getName()}.Service.${lowercaseFirst(method.getName())}`, 2, `${service.getName()} method declaration
     * from the given gRPC ${service.getName()} service.`));
      const requestMessageTypeName = getFieldType(MESSAGE_TYPE, method.getInputType().slice(1), "", exportMap);
      const responseMessageTypeName = getFieldType(MESSAGE_TYPE, method.getOutputType().slice(1), "", exportMap);
      // TODO: make sure the streaming types are set up
      methodPrinter.printIndentedLn(`${
        lowercaseFirst(method.getName())
      }(${
        getRequestType(method, requestMessageTypeName, responseMessageTypeName)
      }): ${getResponseType(method, responseMessageTypeName)};`);
    });
    printer.print(methodPrinter.output);
    printer.printIndentedLn(`}`);
    // End of Service
    //printer.printEmptyLn();
    // Service Config
    const configPrinter = new Printer(1);
    service.getMethodList().forEach(method => {
      configPrinter.write(printDocumentation('namespace', `${service.getName()}.${method.getName()}`, 1, `${service.getName()} method configuration
   * from the given gRPC ${service.getName()} service.`));
      configPrinter.printLn(`export namespace ${method.getName()} {`);
      configPrinter.printIndentedLn(`export const PROTO_NAME: string = '${fileDescriptor.getName()}';`);
      configPrinter.printIndentedLn(`export const PROTO_PACKAGE: string = '${fileDescriptor.getPackage()}';`);
      configPrinter.printIndentedLn(`export const SERVICE_NAME: string = '${service.getName()}';`);
      configPrinter.printIndentedLn(`export const METHOD_NAME: string = '${method.getName()}';`);
      configPrinter.printIndentedLn(`export const REQUEST_STREAM: boolean = ${method.getClientStreaming()};`);
      configPrinter.printIndentedLn(`export const RESPONSE_STREAM: boolean = ${method.getServerStreaming()};`);
      configPrinter.printLn(`}`);
      //configPrinter.printIndentedLn(`static readonlt5r, y requestType = ${requestMessageTypeName};`);
      //configPrinter.printIndentedLn(`static readonly responseType = ${responseMessageTypeName};`);
    });
    printer.print(configPrinter.output);
    printer.printLn(`}`);
    // Service Messages
    fileDescriptor.getMessageTypeList().forEach(enumType => {
      printer.print(printMessage(fileName, exportMap, enumType, 0, fileDescriptor));
    });
    // Service Extensions
    fileDescriptor.getExtensionList().forEach(extension => {
      printer.print(printExtension(fileName, exportMap, extension, 0));
    });
    // Service Enums
    fileDescriptor.getEnumTypeList().forEach(enumType => {
      printer.print(printEnum(enumType, 0));
    });
  });

  return printer.getOutput();
}
