//const { log } = require("./logFile");

let is_debugging = false;

function get_is_debugging() {
  return is_debugging;
}

function set_is_debugging(state) {
  is_debugging = state;
}

let os_id = '';

function get_os_id() {
    return os_id;
}
function set_os_id(os_id_param) {
  os_id = os_id_param;
}

module.exports = { 
    get_is_debugging,
    set_is_debugging,
    get_os_id, 
    set_os_id 
};