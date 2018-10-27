
import {Printer} from "../Printer";

export function printConfig(
    type: string,
    name: string,
    indentLevel: number,
    description: string
) {
    const printer = new Printer(indentLevel);
    printer.printLn("/**");
    printer.printLn(` * @${type} ${name}`);
    printer.printLn(` * @description ${description}`);
    printer.printLn(" */");
  return printer.getOutput();
}
