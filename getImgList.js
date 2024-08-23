const fs = require("fs").promises;
const path = require("path");
/**
 * @type {string} 확인할 진단평가 원본 경로
 */
const targetDirectory = "D:\\aidt\\진단평가\\aidt-check";
/**
 * @type {string[]} 존재하면 안되는 파일 리스트
 */
const eFiles = Array.from({ length: 19 }, (_, i) => `e${i + 2}.png`);

/**
 * @description fuction: 단순 진단 평가 문항(문제) 이미지 파일 확인용
 * @param {string} dir 진단평가 경로
 */

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

getSpecificPngFiles(targetDirectory)
  .then((pngFiles) => {
    console.log("Found Png files:", pngFiles);
  })
  .catch((err) => {
    console.error("Error:", err);
  });
