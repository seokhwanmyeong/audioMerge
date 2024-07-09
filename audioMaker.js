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
        const audioArr = quizSource[1];
        const quizeType = id.split("-")[0].slice(4);
        const mediaBasePath = `${destDir}\\${writer}\\${grade}\\${Number(
          chapter
        )}\\${id}\\media`;
        ensureDirectoryExistence(mediaBasePath);

        Object.entries(audioArr).forEach((audioSource) => {
          const audioType = audioSource[0];
          const audioFileList = audioSource[1];

          //  q,c구문 판별 로직

          if (audioType === "q") {
            const mediaSavePath = `${mediaBasePath}\\${audioType}1.mp3`;

            if (audioFileList.length === 3) {
              let aNum = 0;
              let bNum = 0;
              let cNum = 0;
              let firstAudio;
              let secondAudio;
              let thirdAudio;

              audioFileList.map((file, idx) => {
                const abs = file.split("_")[2];

                if (abs === "A") {
                  firstAudio = file;
                  aNum += 1;
                } else if (abs === "B") {
                  secondAudio = file;
                  bNum += 1;
                } else if (abs === "C") {
                  thirdAudio = file;
                  cNum += 1;
                } else {
                  console.log(`${id} media ${file} ABC Type conflict`);
                }
              });

              if (aNum === 1 && bNum === 1 && cNum === 1) {
                mediaPaths.push(mediaSavePath);
                tasks.push(
                  new Promise((resolve, reject) => {
                    createSilence(duration, (err, silenceFilePath) => {
                      if (err) {
                        console.error("Failed to create silence file:", err);
                        reject(err);
                        return;
                      }

                      const mp3OriginFilePath1 = `${basePath}\\${writer}\\g${grade}_voice\\${quizeType}\\${firstAudio}.mp3`;
                      const mp3OriginFilePath2 = `${basePath}\\${writer}\\g${grade}_voice\\${quizeType}\\${secondAudio}.mp3`;
                      const mp3OriginFilePath3 = `${basePath}\\${writer}\\g${grade}_voice\\${quizeType}\\${thirdAudio}.mp3`;

                      concatenateMP3Files(
                        [
                          mp3OriginFilePath1,
                          silenceFilePath,
                          mp3OriginFilePath2,
                          silenceFilePath,
                          mp3OriginFilePath3,
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
              } else {
                console.log(
                  `${id} media ${audioType} ABC Type conflict: aNum = ${aNum}, bNum = ${bNum}, cNum = ${cNum}, file: ${audioFileList}`
                );
              }
            } else if (audioFileList.length === 2) {
              const fistAB = audioFileList[0].split("_")[2];
              const secondAB = audioFileList[1].split("_")[2];
              let aNum = 0;
              let bNum = 0;
              let firstAudio;
              let secondAudio;

              audioFileList.map((file, idx) => {
                const abs = file.split("_")[2];

                if (abs === "A") {
                  firstAudio = file;
                  aNum += 1;
                } else if (abs === "B") {
                  secondAudio = file;
                  bNum += 1;
                } else {
                  console.log(`${id} media ${file} ABC Type conflict`);
                }
              });

              if (aNum === 1 && bNum === 1) {
                mediaPaths.push(mediaSavePath);
                tasks.push(
                  new Promise((resolve, reject) => {
                    createSilence(duration, (err, silenceFilePath) => {
                      if (err) {
                        console.error("Failed to create silence file:", err);
                        reject(err);
                        return;
                      }

                      const mp3OriginFilePath1 = `${basePath}\\${writer}\\g${grade}_voice\\${quizeType}\\${firstAudio}.mp3`;
                      const mp3OriginFilePath2 = `${basePath}\\${writer}\\g${grade}_voice\\${quizeType}\\${secondAudio}.mp3`;

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
              } else {
                console.log(
                  `${id} media ${audioType} length conflict: aNum = ${aNum}, bNum = ${bNum}`
                );
              }
            } else if (audioFileList.length === 1) {
              const mp3OriginFilePath = `${basePath}\\${writer}\\g${grade}_voice\\${quizeType}\\${audioFileList[0]}.mp3`;
              tasks.push(
                new Promise((resolve) => {
                  copyAndRenameFile(mp3OriginFilePath, mediaSavePath);
                  resolve();
                })
              );
            } else {
              console.log(`${id} media ${audioType} length over 3`);
            }
          } else if (audioType === "c") {
            let choiceList = {};
            let mergeBaseFile = "";

            audioFileList.forEach((file) => {
              const split = file.split("_");
              if (split.length !== 4) {
                console.log(`Error: media name is strange: ${file}`);
              } else {
                const choiceNum = split[1];
                const article = split[2];

                if (choiceNum === "01" && article === "A") {
                  if (mergeBaseFile) {
                    console.log(`Error: already exist file: ${file}`);
                  } else {
                    mergeBaseFile = file;
                  }
                }

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
              let Afile = null;
              let Bfile = null;
              let Cfile = null;

              files.forEach((file) => {
                const abc = file.split("_")[2];
                if (abc === "A") {
                  if (Afile) {
                    console.log(`Error: already exist Afile: ${file}`);
                  } else {
                    Afile = file;
                  }
                } else if (abc === "B") {
                  if (Bfile) {
                    console.log(`Error: already exist Bfile: ${file}`);
                  } else {
                    Bfile = file;
                  }
                } else if (abc === "C") {
                  if (Cfile) {
                    console.log(`Error: already exist Cfile: ${file}`);
                  } else {
                    Cfile = file;
                  }
                }
              });

              const mediaSavePath = `${mediaBasePath}\\${audioType}${Number(
                choiceNum
              )}.mp3`;

              if (Afile && Bfile && Cfile) {
                mediaPaths.push(mediaSavePath);
                tasks.push(
                  new Promise((resolve, reject) => {
                    createSilence(duration, (err, silenceFilePath) => {
                      if (err) {
                        console.error("Failed to create silence file:", err);
                        reject(err);
                        return;
                      }
                      const mp3OriginFilePath1 = `${basePath}\\${writer}\\g${grade}_voice\\${quizeType}\\${Afile}.mp3`;
                      const mp3OriginFilePath2 = `${basePath}\\${writer}\\g${grade}_voice\\${quizeType}\\${Bfile}.mp3`;
                      const mp3OriginFilePath3 = `${basePath}\\${writer}\\g${grade}_voice\\${quizeType}\\${Cfile}.mp3`;

                      concatenateMP3Files(
                        [
                          mp3OriginFilePath1,
                          silenceFilePath,
                          mp3OriginFilePath2,
                          silenceFilePath,
                          mp3OriginFilePath3,
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
              } else if (!Afile && Bfile && Cfile) {
                if (!mergeBaseFile) {
                  console.log("Error: No Base file");
                  return;
                }

                mediaPaths.push(mediaSavePath);
                tasks.push(
                  new Promise((resolve, reject) => {
                    createSilence(duration, (err, silenceFilePath) => {
                      if (err) {
                        console.error("Failed to create silence file:", err);
                        reject(err);
                        return;
                      }
                      const mp3OriginFilePath1 = `${basePath}\\${writer}\\g${grade}_voice\\${quizeType}\\${mergeBaseFile}.mp3`;
                      const mp3OriginFilePath2 = `${basePath}\\${writer}\\g${grade}_voice\\${quizeType}\\${Bfile}.mp3`;
                      const mp3OriginFilePath3 = `${basePath}\\${writer}\\g${grade}_voice\\${quizeType}\\${Cfile}.mp3`;

                      concatenateMP3Files(
                        [
                          mp3OriginFilePath1,
                          silenceFilePath,
                          mp3OriginFilePath2,
                          silenceFilePath,
                          mp3OriginFilePath3,
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
              } else if (!Afile && Bfile && !Cfile) {
                if (!mergeBaseFile) {
                  console.log("Error: No Base file");
                  return;
                }

                mediaPaths.push(mediaSavePath);
                tasks.push(
                  new Promise((resolve, reject) => {
                    createSilence(duration, (err, silenceFilePath) => {
                      if (err) {
                        console.error("Failed to create silence file:", err);
                        reject(err);
                        return;
                      }
                      const mp3OriginFilePath1 = `${basePath}\\${writer}\\g${grade}_voice\\${quizeType}\\${mergeBaseFile}.mp3`;
                      const mp3OriginFilePath2 = `${basePath}\\${writer}\\g${grade}_voice\\${quizeType}\\${Bfile}.mp3`;

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
              } else if (Afile && Bfile) {
                mediaPaths.push(mediaSavePath);
                tasks.push(
                  new Promise((resolve, reject) => {
                    createSilence(duration, (err, silenceFilePath) => {
                      if (err) {
                        console.error("Failed to create silence file:", err);
                        reject(err);
                        return;
                      }
                      const mp3OriginFilePath1 = `${basePath}\\${writer}\\g${grade}_voice\\${quizeType}\\${Afile}.mp3`;
                      const mp3OriginFilePath2 = `${basePath}\\${writer}\\g${grade}_voice\\${quizeType}\\${Bfile}.mp3`;

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
              } else if (Afile) {
                const mp3OriginFilePath = `${basePath}\\${writer}\\g${grade}_voice\\${quizeType}\\${Afile}.mp3`;
                tasks.push(
                  new Promise((resolve) => {
                    copyAndRenameFile(mp3OriginFilePath, mediaSavePath);
                    resolve();
                  })
                );
              } else {
                console.log(`Error: No Exist A/B/C : ${files}`);
                return;
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
    const csvPath = path.join(destDir, `mediaPaths_${writer}_${grade}.csv`);
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
  const filePath = path.join(
    basePath,
    `${writer}\\g${grade}_voice\\voice.xlsx`
  );
  const workbook = readFile(filePath);
  const fileList = [];
  const sheet = workbook.Sheets["Sheet1"];
  const range = decode_range(sheet["!ref"]);
  const thirdColumn = 2;
  const fileNamesInColumn = [];
  const baseNumMapping = { 2: "lee", 1: "ham", 3: "kim" };

  for (let R = range.s.r; R <= range.e.r; ++R) {
    const cellAddress = encode_cell({ r: R, c: thirdColumn });
    const cell = sheet[cellAddress];
    if (cell) {
      fileNamesInColumn.push(cell.v);
    }
  }
  fileList.push(...fileNamesInColumn);
  console.log("fileList", fileList);
  const group = {
    [writer]: {
      [grade]: {},
    },
  };

  fileList.map((fileName) => {
    const split = fileName.split("_");

    if (split.length === 4) {
      const id = split[0];
      const audioType = split[1];
      const ab = split[2];
      const writer = baseNumMapping[id[0]];
      const grade = id[1];
      const chapter = Number(id.slice(2, 4));

      if (Number(audioType) > 4) {
        return;
      } else if (group[writer][grade]?.[chapter]?.[id]) {
        if (audioType == "00") {
          group[writer][grade][chapter][id].q = group[writer][grade]?.[
            chapter
          ]?.[id].q
            ? [...group[writer][grade]?.[chapter]?.[id].q, fileName]
            : [fileName];
        } else {
          group[writer][grade][chapter][id].c = group[writer][grade]?.[
            chapter
          ]?.[id].c
            ? [...group[writer][grade]?.[chapter]?.[id].c, fileName]
            : [fileName];
        }
      } else if (group[writer][grade]?.[chapter]) {
        group[writer][grade][chapter] = {
          ...group[writer][grade][chapter],
          [id]:
            audioType == "00"
              ? {
                  q: [fileName],
                }
              : {
                  c: [fileName],
                },
        };
      } else {
        group[writer][grade][chapter] = {
          [id]:
            audioType == "00"
              ? {
                  q: [fileName],
                }
              : {
                  c: [fileName],
                },
        };
      }
    } else {
      console.log(`Error Data: ${fileName}`);
    }
  });

  Object.entries(group[writer][grade]).map((chapter) => {
    console.log(`${chapter[0]}: `, chapter[1]);
  });

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

const list = ["ham:3"];
for (let i = 0; i < list.length; i++) {
  const split = list[i].split(":");
  const writer = split[0];
  const grade = split[1];

  importExel(writer, grade);
}
