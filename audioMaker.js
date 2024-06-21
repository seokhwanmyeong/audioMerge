const { readFile, utils } = require("xlsx");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;
const path = require("path");
const fs = require("fs");
const { decode_range, encode_cell } = utils;
const basePath = "D:\\aidt\\aidt-contents\\resource";
const inputDir = "C:\\Users\\silen\\Desktop\\audioMaker\\audios";
const destDir = "D:\\aidt\\audioFiles";
const duration = 0.6;
const rule = {
  ham: {
    3: {
      L1H: {
        type: "c",
      },
      L1M: {
        type: "c",
      },
      L2: {
        type: "c",
      },
      L3: {
        type: "q",
      },
      L4: { type: "q" },
      S1: { type: "q" },
      S3: { type: "q" },
      S5: { type: "q" },
    },
    4: {},
  },
  kim: {
    3: {},
    4: {},
  },
  lee: {
    3: {},
    4: {},
  },
};

const generateId = (writer, grade, chapter, type, num) => {
  const baseNumMapping = { lee: "2", ham: "1", kim: "3" };
  const id = `${baseNumMapping[writer]}${grade}${chapter
    .toString()
    .padStart(2, "0")}${type}-${num.toString().padStart(3, "0")}`;

  return id;
};

const ensureDirectoryExistence = (filePath) => {
  if (fs.existsSync(filePath)) {
    return true;
  } else {
    fs.mkdirSync(filePath, { recursive: true });
  }
};

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
      // console.log("Concatenation finished!");
      callback(null);
    })
    .mergeToFile(outputFile, path.join(inputDir, "tempDir"));
};

const copyAndRenameFile = (source, destination) => {
  fs.copyFile(source, destination, (err) => {
    if (err) {
      console.error("Error copying the file:", err);
    } else {
      // console.log(`File copied to ${destination}`);
    }
  });
};

