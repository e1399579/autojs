auto.waitFor();
require("./解锁.js");
let Robot = require("./lib/Robot.js");
let WidgetAutomator = require("./lib/WidgetAutomator.js");
let robot = new Robot();
let widget = new WidgetAutomator(robot);

toastLog("PICO签到");
// 启动APP
widget.launchLikeName("PICO VR", 8000);

// 进入每日签到
widget.clickCenterText("每日签到");
sleep(3000);

// 关闭应用
robot.close();
sleep(500);

// 锁定
if (text("屏幕锁定").exists()) {
    widget.clickText("屏幕锁定");
}