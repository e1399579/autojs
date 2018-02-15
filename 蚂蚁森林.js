/**
 * 根据 酷安@群主让我注册 脚本修改而来，原下载地址：https://github.com/start201711/autojs?files=1
 * 感谢原作者提供的核心算法，感谢Auto.js提供的API平台
 * 欢迎使用和提交bug反馈
 * 设备要求：
 * 1.需要root（脚本用到唤醒、截图、点击等权限）
 * 2.安卓5.0以上
 * 3.Auto.js软件版本3.0以上
 *
 * 使用方法：
 * 1.将take.png（找图所需，也可以自己截图）、config.js（配置文件）、Robot.js（机器人模块）、Secure.js（解锁模块，可选）与脚本放置于同目录下。并将“蚂蚁森林”按钮设置在支付宝首页
 * 2.目前支持PIN解锁（5.0+）和图案解锁（7.0+，从1开始），若手机设置了密码，请将config.js中的password改为实际密码；若无密码，则无需修改
 * 3.直接启动脚本即可，不用点自己打开支付宝。建议先手动运行一次，成功之后再配置定时任务
 * 4.申请截图的权限时，不需要手动点击"立即开始"，脚本会自行点击"立即开始"。
 * 5.脚本运行时，可以按Home键停止运行
 *
 * 定时任务（建议）步骤：
 * 1.安装edge pro软件
 * 2.添加多重动作，假设命名为蚂蚁森林。假设脚本路径是/storage/emulated/0/脚本/蚂蚁森林.js
 *   动作的第一步是唤醒，第二步是shell命令，参考
 *   am start -n com.stardust.scriptdroid/.external.open.RunIntentActivity -d file:///storage/emulated/0/脚本/蚂蚁森林.js -t application/x-javascript
 * 3.添加定时计划，动作是保存的多重动作
 *
 * 软件测试结果：
 * 1.魔趣7.1系统正常，偶尔出现崩溃情况，依赖于Auto.js.apk稳定性
 * @author ridersam <e1399579@gmail.com>
 */
var config = files.isFile("config.js") ? require("config.js") : {};
var password = config.password || [1, 2, 3, 4]; // 锁屏密码
var takeImg = config.takeImg || files.cwd() + "/take.png"; // 收取好友能量用到的图片

const PATTERN_SIZE = config.pattern_size || 3; // 图案解锁每行点数
const MAX_RETRY_TIMES = config.max_retry_times || 10; // 最大失败重试次数
const TIMEOUT = config.timeout || 6000; // 超时时间：毫秒
const ALIPAY = "com.eg.android.AlipayGphone"; // 支付宝包名
// 所有操作都是竖屏
const WIDTH = Math.min(device.width, device.height);
const HEIGHT = Math.max(device.width, device.height);

auto();
start(takeImg, password);

/**
 * 开始运行
 * @param takeImg
 * @param password
 */
function start(takeImg, password) {
    var isScreenOn = device.isScreenOn(); // 屏幕是否点亮
    if (!isScreenOn) {
        log("唤醒");
        device.wakeUp();
        sleep(200);
    }

    this.checkModule();

    var isRunning = parseInt(shell("ps | grep 'AlipayGphone' | wc -l", true).result); // 支付宝是否运行

    log({
        isScreenOn: isScreenOn,
        isRunning: isRunning
    });

    var Robot = require("Robot.js");
    var robot = new Robot(MAX_RETRY_TIMES);
    var antForest = new AntForest(robot);

    // 先打开APP，节省等待时间
    threads.start(function () {
        antForest.openApp();
    });
    // 子线程监听Home键
    threads.start(function () {
        events.observeKey();
        events.onKeyDown("home", function (event) {
            toastLog("停止脚本");
            engines.stopAll();
            exit();
        });
    });

    if (files.isFile("Secure.js")) {
        var Secure = require("Secure.js");
        var secure = new Secure(robot, MAX_RETRY_TIMES);
        secure.openLock(password, PATTERN_SIZE);
    }

    antForest.launch();
    antForest.work();

    if (!isRunning) {
        robot.kill(ALIPAY);
    }

    if (!isScreenOn) {
        KeyCode("KEYCODE_POWER");
    }
    // 退出全部线程
    engines.stopAll();
    exit();
}

/** 
 * 检查必要模块
 */
