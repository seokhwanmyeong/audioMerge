const { read, utils, WorkBook, writeFile } = require("xlsx");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;
const path = require("path");
const fs = require("fs");

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const {
  sheet_to_json,
  json_to_sheet,
  aoa_to_sheet,
  book_new,
  book_append_sheet,
} = utils;
const inputDir = "C:\\Users\\silen\\Desktop\\audioMaker\\audios";
const file1 = path.join(inputDir, "L2_02_01_01_A.mp3");
const file2 = path.join(inputDir, "L2_02_01_01_B.mp3");
const silenceFile = path.join(inputDir, "silence.mp3");
const output = path.join(inputDir, "c1.mp3");
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

const generateMediaPath = (writer, grade, chapter, type, num) => {
  const baseNumMapping = { lee: "2", ham: "1", kim: "3" };
  const id = `${baseNumMapping[writer]}${grade}${chapter
    .toString()
    .padStart(2, "0")}${type}-${(j + 1).toString().padStart(3, "0")}`;

  return `${writer}\\${grade}\\${chapter}\\${id}\\media`;
};

const generateAuioFolder = async () => {
  const basePath = "";
  /*
    A-B짝
    짝이 없는 B는 1A와 합친다
    문항 A는 무조건 존재

    q = q1.mp3
    c = c${i}.mp3
  */
};

function createSilence(duration, outputFile, callback) {
  ffmpeg()
    .input("anullsrc=r=44100:cl=stereo")
    .inputFormat("lavfi")
    .duration(duration)
    .output(outputFile)
    .on("end", () => {
      console.log("Silence file created successfully.");
      callback(null);
    })
    .on("error", (err) => {
      console.error("Error creating silence file:", err);
      callback(err);
    })
    .run();
}

function concatenateMP3Files(inputFiles, outputFile, callback) {
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
}

createSilence(duration, silenceFile, (err) => {
  if (err) {
    console.error("Failed to create silence file:", err);
    return;
  }

  concatenateMP3Files([file1, silenceFile, file2], output, (err) => {
    if (err) {
      console.error("Failed to concatenate files:", err);
    } else {
      console.log("Files concatenated successfully!");
      fs.unlinkSync(silenceFile); // Clean up the silence file
    }
  });
});
