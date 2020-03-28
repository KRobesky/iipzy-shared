const {
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
} = require("./httpService_impl");
module.exports = {
  delete: _delete,
  get: _get,
  post: _post,
  put: _put,
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
