const fs = require("fs").promises;
const path = require("path");

async function getSpecificPngFiles(dir, pngFiles = []) {
  const files = await fs.readdir(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      await getSpecificPngFiles(fullPath, pngFiles);
    } else if (path.extname(fullPath) === ".png" && eFiles.includes(file)) {
      pngFiles.push(fullPath);
    }
  }

  return pngFiles;
}

// Example usage
const eFiles = Array.from({ length: 19 }, (_, i) => `e${i + 2}.png`);

console.log(eFiles);
getSpecificPngFiles("D:/aidt/진단평가/aidt-check")
  .then((pngFiles) => {
    console.log("Found Png files:", pngFiles);
  })
  .catch((err) => {
    console.error("Error:", err);
  });
