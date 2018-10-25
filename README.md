# protoc-ts
> Protoc compiler for TypeScript service interfaces

## Installation

````sh
$ npm install --save @xanthous/protoc-ts
````

## Usage
* Make sure the protoc compiler is installed. [Compiler Releases](https://github.com/google/protobuf/releases/tag/v3.5.0)
* Invoke `protoc` with:
* `--plugin` - define where the plugin needed for `ts_out` can be found
* `--ts_out` - the params and directory to output to 
* `generated` - output directory name
* `-I` - Protos root directory

```sh
protoc \
--plugin=protoc-ts=./node_modules/.bin/protoc-ts \
--ts_out=service=true:generated \
-I ./proto \
proto/*.proto
```
