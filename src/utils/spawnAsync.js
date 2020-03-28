const { spawn } = require("child_process");

const { log } = require("./logFile");

async function spawnAsync(command, args, stdinData) {
  //
  log("spawnAsync: " + command + ", " + JSON.stringify(args), "spwn", "error");

  let stdout = "";
  let stderr = "";

  try {
    return new Promise((resolve, reject) => {
      const exec = spawn(command, args);
      if (stdinData) {
        exec.stdin.write(stdinData);
        exec.stdin.end();
      }
      exec.stdout.on("data", data => {
        stdout += data.toString();
        //log("stdout: " + str, "main", "info");
      });
      exec.stderr.on("data", data => {
        stderr += data.toString();
        log(
          "(Error) spawnAsync " + command + " stderr: " + stderr,
          "spwn",
          "error"
        );
      });
      exec.on("exit", code => {
        if (code !== 0)
          log(
            `(Error) spawnAsync ${command} exited with code ${code}`,
            "spwn",
            "error"
          );
        resolve({ stdout, stderr, code });
      });
    });
  } catch (ex) {}
}

module.exports = { spawnAsync };
