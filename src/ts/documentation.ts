
import {Printer} from "../Printer";

export function printDocumentation(
    type: string,
    name: string,
    indentLevel: number,
    description: string
) {
    const printer = new Printer(indentLevel);
    printer.printLn("/**");
    printer.printLn(` * @${type} ${name}`);
    printer.printLn(" * @author Jonathan Casarrubias <t: johncasarrubias>");
    printer.printLn(" * @license MIT");
    printer.printLn(` * @description ${description}`);
    printer.printLn(" */");
  return printer.getOutput();
}
