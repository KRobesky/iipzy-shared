const { log } = require("./logFile");

let os_id = '';

function get_os_id() {
    return os_id;
}
function set_os_id(os_id_param) {
  os_id = os_id_param;
}

module.exports = { 
    get_os_id, 
    set_os_id 
};