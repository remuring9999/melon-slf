import { parseSLF } from "./src/index";
import fs from "fs";

const buffer = fs.readFileSync("Smile For You.slf");
const result = parseSLF(buffer);

console.log(result);
