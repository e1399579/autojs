let path = "./config/general.js";
if (!files.isFile(path)) {
    throw new Error("未找到配置文件");
}
let options = require(path);
let Robot = require("./lib/Robot.js");
let robot = new Robot(options.max_retry_times);
robot.waitForAvailable();
let Secure = require("./lib/Secure.js");
let secure = new Secure(robot, options.max_retry_times);
secure.openLock(options.password, options.pattern_size);