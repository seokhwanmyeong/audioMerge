import fs from "fs";
import path from "path";
import crypto from "crypto";
import { parseFile } from "music-metadata";

// 주어진 MP3 파일의 경로
const targetFilePath = "C:/Users/silen/Desktop/aidt/audioMaker/compareMp3.mp3";

// 비교할 디렉터리 경로 목록
const directories = [
  "C:/Users/silen/Desktop/aidt/aidt-contents/ham",
  "C:/Users/silen/Desktop/aidt/aidt-contents/kim",
  "C:/Users/silen/Desktop/aidt/aidt-contents/lee",
];

// 동일한 파일을 저장할 배열
const matchedFiles = [];

// 파일의 오디오 데이터 해시 값을 계산하는 함수
async function getAudioHash(filePath) {
  const metadata = await parseFile(filePath, { duration: true });
  const audioStream = fs.createReadStream(filePath, {
    start: metadata.native?.start,
    end: metadata.native?.end,
  });

  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");

    audioStream.on("data", (data) => hash.update(data));
    audioStream.on("end", () => resolve(hash.digest("hex")));
    audioStream.on("error", reject);
  });
}

// 주어진 디렉터리를 재귀적으로 탐색하여 모든 MP3 파일의 경로를 찾는 함수
function findMp3Files(dir) {
  const mp3Files = [];

  function findFilesRecursive(folder) {
    const files = fs.readdirSync(folder);

    for (const file of files) {
      const fullPath = path.join(folder, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        findFilesRecursive(fullPath);
      } else if (stat.isFile() && path.extname(fullPath) === ".mp3") {
        mp3Files.push(fullPath);
      }
    }
  }

  findFilesRecursive(dir);
  return mp3Files;
}

// 주어진 MP3 파일과 모든 디렉터리 내의 파일을 비교하는 함수
async function compareFiles() {
  try {
    // 주어진 파일의 오디오 데이터 해시 값 계산
    const targetHash = await getAudioHash(targetFilePath);
    console.log(`Target file audio hash: ${targetHash}`);

    for (const directory of directories) {
      const mp3Files = findMp3Files(directory);

      for (const filePath of mp3Files) {
        const fileHash = await getAudioHash(filePath);

        if (fileHash === targetHash) {
          matchedFiles.push({
            path: filePath,
            name: path.basename(filePath),
          });
          console.log(`Match found: ${filePath}`);
        }
      }
    }

    // 찾은 파일을 JSON 형식으로 저장
    const jsonOutput = JSON.stringify(matchedFiles, null, 4);
    fs.writeFileSync("matchedFiles.json", jsonOutput);

    console.log("Matched files have been saved to matchedFiles.json");
  } catch (error) {
    console.error("Error:", error);
  }
}

// 비교 작업 실행
compareFiles();
