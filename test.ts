import { parseSLF, convertLRC } from "./src/index";
import fs from "fs";

const buffer = fs.readFileSync("Smile For You.slf");
const result = parseSLF(buffer);

console.log(result);
console.log(convertLRC(result));
