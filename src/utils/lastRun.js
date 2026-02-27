import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const lastRunFile = path.join(__dirname, "../../last_run.json");

function getLastId() {
  try {
    const data = fs.readFileSync(lastRunFile, "utf8");
    return JSON.parse(data).last_id || 0;
  } catch {
    return 0;
  }
}

function setLastId(id) {
  fs.writeFileSync(
    lastRunFile,
    JSON.stringify({ last_id: id }, null, 2),
    "utf8"
  );
}

export { getLastId, setLastId };