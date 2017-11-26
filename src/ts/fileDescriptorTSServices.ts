import { filePathToPseudoNamespace, getPathToRoot, lowercaseFirst } from "../util";
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
      const requestMessageTypeName = getFieldType(MESSAGE_TYPE, method.getInputType().slice(1), "", exportMap);
      const responseMessageTypeName = getFieldType(MESSAGE_TYPE, method.getOutputType().slice(1), "", exportMap);
      methodPrinter.printIndentedLn(`${lowercaseFirst(method.getName())}(request: ${requestMessageTypeName}): ${responseMessageTypeName};`);
    });
    printer.print(methodPrinter.output);
    printer.printIndentedLn(`}`);
    // End of Service
    //printer.printEmptyLn();
    // Service Messages
    fileDescriptor.getMessageTypeList().forEach(enumType => {
      printer.print(printMessage(service, fileName, exportMap, enumType, 1, fileDescriptor));
    });
    // Service Extensions
    fileDescriptor.getExtensionList().forEach(extension => {
      printer.print(printExtension(fileName, exportMap, extension, 1));
    });
    // Service Enums
    fileDescriptor.getEnumTypeList().forEach(enumType => {
      printer.print(printEnum(service, enumType, 1));
    });
    // Service Config
    printer.print(printDocumentation('namespace', `Config`, 1, `Config namespace that provides configurations
    * for methods from the given gRPC ${service.getName()} Service.`));
    printer.printIndentedLn(`export namespace Config {`);
    const configPrinter = new Printer(2);
    service.getMethodList().forEach(method => {

      configPrinter.printLn(`export namespace ${method.getName()} {`);
      configPrinter.printIndentedLn(`export const PROTO_NAME: string = '${fileDescriptor.getName()}';`);
      configPrinter.printIndentedLn(`export const PROTO_PACKAGE: string = '${fileDescriptor.getPackage()}';`);
      configPrinter.printIndentedLn(`export const SERVICE_NAME: string = '${service.getName()}';`);
      configPrinter.printIndentedLn(`export const METHOD_NAME: string = '${method.getName()}';`);
      configPrinter.printIndentedLn(`export const REQUEST_STREAM: boolean = ${method.getClientStreaming()};`);
      configPrinter.printIndentedLn(`export const RESPONSE_STREAM: boolean = ${method.getServerStreaming()};`);
      configPrinter.printLn(`}`);
      //configPrinter.printIndentedLn(`static readonly requestType = ${requestMessageTypeName};`);
      //configPrinter.printIndentedLn(`static readonly responseType = ${responseMessageTypeName};`);
    });
    printer.print(configPrinter.output);
    printer.printIndentedLn(`}`);
    /* TODO: Migrate to helper
        printer.printLn(`export namespace ${service.getName()}Config {`);
        const classPrinter = new Printer(2);
        service.getMethodList().forEach(method => {
          // const requestMessageTypeName = getFieldType(MESSAGE_TYPE, method.getInputType().slice(1), "", exportMap);
          //const responseMessageTypeName = getFieldType(MESSAGE_TYPE, method.getOutputType().slice(1), "", exportMap);
          classPrinter.printLn(`export class ${method.getName()} {`);
          classPrinter.printIndentedLn(`static readonly methodName: string = '${method.getName()}';`);
          classPrinter.printIndentedLn(`static readonly service: string = '${service.getName()};'`);
          classPrinter.printIndentedLn(`static readonly requestStream: boolean = ${method.getClientStreaming()};`);
          classPrinter.printIndentedLn(`static readonly responseStream: boolean = ${method.getServerStreaming()};`);
          //classPrinter.printIndentedLn(`static readonly requestType = ${requestMessageTypeName};`);
          //classPrinter.printIndentedLn(`static readonly responseType = ${responseMessageTypeName};`);
          classPrinter.printLn(`}`);
        });
        printer.print(classPrinter.output);
        printer.printLn(`}`);
        */

    printer.printLn(`}`);

  });

  return printer.getOutput();
}
