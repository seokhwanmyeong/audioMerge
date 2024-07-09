const fs = require("fs");
const path = require("path");

// Define the main directory path
const directoryPath = path.join("D:", "aidt", "진단평가", "aidt-check");
const eFiles = Array.from({ length: 19 }, (_, i) => `e${i + 2}.wav`);

// Function to recursively delete 'e2.wav' files in all subdirectories
function deleteFilesRecursively(dir) {
  fs.readdir(dir, (err, files) => {
    if (err) {
      console.error(`Error reading directory: ${err}`);
      return;
    }

    files.forEach((file) => {
      const filePath = path.join(dir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error(`Error stating file: ${err}`);
          return;
        }

        if (stats.isDirectory()) {
          // Recursively search in subdirectories
          deleteFilesRecursively(filePath);
        } else if (stats.isFile() && eFiles.includes(file)) {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error(`Error deleting file ${filePath}: ${err}`);
            } else {
              console.log(`File ${filePath} has been deleted successfully.`);
            }
          });
        }
      });
    });
  });
}

// Start the recursive deletion process
deleteFilesRecursively(directoryPath);