function checkModule() {
    if (!files.isFile("Robot.js")) {
        throw new Error("缺少Robot.js文件，请核对第一条");
    }

    if (!files.isFile("Secure.js") && context.getSystemService(context.KEYGUARD_SERVICE).inKeyguardRestrictedInputMode()) {
        throw new Error("缺少Secure.js文件，请核对第一条");
    }
}

/**
 * 蚂蚁森林的各个操作
 * @param robot
 * @constructor
 */
function AntForest(robot) {
    this.robot = robot;

    this.openApp = function () {
        toastLog("即将收取能量，按Home键停止");

        launch(ALIPAY);
    };

    this.launch = function () {
        var times = 0;
        do {
            if (this.doLaunch()) {
                return;
            } else {
                times++;
                this.robot.kill(ALIPAY);
                this.openApp();
            }
        } while (times < MAX_RETRY_TIMES);

        toastLog("运行失败");
        engines.stopAll();
        exit();
    };

    this.doLaunch = function () {
        // 可能出现的红包弹框，点击取消
        threads.start(function () {
            var cancelBtn;
            if (cancelBtn = id("com.alipay.android.phone.wallet.sharetoken:id/btn1").findOne(TIMEOUT)) {
                cancelBtn.click();
            }
        });

        if (!id("com.alipay.android.phone.openplatform:id/saoyisao_tv").findOne(TIMEOUT)) {
            toastLog("进入支付宝首页失败");
            return false;
        }

        var success = false;
        var btn = id("com.alipay.android.phone.openplatform:id/app_text").text("蚂蚁森林").findOne(TIMEOUT);
        if (!btn) {
            toastLog("查找蚂蚁森林按钮失败");
            return false;
        }
        log("点击按钮");
        if (!btn.parent().click()) {
            toastLog("点击蚂蚁森林失败");
            return false;
        }

        // 等待加载
        if (id("com.alipay.mobile.nebula:id/h5_tv_title").text("蚂蚁森林").findOne(TIMEOUT)) {
            sleep(2000); // 等待界面渲染
            toastLog("进入蚂蚁森林成功");
        } else {
            toastLog("进入蚂蚁森林失败");
            return false;
        }

        // 对话出现
        var dialog_x = WIDTH / 2;
        var dialog_y = 510 * (HEIGHT / 1920);
        sleep(2000);

        // 点击对话消失
        this.robot.click(dialog_x, dialog_y);

        return true;
    };

    this.work = function () {
        // 蚂蚁森林控件范围
        var bounds = className("android.view.View").depth(11).filter(function (o) {
            return o.indexInParent() === 1;
        }).findOnce().bounds();
        log(bounds);

        // 开始收取
        this.take(bounds);
        toastLog("收取自己的能量完毕");

        // 等待好友列表
        sleep(2000);
        toastLog("开始收取好友能量");
        var icon = images.read(takeImg);
        if (null === icon) {
            toastLog("缺少图片文件，请仔细查看使用方法的第一条！！！");
            engines.stopAll();
            exit();
        }
        // 截图权限申请
        threads.start(function () {
            var remember;
            var beginBtn;
            if (remember = id("com.android.systemui:id/remember").checkable(true).findOne(TIMEOUT)) {
                remember.click();
            }
            if (beginBtn = classNameContains("Button").textContains("立即开始").findOne(TIMEOUT)) {
                beginBtn.click();
            }
        });
        if (!requestScreenCapture()) {
            toastLog("请求截图失败");
            engines.stopAll();
            exit();
        }

        var nextElements = [];
        var total = 0;
        total += this.takeOthers(bounds, icon, className("android.webkit.WebView").scrollable(true), nextElements);

        var more = desc("查看更多好友").className("android.view.View").find();
        if (more.length) {
            toastLog("查看更多好友");
            if (this.robot.clickCenter(more[0])) {
                // 等待更多列表刷新
                if (id("com.alipay.mobile.nebula:id/h5_tv_title").text("好友排行榜").findOne(TIMEOUT)) {
                    sleep(3000); // 等待界面渲染
                    total += this.takeOthers(bounds, icon, desc("没有更多了").className("android.view.View"), nextElements);
                    //total += this.takeOthers(bounds, icon, className("android.webkit.WebView").scrollable(true), nextElements);
                    this.robot.back();
                } else {
                    toastLog("进入好友排行榜失败");
                }
            } else {
                toastLog("进入好友排行榜失败");
            }
        }

        toastLog("收取能量完毕，共" + total + "个好友");
        this.robot.back();

        // 统计下次时间
        var minuteList = [];
        nextElements.forEach(function (o) {
            minuteList.push(parseInt(o.contentDescription));
        });
        nextElements = []; // 释放内存
        // 排序
        minuteList.sort(function (m1, m2) {
            return m1 - m2;
        });
        // 去掉重复的
        for (var i = 1, len = minuteList.length; i < len; i++) {
            // 相差1分钟以内认为是同一元素
            if ((minuteList[i] - minuteList[i - 1]) <= 1) {
                minuteList.splice(i--, 1);
                len--;
            }
        }

        var date = new Date();
        var timestamp = date.getTime();
        var timeList = [];
        for (var i = 0, len = minuteList.length; i < len; i++) {
            var minute = minuteList[i];
            var now = timestamp + 60 * minute * 1000;
            date.setTime(now);
            timeList.push(date.getHours() + ":" + date.getMinutes());
        }
        if (timeList.length) {
            log("下次收取时间：" + timeList.join(', '));
        }
    };

    /**
     * 收取能量
     * @param bounds
     */
    this.take = function (bounds) {
        // 等待能量球渲染
        sleep(1500);
        var filters = descMatches(/^(绿色能量|\d+k?g)$/).boundsInside(bounds.left, bounds.top, bounds.right, bounds.bottom).find();
        toastLog("找到" + (filters.length - 1) + "个能量球");

        // 按在父元素中的位置顺序排，总能量为第一个
        filters.sort(function (o1, o2) {
            return o1.indexInParent() - o2.indexInParent();
        });

        // 找到第一个并删除（右上角控件）
        filters.splice(0, 1);

        for (var i = 0, len = filters.length; i < len; i++) {
            // 原有的click无效
            this.robot.clickCenter(filters[i]);
            log("点击->" + filters[i]);
            sleep(200);
        }
    };

    /**
     * 收取好友能量
     * @param bounds
     * @param icon
     * @param endSelector
     * @param nextElements
     * @returns {number}
     */
    this.takeOthers = function (bounds, icon, endSelector, nextElements) {
        var times = 0;
        var prevTop = 0;
        var top = 0;
        var row_height = 192 * (HEIGHT / 1920);
        var x1 = WIDTH / 2;
        var y1 = HEIGHT - row_height;
        var x2 = WIDTH / 2;
        var y2 = row_height;
        var total = 0;
        while (times < MAX_RETRY_TIMES) {
            total += this.takeFromImage(bounds, icon);
            descMatches(/\d+’/).visibleToUser(true).find().each(function (o) {
                nextElements.push(o);
            });

            this.robot.swipe(x1, y1, x2, y2);
            sleep(1500); // 等待滑动动画

            total += this.takeFromImage(bounds, icon);
            descMatches(/\d+’/).visibleToUser(true).find().each(function (o) {
                nextElements.push(o);
            });

            // 到底部了
            var bottomUi = endSelector.find();
            if (bottomUi.length) {
                top = bottomUi[0].bounds().top;
                if (top === prevTop) {
                    break;
                } else {
                    prevTop = top;
                    times++;
                }
            }
        }

        return total;
    };

    /**
     * 找图收取
     * @param bounds
     * @param icon
     * @returns {number}
     */
    this.takeFromImage = function (bounds, icon) {
        var point, capture;
        var row_height = 192 * (HEIGHT / 1920); // 在1080*1920的屏幕上，一行占192，即一屏10行
        var options = {
            region: [WIDTH - row_height, row_height],
            threshold: 0.9
        };
        var total = 0;
        while (true) {
            capture = captureScreen();
            if (null === capture) {
                sleep(20);
                continue;
            }
            point = findImage(capture, icon, options);
            if (null === point) {
                break;
            }
            this.robot.click(WIDTH / 2, point.y + row_height / 2); // 点击一行中间

            // 等待好友的森林（标题不为空）
            if (id("com.alipay.mobile.nebula:id/h5_tv_title").textMatches(/.+/).findOne(TIMEOUT)) {
                sleep(1500); // 等待界面渲染
                toastLog("进入好友森林成功");
                total++;
            }

            // 收取、返回
            this.take(bounds);
            this.robot.back();

            // 等待好友列表刷新
            id("com.alipay.mobile.nebula:id/h5_tv_title").textMatches(/.+/).findOne(TIMEOUT);
            sleep(1500); // 等待界面渲染及加载
        }

        return total;
    }
}

