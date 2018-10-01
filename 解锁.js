auto(); // 自动打开无障碍服务
var config = files.isFile("config.js") ? require("config.js") : {};
if (typeof config !== "object") {
    config = {};
}
var options = Object.assign({
    password: "",
    pattern_size: 3
}, config); // 用户配置合并

const WIDTH = Math.min(device.width, device.height);
const HEIGHT = Math.max(device.width, device.height);

var Robot = require("Robot.js");
var robot = new Robot(options.max_retry_times);
var Secure = require("Secure.js");
var secure = new Secure(robot, options.max_retry_times);

while (!device.isScreenOn()) {
    device.wakeUp();
    sleep(1000); // 等待屏幕亮起
}

secure.openLock(options.password, options.pattern_size);
