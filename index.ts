#!/usr/bin/env node
import chalk from "chalk";
import Table from "cli-table3";
import fs from "fs";
import yaml from "js-yaml";

const allArguments = process.argv;
const myArguments: string[] = allArguments.slice(2);
let fileContents;

if (!myArguments.length) {
  console.warn(
    chalk.hex("#FFA500")(
      `Usage: build/index.js [./open-api-file-path.yaml/json]`
    )
  );
  process.exit(1);
}
if (!fs.existsSync(myArguments[0])) {
  console.error(chalk.red(`File '${myArguments[0]}' not found`));
  process.exit(1);
}
try {
  fileContents = fs.readFileSync(myArguments[0], "utf8");
} catch (err) {
  console.error(chalk.red((err as Error).message));
  process.exit(1);
}

const yamlData = yaml.load(fileContents);

type GenericObjectType = { [key: string]: any };

const findNestedKeyRecursively = (
  searchKey: string,
  data: GenericObjectType
): any => {
  for (const [key, value] of Object.entries(data)) {
    if (key === searchKey) {
      return value;
    }
    if (typeof value === "object") {
      const result = findNestedKeyRecursively(searchKey, value);
      if (result) {
        return result;
      }
    }
  }
};

const getFileName = (data: GenericObjectType) => {
  const allEndpoints = Object.keys(data.paths);
  const onlyGetRequestEndpoints = allEndpoints.filter(
    (endpoint) => typeof data.paths[endpoint].get === "object"
  );

  const endpointsAndFileNames = onlyGetRequestEndpoints.map(
    (endpoint) =>
      new Map([
        [
          endpoint,
          findNestedKeyRecursively("$ref", data.paths[endpoint].get.responses)
            ?.split("/")
            .pop() ?? "",
        ],
      ])
  );

  return endpointsAndFileNames;
};

const generateCliTable = (endpointsAndFileNames: Map<string, string>[]) => {
  const table = new Table({
    head: ["Endpoint", "File Name"],
    style: { head: ["cyan"] },
  });

  for (const endpointAndFileName of endpointsAndFileNames) {
    table.push([
      endpointAndFileName.keys().next().value,
      endpointAndFileName.values().next().value,
    ]);
  }

  console.log(table.toString());
};

generateCliTable(getFileName(yamlData as GenericObjectType));
