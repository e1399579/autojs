require("./解锁.js");
let Robot = require("./lib/Robot.js");
let WidgetAutomator = require("./lib/WidgetAutomator.js");
//let OcrTool = require("./lib/OcrTool.js");
let robot = new Robot();
let widget = new WidgetAutomator(robot);
//let ocrTool = new OcrTool();

toastLog("支付宝签到");
// 启动APP
widget.launchLikeName("支付宝", 5000);

// 关闭更新弹窗
if (id("update_cancel_tv").exists()) {
    widget.clickCenterId("update_cancel_tv");
    sleep(1000);
}

// 切换到我的
widget.clickCenterText("我的");
sleep(2000);

// 进入支付宝会员
widget.clickCenterClass("android.view.ViewGroup");
sleep(8000);

let keywords = ["每日签到", "全部领取"];
// 使用OCR识别文字
/*ocrTool.prepare();
ocrTool.captureOrClip([0, 0, 1080, 1200]);
let result = ocrTool.findText(keywords);
if (result[1].length > 0) {
    robot.click(result[1][0], result[1][1]);
    toastLog("全部领取");
    sleep(1000);
}
if (result[0].length > 0) {
    robot.click(result[0][0], result[0][1]);
    toastLog("签到成功");
    sleep(3000);
} else {
    toastLog("签到失败");
    log(selector().visibleToUser(true).find().toList());

}
*/
// 使用控件点击
if (text(keywords[1]).exists()) {
    widget.clickCenterText(keywords[1]);
    toastLog("全部领取");
    sleep(1000);
}
if (text(keywords[0]).exists()) {
    widget.clickCenterText(keywords[0]);
    toastLog("签到成功");
    sleep(3000);
} else {
    toastLog("签到失败");
    log(selector().visibleToUser(true).find().toList());
    exit();
}

// 关闭应用
robot.close();
sleep(500);

// 锁定
if (text("屏幕锁定").exists()) {
    widget.clickText("屏幕锁定");
}