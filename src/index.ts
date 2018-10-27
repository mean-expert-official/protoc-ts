/**
 * @author improbable <https://github.com/improbable-eng>
 * @license Apache 2.0
 *
 * This is the ProtoC compiler plugin.
 *
 * It only accepts stdin/stdout output according to the protocol
 * specified in [plugin.proto](https://github.com/google/protobuf/blob/master/src/google/protobuf/compiler/plugin.proto).
 */
import {ExportMap} from "./ExportMap";
import {withAllStdIn} from "./util";
import {CodeGeneratorRequest, CodeGeneratorResponse} from "google-protobuf/google/protobuf/compiler/plugin_pb";
import {FileDescriptorProto} from "google-protobuf/google/protobuf/descriptor_pb";
import {printFileDescriptorTSServices} from "./ts/fileDescriptorTSServices";
withAllStdIn((inputBuff: Buffer) => {
  try {
    const typedInputBuff = new Uint8Array(inputBuff.length);
    typedInputBuff.set(inputBuff);

    const codeGenRequest = CodeGeneratorRequest.deserializeBinary(typedInputBuff);
    const codeGenResponse = new CodeGeneratorResponse();
    const exportMap = new ExportMap();
    const fileNameToDescriptor: {[key: string]: FileDescriptorProto} = {};
    /**
     * Edited by Jonathan Casarrubias to avoid creating original
     * declaration files.
     *
     * Apache 2.0
     */
    // Generate separate `.ts` files for services if param is set
    // const generateServices = codeGenRequest.getParameter() === "service=true";

    codeGenRequest.getProtoFileList().forEach(protoFileDescriptor => {
      fileNameToDescriptor[protoFileDescriptor.getName()] = protoFileDescriptor;
      exportMap.addFileDescriptor(protoFileDescriptor);
    });

    codeGenRequest.getFileToGenerateList().forEach(fileName => {
        /**
         * Edited by Jonathan Casarrubias to avoid creating original
         * declaration files.
         *
         * Apache 2.0
         */
        const fileDescriptorOutput = printFileDescriptorTSServices(fileNameToDescriptor[fileName], exportMap);
        if (fileDescriptorOutput !== "") {
          const thisServiceFile = new CodeGeneratorResponse.File();
          thisServiceFile.setName(fileName + ".ts");
          thisServiceFile.setContent(fileDescriptorOutput);
          codeGenResponse.addFile(thisServiceFile);
        }
    });

    process.stdout.write(new Buffer(codeGenResponse.serializeBinary()));
  } catch (err) {
    console.error("protoc-gen-ts error: " + err.stack + "\n");
    process.exit(1);
  }
});
