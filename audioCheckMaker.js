const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;
const path = require("path");
const fs = require("fs");
/**
 * @type {string} 편집할 진단평가 음원 원본 폴더 경로
 */
const basePath = "D:\\aidt\\진단평가\\audio";
/**
 * @type {string} 임시 저장 경로
 */
const inputDir = "D:\\aidt\\audioMerge\\audios";
/**
 * @type {string} 저장할 진단평가 폴더 경로
 */
const destDir = "D:\\aidt\\진단평가\\aidt-check";
/**
 * @type {string[]} 편집할 진단평가 음원 원본 폴더 상세 경로
 */
const directoryPaths = [`${basePath}\\Ham\\Ham3`, `${basePath}\\Ham\\Ham4`, `${basePath}\\Lee\\Lee3`, `${basePath}\\Lee\\Lee4`, `${basePath}\\Kim\\Kim3`, `${basePath}\\Kim\\Kim4`];
/**
 * @type {number} 합치는 audio사이 공백시간
 */
const duration = 0.6;

/**
 * @description fuction: 해당 경로에 폴더가 있는지 검사
 * @param {string} filePath 폴더 경로
 */
const ensureDirectoryExistence = (filePath) => {
  if (fs.existsSync(filePath)) {
    return true;
  } else {
    fs.mkdirSync(filePath, { recursive: true });
  }
};

/**
 * @description fuction: 공백 오디오 파일 임시 생성
 * @param {number} duration 저자
 * @param {(err: string | null, filePath: string) => void} callback
 */
const createSilence = (duration, callback) => {
  const silenceFilePath = path.join(destDir, `silence_${Date.now()}.mp3`);
  ffmpeg()
    .input("anullsrc=r=44100:cl=stereo")
    .inputFormat("lavfi")
    .duration(duration)
    .output(silenceFilePath)
    .on("end", () => {
      // console.log("Silence file created successfully.");
      callback(null, silenceFilePath);
    })
    .on("error", (err) => {
      console.error("Error creating silence file:", err);
      callback(err);
    })
    .run();
};

/**
 * @description fuction: 공백 오디오 파일 임시 생성
 * @param {string[]} inputFiles 합칠 오디오 파일 리스트
 * @param {string} outputFile 결과 파일 저장 경로
 * @param {(err: string | null) => void} callback
 */
const concatenateMP3Files = (inputFiles, outputFile, callback) => {
  const command = ffmpeg();

  inputFiles.forEach((file) => {
    command.input(file);
  });

  command
    .on("error", (err) => {
      console.log("Error:", err.message);
      callback(err);
    })
    .on("end", () => {
      console.log("Concatenation finished!");
      callback(null);
    })
    .mergeToFile(outputFile, path.join(inputDir, "tempDir"));
};

/**
 * @description fuction: 파일 이름변경 및 복사
 * @param {string} source 파일 원본 경로
 * @param {string} destination 저장할 경로
 */
const copyAndRenameFile = (source, destination) => {
  fs.copyFile(source, destination, (err) => {
    if (err) {
      console.error("Error copying the file:", err);
    } else {
      // console.log(`File copied to ${destination}`);
    }
  });
};

/**
 * @description fuction: 임시 생성한 공백 오디오 파일 제거
 */