const cleanUpSilenceFile = async () => {
  const silenceFiles = fs
    .readdirSync(destDir)
    .filter((file) => file.startsWith("silence_"));
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

const generateAudioFolder = async (writer, grade, group) => {
  const tasks = [];
  const mediaPaths = [];

  try {
    Object.entries(group[writer][grade]).forEach((arr) => {
      const chapter = arr[0];
      const quizeData = arr[1];

      Object.entries(quizeData).forEach((quizSource) => {
        const id = quizSource[0];
        const audio = quizSource[1];
        const quizeType = id.split("-")[0].slice(4);
        const mediaBasePath = `${destDir}\\${writer}\\${grade}\\${Number(
          chapter
        )}\\${id}\\media`;
        ensureDirectoryExistence(mediaBasePath);

        Object.entries(audio).forEach((audioSource) => {
          const audioType = audioSource[0];
          const audioFileList = audioSource[1];
          if (audioType === "q") {
            const mediaSavePath = `${mediaBasePath}\\${audioType}1.mp3`;

            if (audioFileList.length === 2) {
              mediaPaths.push(mediaSavePath);
              tasks.push(
                new Promise((resolve, reject) => {
                  createSilence(duration, (err, silenceFilePath) => {
                    if (err) {
                      console.error("Failed to create silence file:", err);
                      reject(err);
                      return;
                    }

                    const mp3OriginFilePath1 = `${basePath}\\${writer}\\g${grade}_voice\\${quizeType}\\${
                      !audioFileList[0].includes("B") &&
                      !audioFileList[1].includes("B")
                        ? audioFileList[0]
                        : audioFileList[0].includes("B")
                        ? audioFileList[1]
                        : audioFileList[0]
                    }.mp3`;
                    const mp3OriginFilePath2 = `${basePath}\\${writer}\\g${grade}_voice\\${quizeType}\\${
                      !audioFileList[0].includes("B") &&
                      !audioFileList[1].includes("B")
                        ? audioFileList[1]
                        : audioFileList[0].includes("B")
                        ? audioFileList[0]
                        : audioFileList[1]
                    }.mp3`;

                    concatenateMP3Files(
                      [mp3OriginFilePath1, silenceFilePath, mp3OriginFilePath2],
                      mediaSavePath,
                      (err) => {
                        if (err) {
                          console.error("Failed to concatenate files:", err);
                          reject(err);
                        } else {
                          resolve();
                        }
                      }
                    );
                  });
                })
              );
            } else {
              const mp3OriginFilePath = `${basePath}\\${writer}\\g${grade}_voice\\${quizeType}\\${audioFileList[0]}.mp3`;
              tasks.push(
                new Promise((resolve) => {
                  copyAndRenameFile(mp3OriginFilePath, mediaSavePath);
                  resolve();
                })
              );
            }
          } else if (audioType === "c") {
            let choiceList = {};
            let mergeBaseFile = "";
            audioFileList.forEach((file) => {
              const split = file.split("_");

              if (split.length !== 5) {
                console.log("Error: media name is strange");
              } else {
                const choiceNum = split[3];
                const article = split[4];

                if (choiceNum === "01" && article === "B") mergeBaseFile = file;

                if (choiceList[choiceNum]) {
                  choiceList[choiceNum].push(file);
                } else {
                  choiceList = {
                    ...choiceList,
                    [choiceNum]: [file],
                  };
                }
              }
            });

            Object.entries(choiceList).forEach((data, i) => {
              const choiceNum = data[0];
              const files = data[1];
              let isExistAfile = false;
              let isExistBfile = false;

              files.forEach((file) => {
                if (file.includes("A")) isExistAfile = true;
                else if (file.includes("B")) isExistBfile = true;
              });

              if (!isExistAfile && !isExistBfile) {
                console.log(`Error: No Exist A/B : ${files}`);
                return;
              } else if (!isExistAfile && isExistBfile) {
                if (!mergeBaseFile) {
                  console.log("Error: No Base file");
                  return;
                } else {
                  choiceList[`0${i}`].push(mergeBaseFile);
                }
              }

              const choiceFileList = choiceList[choiceNum];
              const mediaSavePath = `${mediaBasePath}\\${audioType}${Number(
                choiceNum
              )}.mp3`;

              if (choiceFileList.length === 2) {
                mediaPaths.push(mediaSavePath);
                tasks.push(
                  new Promise((resolve, reject) => {
                    createSilence(duration, (err, silenceFilePath) => {
                      if (err) {
                        console.error("Failed to create silence file:", err);
                        reject(err);
                        return;
                      }
                      const mp3OriginFilePath1 = `${basePath}\\${writer}\\g${grade}_voice\\${quizeType}\\${
                        choiceFileList[0].includes("B")
                          ? choiceFileList[1]
                          : choiceFileList[0]
                      }.mp3`;
                      const mp3OriginFilePath2 = `${basePath}\\${writer}\\g${grade}_voice\\${quizeType}\\${
                        choiceFileList[0].includes("B")
                          ? choiceFileList[0]
                          : choiceFileList[1]
                      }.mp3`;

                      concatenateMP3Files(
                        [
                          mp3OriginFilePath1,
                          silenceFilePath,
                          mp3OriginFilePath2,
                        ],
                        mediaSavePath,
                        (err) => {
                          if (err) {
                            console.error("Failed to concatenate files:", err);
                            reject(err);
                          } else {
                            resolve();
                          }
                        }
                      );
                    });
                  })
                );
              } else if (choiceFileList.length > 2) {
                console.error("Error: choiceFileList length is over two");
              } else {
                const mp3OriginFilePath = `${basePath}\\${writer}\\g${grade}_voice\\${quizeType}\\${choiceFileList[0]}.mp3`;
                tasks.push(
                  new Promise((resolve) => {
                    copyAndRenameFile(mp3OriginFilePath, mediaSavePath);
                    resolve();
                  })
                );
              }
            });
          } else {
            console.log(
              `Error: no media Type Data: ${audioSource[0]}, ${audioSource[1]}`
            );
          }
        });
      });
    });

    await Promise.all(tasks); // 모든 비동기 작업이 완료될 때까지 기다림

    // CSV 파일로 저장
    const csvContent = mediaPaths.join("\n");
    const csvPath = path.join(destDir, "mediaPaths.csv");
    fs.writeFileSync(csvPath, csvContent);
  } catch (err) {
    throw err;
  }
};

const importExel = async (writer, grade) => {
  const startTime = new Date();
  console.log(
    `Start Time: ${startTime.toLocaleTimeString("en-US", { hour12: false })}`
  );

  const sheetNamesToCheck = Object.keys(rule[writer][grade]);
  const filePath = path.join(
    basePath,
    `${writer}\\g${grade}_voice\\script.xlsx`
  );
  const workbook = readFile(filePath);
  const fileList = [];

  sheetNamesToCheck.forEach((sheetName) => {
    if (workbook.SheetNames.includes(sheetName)) {
      const sheet = workbook.Sheets[sheetName];
      const range = decode_range(sheet["!ref"]);
      const thirdColumn = 0;

      const fileNamesInColumn = [];
      for (let R = range.s.r + 2; R <= range.e.r; ++R) {
        const cellAddress = encode_cell({ r: R, c: thirdColumn });
        const cell = sheet[cellAddress];
        if (cell) {
          fileNamesInColumn.push(cell.v);
        }
      }

      fileList.push(...fileNamesInColumn);
    }
  });
  const group = {
    [writer]: {
      [grade]: {},
    },
  };

  fileList.map((fileName) => {
    const split = fileName.split("_");
    if (split.length === 5 || split.length === 4) {
      const type = split[0];
      const chapter = split[1];
      const quizeNum = split[2];
      const id = generateId(writer, grade, chapter, type, quizeNum);
      if (
        group[writer][grade]?.[chapter]?.[id]?.[rule[writer][grade][type].type]
      ) {
        group[writer][grade][chapter][id][rule[writer][grade][type].type].push(
          fileName
        );
      } else if (group[writer][grade]?.[chapter]?.[id]) {
        group[writer][grade][chapter][id] = {
          ...group[writer][grade][chapter][id],
          [rule[writer][grade][type].type]: [fileName],
        };
      } else if (group[writer][grade]?.[chapter]) {
        group[writer][grade][chapter] = {
          ...group[writer][grade][chapter],
          [id]: {
            [rule[writer][grade][type].type]: [fileName],
          },
        };
      } else {
        group[writer][grade][chapter] = {
          [id]: {
            [rule[writer][grade][type].type]: [fileName],
          },
        };
      }
    } else {
      console.log(`Error Data: ${fileName}`);
    }
  });

  console.log(`group sample: ${group[writer][grade]}`);

  try {
    await generateAudioFolder(writer, grade, group);
    await cleanUpSilenceFile();

    const endTime = new Date();
    const totalTime = new Date(endTime - startTime).toISOString().slice(11, 19);

    console.log("Complete");
    console.log(
      `Complete Time: ${endTime.toLocaleTimeString("en-US", { hour12: false })}`
    );
    console.log(`Total Time: ${totalTime}`);
  } catch (err) {
    await cleanUpSilenceFile();

    const endTime = new Date();
    const totalTime = new Date(endTime - startTime).toISOString().slice(11, 19);

    console.log(
      `Error Time: ${endTime.toLocaleTimeString("en-US", { hour12: false })}`
    );
    console.log(`Total Time: ${totalTime}`);
    console.error("Error generating audio folder:", err);
  }
};

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);
importExel("ham", 3);
