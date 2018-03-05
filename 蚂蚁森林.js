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
 * 2.支持的解锁方式（仅限类原生系统）：滑动（5.0+）、PIN码（5.0+）、密码（5.0+）、图案（7.0+，从1开始），若手机设置了密码，请将config.js中的password改为实际密码；若无密码，则无需修改
 * 3.直接启动脚本即可，不用点自己打开支付宝。建议先手动运行一次，成功之后再配置定时任务
 * 4.申请截图的权限时，不需要手动点击"立即开始"，脚本会自行点击"立即开始"。
 * 5.脚本运行时，可以按Home键停止运行
 * 6.可修改config.js配置文件以保存参数，脚本更新可以不用再覆盖它
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
auto(); // 自动打开无障碍服务
var config = files.isFile("config.js") ? require("config.js") : {};
var default_config = {
    password: "1234", // 锁屏密码
    takeImg: "take.png", // 收取好友能量用到的图片
    pattern_size: 3, // 图案解锁每行点数
    max_retry_times: 10, // 最大失败重试次数
    timeout: 6000 // 超时时间：毫秒
};
if (typeof config !== "object") {
    config = {};
}
var options = Object.assign(default_config, config); // 用户配置合并

// 所有操作都是竖屏
const WIDTH = Math.min(device.width, device.height);
const HEIGHT = Math.max(device.width, device.height);

start(options);

/**
 * 开始运行
 * @param options
 */
