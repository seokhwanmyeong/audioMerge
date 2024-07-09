const fs = require("fs");
const path = require("path");

const targetDirectory = "D:\\aidt\\진단평가\\aidt-check";

function getSpecificWavFiles(dir, wavFiles = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      getSpecificWavFiles(fullPath, wavFiles);
    } else if (path.extname(fullPath) === ".wav" && file.includes("e2")) {
      wavFiles.push(fullPath);
    }
  });

  return wavFiles;
}

const specificWavFiles = getSpecificWavFiles(targetDirectory);
console.log(specificWavFiles);
