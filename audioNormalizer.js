const ffmpeg = require("fluent-ffmpeg");
const path = require("path");

//  aidt-contents 경로
const pathContents = "";

const convertVolume = () => {
  // 입력 파일 및 출력 파일 경로 설정
  const inputFilePath = path.join(__dirname, "input.mp3");
  const outputFilePath = path.join(__dirname, "output.mp3");

  // loudnorm 필터를 사용하여 노멀라이제이션 적용
  ffmpeg(inputFilePath)
    .audioFilters("loudnorm=I=-16:TP=-1.5:LRA=11") // 기본 설정값. 필요에 따라 조정 가능
    .output(outputFilePath)
    .on("end", () => {
      console.log("Volume normalization completed.");
    })
    .on("error", (err) => {
      console.error("Error during processing:", err);
    })
    .run();
};

const runNormalizer = () => {
  const baseMp3Dir = "";
  const mp3List = [];
};
