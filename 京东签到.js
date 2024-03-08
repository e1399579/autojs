auto.waitFor();
require("./解锁.js");
let Robot = require("./lib/Robot.js");
let WidgetAutomator = require("./lib/WidgetAutomator.js");
let OcrTool = require("./lib/OcrTool.js");
let robot = new Robot();
let widget = new WidgetAutomator(robot);
let ocrTool = new OcrTool();

toastLog("京东签到");
// 启动APP
widget.launchLikeName("京东", 8000);

// 切换到我的
widget.clickCenterDesc("我的");
sleep(2000);

// 关闭弹窗
if (desc("关闭按钮").exists()) {
    desc("关闭按钮").click();
}

// 进入签到
widget.clickCenterText("签到领豆");
sleep(10000);

// 点击签到
let flag = false;
ocrTool.prepare();
for (let i = 0;i < 3;i++) {
    flag = false;
    ocrTool.captureOrClip([0, 0, 1080, 520]);
    let keywords = ["去登录", "明天", "连签", "签到"];
    let result = ocrTool.findText(keywords);
    if (result[0].length > 0) {
        robot.click(result[0][0], result[0][1]);
        toastLog("点击登录");
        sleep(1000);
        continue;
    }
    if ((result[1].length > 0)|| (result[2].length > 0)) {
        toastLog("已签");
        break;
    } else if (result[3].length > 0) {
        robot.click(result[3][0], result[3][1]);
        toastLog("签到成功");
        sleep(1500);
        break;
    } else {
        flag = true;
        toastLog("失败，重试");
    }
}

if (flag) exit();

// 关闭应用
robot.close();
sleep(500);

// 锁定
if (text("屏幕锁定").exists()) {
    widget.clickText("屏幕锁定");
}