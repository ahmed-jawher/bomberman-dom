import fs from "fs";
import { dirname } from "path";
import path from "path";
import { getContentType } from "../service/serverS.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const webDir = path.join(__dirname, "../../web");

function serveIndex(res) {
  const indexPath = path.join(webDir, "index.html");
  fs.readFile(indexPath, (indexErr, indexContent) => {
    if (indexErr) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/plain");
      res.end("Error loading index.html");
    } else {
      const contentType = getContentType(indexPath);
      res.statusCode = 200;
      res.setHeader("Content-Type", contentType);
      res.end(indexContent);
    }
  });
}

function serveFilesHandler(req, res) {
  // req.url is raw, attacker controlled text. `GET /../server/server.js` used
  // to be joined straight onto webDir and handed the server source back; a NUL
  // byte in it makes fs.readFile throw synchronously and kill the process.
  const requestedPath = req.url.split("?")[0].split("#")[0];

  if (requestedPath.includes("\0")) {
    serveIndex(res);
    return;
  }

  // path.join normalises the ".." segments away, so the resolved path tells us
  // whether the request escaped the web root.
  const filePath = path.resolve(path.join(webDir, requestedPath));
  if (filePath !== webDir && !filePath.startsWith(webDir + path.sep)) {
    serveIndex(res);
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      serveIndex(res);
    } else {
      const contentType = getContentType(filePath);
      res.statusCode = 200;
      res.setHeader("Content-Type", contentType);
      res.end(content);
    }
  });
}

export default serveFilesHandler;
