const fs = require("fs");
const tar = require("tar");

const {
  fileDeleteAsync,
  fileReadDirAsync,
  fileStatAsync
} = require("./fileIO");
const { getLogDir, log } = require("./logFile");

// NB see node_modules/tar/lib/create.js
async function compress_helper(sourcePath, files, destFile) {
  log("compress_helper: dest = " + destFile, "cmpr", "info");

  let ret = null;

  // try ten times because tar fails if a file being read from, changes.
  for (let i = 0; i < 10; i++) {
    try {
      const tarPack = new tar.Pack({ cwd: sourcePath });
      const stream = new fs.WriteStream(destFile);
      tarPack.pipe(stream);

      const promise = new Promise((res, rej) => {
        stream.on("error", rej);
        stream.on("close", res);
        tarPack.on("error", rej);
      });

      await addFilesAsync(tarPack, files);

      await promise;

      ret = destFile;
      break;
    } catch (ex) {
      log("(Exception) compress_helper[" + i + "]: " + ex, "cmpr", "error");
      if (ex.path)
        log("(Exception) compress_helper: path = " + ex.path, "cmpr", "error");
      await fileDeleteAsync(destFile);
    }
  }

  log(
    "<<<compress_helper: source = " + sourcePath + ", ret = " + ret,
    "cmpr",
    "info"
  );
  return ret;
}

async function addFilesAsync(tarPack, files) {
  for (let i = 0; i < files.length; i++) {
    tarPack.add(files[i]);
  }
  tarPack.end();
}

// NB: returns an array of files to send.
async function compress(sourcePath, destPath, destFileName, prefix) {
  log(
    "compress: source = " +
      sourcePath +
      ", dest = " +
      destPath +
      ", name = " +
      destFileName,
    "cmpr",
    "info"
  );

  const fileGroups = await getFiles(sourcePath, prefix);
  let destFileNames = [];
  for (let i = 0; i < fileGroups.length; i++) {
    // file ordinal.
    const o = i + 1;
    const ord = o < 10 ? "0" + o : o;
    const destPathOrd = await compress_helper(
      sourcePath,
      fileGroups[i],
      destPath + destFileName + "-" + ord + ".tar"
    );
    if (!destPathOrd) break;
    destFileNames.push(destPathOrd);
  }

  log(
    "<<<compress: source = " +
      sourcePath +
      ", dest = " +
      JSON.stringify(destFileNames, null, 2),
    "cmpr",
    "info"
  );
  return destFileNames;
}

// NB: returns an array of an array of files.
const FILE_SIZE_LIMIT = 20 * 1024 * 1024; // 20 MB

async function getFiles(sourcePath, prefix) {
  let fileGroups = [[]];
  let fgTotalBytes = 0;
  let fgi = 0;
  const files = await fileReadDirAsync(sourcePath);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.indexOf(prefix) !== 0) {
      // skip
      continue;
    }
    const stats = await fileStatAsync(sourcePath + "/" + file);
    fgTotalBytes += stats.size;
    if (fgTotalBytes > FILE_SIZE_LIMIT) {
      fgi++;
      fileGroups.push([]);
      fgTotalBytes = 0;
    }
    fileGroups[fgi].push(file);
  }
  return fileGroups;
}

// NB: returns an array of files to send.
async function compressLogFiles(destPath, destFileName, prefix) {
  return compress(getLogDir(), destPath, destFileName, prefix);
}

module.exports = { compress, compressLogFiles };