function start(options) {
    var isScreenOn = device.isScreenOn(); // 屏幕是否点亮
    if (!isScreenOn) {
        log("唤醒");
        device.wakeUp();
        sleep(500);
    }

    this.checkModule();

    var Robot = require("Robot.js");
    var robot = new Robot(options.max_retry_times);
    var antForest = new AntForest(robot, options);

    // 先打开APP，节省等待时间
    threads.start(function () {
        antForest.saveState(isScreenOn);
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

    if (files.exists("Secure.js")) {
        var Secure = require("Secure.js");
        var secure = new Secure(robot, options.max_retry_times);
        secure.openLock(options.password, options.pattern_size);
    }

    antForest.launch();
    antForest.work();
    antForest.resumeState();

    // 退出全部线程
    engines.stopAll();
    exit();
}

/**
 * 检查必要模块
 */
function checkModule() {
    if (!files.exists("Robot.js")) {
        throw new Error("缺少Robot.js文件，请核对第一条");
    }

    if (!files.exists("Secure.js") && context.getSystemService(context.KEYGUARD_SERVICE).inKeyguardRestrictedInputMode()) {
        throw new Error("缺少Secure.js文件，请核对第一条");
    }
}

/**
 * 蚂蚁森林的各个操作
 * @param robot
 * @param options
 * @constructor
 */
function AntForest(robot, options) {
    this.robot = robot;
    options = options || {};
    var settings = {
        timeout: 6000,
        max_retry_times: 10,
        takeImg: "take.png"
    };
    this.options = Object.assign(settings, options);
    this.package = "com.eg.android.AlipayGphone"; // 支付宝包名
    this.state = {};

    this.saveState = function (isScreenOn) {
        this.state.isScreenOn = isScreenOn;
        this.state.currentPackage = currentPackage(); // 当前运行的程序
        this.state.isRunning = parseInt(shell("ps | grep 'AlipayGphone' | wc -l", true).result); // 支付宝是否运行
        log(this.state);
    };

    this.resumeState = function () {
        if (this.state.currentPackage !== this.package) {
            this.robot.back(); // 回到之前运行的程序
        }

        if (!this.state.isRunning) {
            this.closeApp();
        }

        if (!this.state.isScreenOn) {
            KeyCode("KEYCODE_POWER");
        }
    };

    this.openApp = function () {
        toastLog("即将收取能量，按Home键停止");

        launch(this.package);
    };

    this.closeApp = function () {
        this.robot.kill(this.package);
    };

    this.launch = function () {
        var times = 0;
        do {
            if (this.doLaunch()) {
                return;
            } else {
                times++;
                this.closeApp();
                this.openApp();
            }
        } while (times < this.options.max_retry_times);

        toastLog("运行失败");
        engines.stopAll();
        exit();
    };

    this.doLaunch = function () {
        // 可能出现的红包弹框，点击取消
        var timeout = this.options.timeout;
        threads.start(function () {
            var cancelBtn;
            if (cancelBtn = id("com.alipay.android.phone.wallet.sharetoken:id/btn1").findOne(timeout)) {
                cancelBtn.click();
            }
        });

        if (!id("com.alipay.android.phone.openplatform:id/saoyisao_tv").findOne(timeout)) {
            toastLog("进入支付宝首页失败");
            return false;
        }

        var success = false;
        var btn = id("com.alipay.android.phone.openplatform:id/app_text").text("蚂蚁森林").findOne(timeout);
        if (!btn) {
            toastLog("查找蚂蚁森林按钮失败");
            return false;
        }
        log("点击按钮");
        if (!(btn.parent() && btn.parent().click())) {
            toastLog("点击蚂蚁森林失败");
            return false;
        }

        // 等待加载
        if (id("com.alipay.mobile.nebula:id/h5_tv_title").text("蚂蚁森林").findOne(timeout) && this.waitForLoading()) {
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

    this.waitForLoading = function () {
        var timeout = this.options.timeout;
        var waitTime = 200;
        for (var i = 0; i < timeout; i += waitTime) {
            var webView = className("android.webkit.WebView").findOne(timeout);
            if (!webView) return false;
            if (!webView.child(1)) {
                sleep(waitTime);
                continue;
            }

            var elementCount = webView.child(1).childCount();
            if (elementCount > 1) {
                sleep(1000); // 等待界面渲染
                return true; // 加载成功
            } else if (0 === elementCount) {
                sleep(waitTime);
                continue; // 加载中
            } else {
                return false; // 失败
            }
        }

        return false;
    };

    this.findForest = function () {
        return className("android.webkit.WebView").findOnce().child(1);
    };

    this.getPower = function (forest) {
        return parseInt(forest.child(0).contentDescription);
    };

    this.getTakePower = function () {
        return parseInt(desc("你收取TA").findOnce().parent().child(2).contentDescription);
    };

    this.work = function () {
        var timeout = this.options.timeout;
        // 蚂蚁森林控件范围
        var forest = this.findForest();
        var bounds = forest.bounds();
        log(bounds);

        var startPower = this.getPower(forest);

        // 开始收取
        this.take(bounds);
        sleep(500);
        var power = this.getPower(this.findForest()) - startPower;
        toastLog("收取了" + power + "g自己的能量");

        var icon = images.read(this.options.takeImg);
        if (null === icon) {
            toastLog("缺少图片文件，请仔细查看使用方法的第一条！！！");
            engines.stopAll();
            exit();
        }
        // 截图权限申请
        threads.start(function () {
            var remember;
            var beginBtn;
            if (remember = id("com.android.systemui:id/remember").checkable(true).findOne(timeout)) {
                remember.click();
            }
            if (beginBtn = classNameContains("Button").textContains("立即开始").findOne(timeout)) {
                beginBtn.click();
            }
        });
        if (!requestScreenCapture()) {
            toastLog("请求截图失败");
            engines.stopAll();
            exit();
        }

        // 跳过当前屏幕
        this.robot.swipe(WIDTH / 2, HEIGHT, WIDTH / 2, (HEIGHT * 0.1) | 0);
        sleep(1500);
        toastLog("开始收取好友能量");

        var nextElements = [];
        var total = 0;
        total += this.takeOthers(bounds, icon, function () {
            var selector = className("android.webkit.WebView").scrollable(true);
            if (!selector.exists()) return false;
            
            var list = selector.findOne().child(2).child(1);
            var num = list.childCount();
            if (num < 1) return true;
            
            return list.child(num - 1).visibleToUser();
        }, nextElements);

        var more = desc("查看更多好友").find();
        if (more.length) {
            log(more[0].bounds());
            toastLog("查看更多好友");
            if (this.robot.clickCenter(more[0])) {
                // 等待更多列表刷新
                if (id("com.alipay.mobile.nebula:id/h5_tv_title").text("好友排行榜").findOne(timeout) && this.waitForLoading()) {
                    toastLog("进入好友排行榜成功");
                    total += this.takeOthers(bounds, icon, function () {
                        var selector = desc("没有更多了");
                        if (!selector.exists()) return false;

                        return selector.findOne().visibleToUser();
                    }, nextElements);
                    this.robot.back();
                    sleep(1500);
                } else {
                    toastLog("进入好友排行榜失败");
                }
            } else {
                toastLog("进入好友排行榜失败");
            }
        }

        var endPower = this.getPower(this.findForest());
        if (isNaN(endPower)) {
            sleep(1500);
            endPower = this.getPower(this.findForest());
        }
        var added = endPower - startPower;

        this.robot.back();
        toastLog("收取完毕，共" + total + "个好友，" + added + "g能量");

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

        // 按在父元素中的位置顺序排，总能量为第一个
        filters.sort(function (o1, o2) {
            return o1.indexInParent() - o2.indexInParent();
        });

        // 找到第一个并删除（右上角控件）
        filters.shift();
        toastLog("找到" + filters.length + "个能量球");

        for (var i = 0, len = filters.length; i < len; i++) {
            // 原有的click无效
            this.robot.clickCenter(filters[i]);
            log("点击->" + filters[i].contentDescription + ", " + filters[i].bounds());
            sleep(200);
        }
    };

    /**
     * 收取好友能量
     * @param bounds
     * @param icon
     * @param isEndFunc
     * @param nextElements
     * @returns {number}
     */
    this.takeOthers = function (bounds, icon, isEndFunc, nextElements) {
        // 9/10滑到1/10屏幕
        var x1 = WIDTH / 2;
        var y1 = (HEIGHT * 0.9) | 0;
        var x2 = WIDTH / 2;
        var y2 = (HEIGHT * 0.1) | 0;
        var total = 0;
        while(1) {
            total += this.takeFromImage(bounds, icon);
            descMatches(/\d+’/).visibleToUser(true).find().each(function (o) {
                nextElements.push(o);
            });

            if (isEndFunc()) {
                break;
            }

            this.robot.swipe(x1, y1, x2, y2);
            sleep(1500); // 等待滑动动画
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
        var row_height = HEIGHT / 10;
        var options = {
            region: [WIDTH - row_height, row_height],
            threshold: 0.8
        };
        var total = 0;
        var times = 0;
        while (times < this.options.max_retry_times) {
            capture = captureScreen();
            if (null === capture) {
                toastLog("截图失败");
                times++;
                sleep(200);
                continue;
            }
            point = findImage(capture, icon, options);
            if (null === point) {
                break;
            }
            var x = WIDTH / 2;
            var y = Math.min(HEIGHT, point.y + row_height / 2); // 防止点到屏幕下面
            this.robot.click(x, y); // 点击一行中间

            // 等待好友的森林
            var title = "好友森林";
            if ((title = id("com.alipay.mobile.nebula:id/h5_tv_title").textMatches(/.+蚂蚁森林/).findOne(this.options.timeout)) && this.waitForLoading()) {
                toastLog("进入" + title.text() + "成功");
                total++;
                // 收取
                var takePower = this.getTakePower();
                this.take(bounds);
                sleep(1500);
                var added = this.getTakePower() - takePower;
                if ((0 === added) || isNaN(added)) {
                    sleep(1500);
                    added = this.getTakePower() - takePower;
                }
                toastLog("收取了" + added + "g能量");
            } else {
                toastLog("进入好友森林失败");
            }

            // 返回好友列表
            this.robot.back();
            sleep(1500);

            // 等待好友列表刷新
            id("com.alipay.mobile.nebula:id/h5_tv_title").textMatches(/.+/).findOne(this.options.timeout);
            this.waitForLoading(); // 等待界面渲染及加载
        }

        return total;
    }
}

