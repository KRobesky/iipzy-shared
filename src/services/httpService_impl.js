const axios = require("axios");
var FormData = require("form-data");
var fs = require("fs");
const https = require("https");

const Defs = require("../defs");
const { fileStatAsync } = require("../utils/fileIO");
const { log } = require("../utils/logFile");
const { sleep } = require("../utils/utils");

const httpsInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true
  }),
  validateStatus: function(status) {
    // return success for all http response codes.
    return true;
  }
});

async function handleHttpException(title, ex) {
  log(
    "(Exception) " + title + ": " + ex + ", code = " + ex.code,
    "http",
    "error"
  );
  log("stack: " + ex.stack, "http", "info");
  let status = Defs.httpStatusException;
  switch (ex.code) {
    case "ECONNREFUSED": {
      status = Defs.httpStatusConnRefused;
      break;
    }
    case "ECONNABORTED": {
      status = Defs.httpStatusConnAborted;
      break;
    }
    case "ECONNRESET": {
      status = Defs.httpStatusConnReset;
      break;
    }
  }

  await sleep(2*1000);

  return { status };
}

async function _delete(url, config) {
  axios.defaults.headers.common[Defs.httpCustomHeader_XTimestamp] = Date.now();
  try {
    return await httpsInstance.delete(url, config);
  } catch (ex) {
    return await handleHttpException("delete", ex);
  }
}

async function _get(url, config) {
  axios.defaults.headers.common[Defs.httpCustomHeader_XTimestamp] = Date.now();
  try {
    return await httpsInstance.get(url, config);
  } catch (ex) {
    return await handleHttpException("get", ex);
  }
}

async function _post(url, params, config) {
  axios.defaults.headers.common[Defs.httpCustomHeader_XTimestamp] = Date.now();
  try {
    return await httpsInstance.post(url, params, config);
  } catch (ex) {
    return await handleHttpException("post", ex);
  }
}

async function _put(url, params, config) {
  axios.defaults.headers.common[Defs.httpCustomHeader_XTimestamp] = Date.now();
  try {
    return await httpsInstance.put(url, params, config);
  } catch (ex) {
    return await handleHttpException("put", ex);
  }
}

// See: https://futurestud.io/tutorials/download-files-images-with-axios-in-node-js
async function fileDownload(url, filename) {
  log("fileDownload: filename = " + filename, "http", "info");
  axios.defaults.headers.common[Defs.httpCustomHeader_XTimestamp] = Date.now();
  try {
    const writer = fs.createWriteStream(filename);

    const response = await httpsInstance.get(url, {
      responseType: "stream"
    });

    if (response.status != Defs.httpStatusOk) {
      return new Promise((resolve, reject) => {
        reject("failed");
      });
    }

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  } catch (ex) {
    return await handleHttpException("fileDownload", ex);
  }
}

async function fileUpload(filename) {
  log("fileUpload: filename = " + filename, "http", "info");
  axios.defaults.headers.common[Defs.httpCustomHeader_XTimestamp] = Date.now();
  try {
    const stat = await fileStatAsync(filename);
    //const maxContentLength = Math.max(stat.size + 1024, 10 * 1024 * 1024);
    const maxContentLength = stat.size + 1024;
    const form = new FormData();
    form.append("file", fs.createReadStream(filename));
    return await httpsInstance.post(
      //axios.defaults.baseURL + "/fileupload/upload",
      "/fileupload/upload",
      form,
      {
        headers: form.getHeaders(),
        maxContentLength
      }
    );
  } catch (ex) {
    return await handleHttpException("fileUpload", ex);
  }
}

function logAuthToken() {
  log(
    "authToken: " +
      axios.defaults.headers.common[Defs.httpCustomHeader_XAuthToken],
    "http",
    "info"
  );
}

function setAuthTokenHeader(authToken) {
  log("setAuthTokenHeader = " + authToken, "http", "info");

  axios.defaults.headers.common[Defs.httpCustomHeader_XAuthToken] = authToken;
}

function clearBaseURL() {
  log("clearBaseURL", "http", "info");
  axios.defaults.baseURL = null;
}

function getBaseURL() {
  log("getBaseURL", "http", "info");
  return axios.defaults.baseURL;
}

function setBaseURL(baseURL) {
  axios.defaults.baseURL = "https://" + baseURL + "/api";
  log("setBaseURL = " + axios.defaults.baseURL, "http", "info");
}

function setClientTokenHeader(clientToken) {
  log("setClientTokenHeader = " + clientToken, "http", "info");

  axios.defaults.headers.common[
    Defs.httpCustomHeader_XClientToken
  ] = clientToken;
}

function setConnTokenHeader(connToken) {
  log("setConnTokenHeader = " + connToken, "http", "info");
  axios.defaults.headers.common[Defs.httpCustomHeader_XConnToken] = connToken;
}

module.exports = {
  _delete,
  _get,
  _post,
  _put,
  clearBaseURL,
  fileDownload,
  fileUpload,
  getBaseURL,
  logAuthToken,
  setAuthTokenHeader,
  setBaseURL,
  setClientTokenHeader,
  setConnTokenHeader
};
