const fs = require("fs");
const path = require("path");
/**
 * @type {string} 확인할 진단평가 원본 경로
 */
const targetDirectory = "D:\\aidt\\진단평가\\aidt-check";

/**
 * @description fuction: 단순 진단 평가 문항(문제) 오디오 파일 확인용
 * @param {string} dir 진단평가 경로
 */
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
console.log(`specificWavFiles: ${specificWavFiles}`);