const cleanUpSilenceFile = async () => {
  const silenceFiles = fs.readdirSync(destDir).filter((file) => file.startsWith("silence_"));
  const tasks = silenceFiles.map((file) => {
    return new Promise((resolve, reject) => {
      const filePath = path.join(destDir, file);
      fs.unlink(filePath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
  await Promise.all(tasks);
};

/**
 * @description fuction: 파일명을 비교하여 순서대로 sort
 * @param {string[]} fileNames 파일명 배열
 */
const sortFileNames = (fileNames) => {
  return fileNames.sort((a, b) => {
    const parseFileName = (file) => {
      const nameWithoutExtension = file.replace(".mp3", "");
      return nameWithoutExtension.split(/_|\.|e/).map((part) => (isNaN(part) ? part : parseInt(part, 10)));
    };

    const partsA = parseFileName(a);
    const partsB = parseFileName(b);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      if (partsA[i] === undefined) return -1;
      if (partsB[i] === undefined) return 1;
      if (partsA[i] > partsB[i]) return 1;
      if (partsA[i] < partsB[i]) return -1;
    }
    return 0;
  });
};

const generateAudioFolder = async (fileList) => {
  const tasks = [];
  const mediaPaths = [];
  const tmp = [];

  try {
    Object.entries(fileList).forEach((objWriter) => {
      const writer = objWriter[0];
      const grades = objWriter[1];

      Object.entries(grades).forEach((objGrade) => {
        const grade = objGrade[0];
        const chapters = objGrade[1];

        Object.entries(chapters).forEach((objChapter) => {
          const chapter = objChapter[0];
          const ids = objChapter[1];
          Object.entries(ids).forEach((objId) => {
            const id = objId[0];
            const idData = objId[1];
            const mediaBasePath = `${destDir}\\${writer}\\${grade}\\${chapter}\\${id}\\media`;

            ensureDirectoryExistence(mediaBasePath);

            if (idData.e) {
              const mediaSavePath = `${mediaBasePath}\\e1.wav`;

              if (idData.e.length === 1) {
                const split = idData.e[0].split("_");

                if (split.length > 3) {
                  console.log(`e file name is error : ${idData.e[0]}`);
                } else {
                  const mp3OriginFilePath = `${basePath}\\${writer}\\${grade}\\${idData.e[0]}`;

                  tmp.push(`${mediaSavePath}`);
                  tasks.push(
                    new Promise((resolve) => {
                      copyAndRenameFile(mp3OriginFilePath, mediaSavePath);
                      resolve();
                    })
                  );
                }
              } else {
                mediaPaths.push(`${mediaSavePath}\\e1.wav`);
                tasks.push(
                  new Promise((resolve, reject) => {
                    createSilence(duration, (err, silenceFilePath) => {
                      if (err) {
                        console.error("Failed to create silence file:", err);
                        reject(err);
                        return;
                      }

                      const concateFiles = [];
                      const files = sortFileNames(idData.e);
                      files.map((file, idx) => {
                        concateFiles.push(`${basePath}\\${writer}\\${grade}\\${file}`);

                        if (idx !== files.length) {
                          concateFiles.push(silenceFilePath);
                        }
                      });

                      tmp.push(`${mediaSavePath}`);
                      concatenateMP3Files(concateFiles, mediaSavePath, (err) => {
                        if (err) {
                          console.error("Failed to concatenate files:", err);
                          reject(err);
                        } else {
                          resolve();
                        }
                      });
                    });
                  })
                );
              }
            }

            if (idData.q) {
              if (idData.q.length === 1) {
                if (!file.includes("q1")) {
                  console.log(`q file name is error : ${idData.q[0]}`);
                } else {
                  const mediaSavePath = `${mediaBasePath}\\q1.wav`;
                  const mp3OriginFilePath = `${basePath}\\${writer}\\${grade}\\${idData.q[0]}`;

                  tmp.push(`${mediaSavePath}`);
                  tasks.push(
                    new Promise((resolve) => {
                      copyAndRenameFile(mp3OriginFilePath, mediaSavePath);
                      resolve();
                    })
                  );
                }
              } else {
                const qList = {};
                const qEnum = ["q1", "q2", "q3", "q4"];

                idData.q.map((file) => {
                  const split = file.split("_");
                  const qNum = split[3].replace(".mp3", "");

                  if (split.length < 4 || !qEnum.includes(qNum)) {
                    console.log("filename is error");
                    console.log(file);
                  } else {
                    if (qList[qNum]) {
                      qList[qNum].push(file);
                    } else {
                      qList[qNum] = [file];
                    }
                  }
                });

                Object.entries(qList).map((q) => {
                  const num = q[0];
                  const fileList = q[1];
                  const mediaSavePath = `${mediaBasePath}\\${num}.wav`;

                  mediaPaths.push(mediaSavePath);
                  tmp.push(`${mediaSavePath}`);
                  tasks.push(
                    new Promise((resolve, reject) => {
                      createSilence(duration, (err, silenceFilePath) => {
                        if (err) {
                          console.error("Failed to create silence file:", err);
                          reject(err);
                          return;
                        }

                        const concateFiles = [];
                        const files = sortFileNames(fileList);

                        files.map((file, idx) => {
                          concateFiles.push(`${basePath}\\${writer}\\${grade}\\${file}`);

                          if (idx !== files.length) {
                            concateFiles.push(silenceFilePath);
                          }
                        });

                        concatenateMP3Files(concateFiles, mediaSavePath, (err) => {
                          if (err) {
                            console.error("Failed to concatenate files:", err);
                            reject(err);
                          } else {
                            resolve();
                          }
                        });
                      });
                    })
                  );
                });
              }
            }
          });
        });
      });
    });

    await Promise.all(tasks); // 모든 비동기 작업이 완료될 때까지 기다림

    // CSV 파일로 저장
    console.log("complete", tmp);
    // const csvContent = mediaPaths.join("\n");
    // const csvPath = path.join(destDir, `mediaPaths.csv`);
    // fs.writeFileSync(csvPath, csvContent);
  } catch (err) {
    throw err;
  }
};

/**
 * @description fuction: 해당 경로에소 mp3 음원 파일명을 배열로 반환
 * @param {string[]} directoryPaths 편집할 진단평가 음원 원본 폴더 상세 경로
 * @return {string[]} 파일명
 */
const getMp3Files = (directoryPaths) => {
  const mp3Files = {};
  directoryPaths.forEach((dirPath) => {
    try {
      const files = fs.readdirSync(dirPath);
      mp3Files[dirPath] = files.filter((file) => path.extname(file) === ".mp3");
    } catch (err) {
      console.error(`Error reading directory ${dirPath}:`, err);
      mp3Files[dirPath] = [];
    }
  });
  return mp3Files;
};

/**
 * @description fuction: 진단평가용 음원 합본 기능
 */
const generateAudioCheckFiles = async () => {
  const startTime = new Date();
  console.log(`Start Time: ${startTime.toLocaleTimeString("en-US", { hour12: false })}`);

  const mp3Files = getMp3Files(directoryPaths);
  const fileList = {};

  for (const dir of directoryPaths) {
    const split = dir.split("\\");
    const writer = split[4];
    const grade = split[5];

    fileList[writer] = fileList[writer]
      ? {
          ...fileList[writer],
          [grade]: {},
        }
      : {
          [grade]: {},
        };
  }

  for (const [dirPath, files] of Object.entries(mp3Files)) {
    const split = dirPath.split("\\");
    const writer = split[4];
    const grade = split[5];

    files.forEach((file) => {
      const fileSplit = file.replace(".mp3", "").split("_");
      const chapter = `${fileSplit[0]}_${fileSplit[1]}`;
      const id = `${fileSplit[0]}_${fileSplit[1]}_${fileSplit[2]}`;

      if (fileSplit.length === 3) {
        fileList[writer][grade][chapter] = fileList[writer][grade][chapter]
          ? {
              ...fileList[writer][grade][chapter],
              [id]: fileList[writer][grade][chapter][id]
                ? {
                    ...fileList[writer][grade][chapter][id],
                    e: fileList[writer][grade][chapter][id].e ? [...fileList[writer][grade][chapter][id].e, file] : [file],
                  }
                : {
                    e: [file],
                  },
            }
          : {
              [id]: {
                e: [file],
              },
            };
      } else if (fileSplit.length > 3) {
        const type = fileSplit[3];
        if (id.includes(".mp3")) console.log(file);

        if (type.includes("e")) {
          fileList[writer][grade][chapter] = fileList[writer][grade][chapter]
            ? {
                ...fileList[writer][grade][chapter],
                [id]: fileList[writer][grade][chapter][id]
                  ? {
                      ...fileList[writer][grade][chapter][id],
                      e: fileList[writer][grade][chapter][id].e ? [...fileList[writer][grade][chapter][id].e, file] : [file],
                    }
                  : {
                      e: [file],
                    },
              }
            : {
                [id]: {
                  e: [file],
                },
              };
        } else if (type.includes("q")) {
          fileList[writer][grade][chapter] = fileList[writer][grade][chapter]
            ? {
                ...fileList[writer][grade][chapter],
                [id]: fileList[writer][grade][chapter][id]
                  ? {
                      ...fileList[writer][grade][chapter][id],
                      q: fileList[writer][grade][chapter][id].q ? [...fileList[writer][grade][chapter][id].q, file] : [file],
                    }
                  : {
                      q: [file],
                    },
              }
            : {
                [id]: {
                  q: [file],
                },
              };
        } else {
          console.log(`has No Type: ${file}`);
        }
      } else {
        console.log("file split length is under 3: wrong file name");
      }
    });
  }

  try {
    await generateAudioFolder(fileList);
    await cleanUpSilenceFile();

    const endTime = new Date();
    const totalTime = new Date(endTime - startTime).toISOString().slice(11, 19);

    console.log("Complete");
    console.log(`Complete Time: ${endTime.toLocaleTimeString("en-US", { hour12: false })}`);
    console.log(`Total Time: ${totalTime}`);
  } catch (err) {
    await cleanUpSilenceFile();

    const endTime = new Date();
    const totalTime = new Date(endTime - startTime).toISOString().slice(11, 19);

    console.log(`Error Time: ${endTime.toLocaleTimeString("en-US", { hour12: false })}`);
    console.log(`Total Time: ${totalTime}`);
    console.error("Error generating audio folder:", err);
  }
};

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

generateAudioCheckFiles();
