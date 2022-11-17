auto.waitFor();
require("./解锁.js");
let Robot = require("./lib/Robot.js");
let WidgetAutomator = require("./lib/WidgetAutomator.js");
let robot = new Robot();
let widget = new WidgetAutomator(robot);

// 启动APP
widget.launchLikeName("京东", 3000);

// 切换到我的
widget.clickCenterText("我的");
sleep(1000);

// 进入签到
widget.clickCenterText("签到领豆");
sleep(5000);

// 点击签到
if (textContains("连签").exists()) {
    toastLog("已签");
} else {
    widget.clickCenterText("签到领京豆");
    toastLog("签到成功");
    sleep(1500);
}

// 关闭应用
robot.close();
sleep(500);

// 锁定
if (text("屏幕锁定").exists()) {
    widget.clickText("屏幕锁定");
}