const Defs = require("../defs");
const { log } = require("./logFile");

function handleDBException(objectType, objectName, statement, err) {
  try {
    let errorMessage = "";
    let statusCode = "";
    switch (err.code) {
      case "ER_DUP_ENTRY":
        errorMessage = objectName + " already exists";
        statusCode = Defs.statusAlreadyExists;
        break;
      default:
        errorMessage = objectName + ", error: " + err.code;
        statusCode = Defs.statusGeneralSqlFailure;
        break;
    }
    return {
      __hadError__: {
        objectType: objectType,
        objectName: objectName,
        statement: statement,
        statusCode: statusCode,
        errorMessage: errorMessage
      }
    };
  } catch (ex) {
    return {
      __hadError__: {
        objectType: objectType,
        objectName: objectName,
        statement: statement,
        statusCode: Defs.statusException,
        errorMessage: "unexpected error: " + err
      }
    };
  }
}

function handleDBError(
  objectType,
  objectName,
  statement,
  statusCode,
  errorMessage
) {
  return {
    __hadError__: {
      objectType: objectType,
      objectName: objectName,
      statement: statement,
      statusCode: statusCode,
      errorMessage: errorMessage
    }
  };
}

function handleError(objectType, objectName, statusCode, errorMessage) {
  return {
    __hadError__: {
      objectType: objectType,
      objectName: objectName,
      statusCode: statusCode,
      errorMessage: errorMessage
    }
  };
}

module.exports = { handleDBError, handleDBException, handleError };
