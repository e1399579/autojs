auto.waitFor();
require("./解锁.js");
let Robot = require("./lib/Robot.js");
let WidgetAutomator = require("./lib/WidgetAutomator.js");
let robot = new Robot();
let widget = new WidgetAutomator(robot);

// 启动APP
widget.launchLikeName("京东", 8000);

// 切换到我的
widget.clickCenterDesc("我的");
sleep(2000);

// 进入签到
widget.clickCenterText("签到领豆");
sleep(10000);

//关闭弹窗
if (text("我知道了").exists()) {
    toastLog("关闭弹窗");
    text("我知道了").click();
    sleep(500);
}

// 点击签到
if (textContains("已连签").exists()) {
    toastLog("已签");
} else {
    widget.clickCenterTextContains("签到领京豆");
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