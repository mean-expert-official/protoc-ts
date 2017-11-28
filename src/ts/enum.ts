import {EnumDescriptorProto} from "google-protobuf/google/protobuf/descriptor_pb";
import {Printer} from "../Printer";
import {printDocumentation} from "./documentation";

export function printEnum(enumDescriptor: EnumDescriptorProto, indentLevel: number) {
  const printer: Printer = new Printer(indentLevel);
  const enumName: string = enumDescriptor.getName()
  printer.write(printDocumentation('enum', enumName, 0, `${enumName} enum declaration that
 * provides values from the given gRPC ${enumName} Enum.`));
  printer.printLn(`export enum ${enumDescriptor.getName()} {`);
  enumDescriptor.getValueList().forEach(value => {
    printer.printIndentedLn(`${value.getName().toUpperCase()} = ${value.getNumber()},`);
  });
  printer.printLn(`}`);
  return printer.getOutput();
}
