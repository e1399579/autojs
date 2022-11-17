auto.waitFor();
require("./解锁.js");
let Robot = require("./lib/Robot.js");
let WidgetAutomator = require("./lib/WidgetAutomator.js");
let robot = new Robot();
let widget = new WidgetAutomator(robot);

// 启动APP
widget.launchLikeName("支付宝", 3000);

// 关闭更新弹窗
if (id("update_cancel_tv").exists()) {
    widget.clickCenterId("update_cancel_tv");
    sleep(1000);
}

// 切换到我的
widget.clickCenterText("我的");
sleep(1000);

// 进入支付宝会员
widget.clickCenterClass("android.view.ViewGroup");
sleep(5000);

// 支付宝会员日弹窗
if (desc("弹屏").exists()) {
    widget.clickCenterDesc("关闭");
    sleep(1000);
}

// 领积分
if (text("全部领取").exists()) {
    widget.clickCenterText("全部领取");
    toastLog("全部领取");
    sleep(1000);
}

// 点击签到
widget.clickCenterText("每日赚积分");
toastLog("签到成功");
sleep(3000);

// 关闭应用
robot.close();
sleep(500);

// 锁定
if (text("屏幕锁定").exists()) {
    widget.clickText("屏幕锁定");
}