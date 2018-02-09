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
 * 1.将take.png（找图所需）、config.js（配置文件）与脚本放置于同目录下
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

    var km = context.getSystemService(context.KEYGUARD_SERVICE);
    var isLocked = km.inKeyguardRestrictedInputMode(); // 是否已经上锁
    var isSecure = km.isKeyguardSecure(); // 是否设置了密码
    var isRunning = parseInt(shell("ps | grep 'AlipayGphone' | wc -l", true).result); // 支付宝是否运行

    log({
        isScreenOn: isScreenOn,
        isLocked: isLocked,
        isSecure: isSecure,
        isRunning: isRunning
    });

    var robot = new Robot();
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

    if (isLocked) {
        var secure = new Secure(robot);
        secure.openLock(password);
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
 * 安全相关
 * @constructor
 */
function Secure(robot) {
    this.robot = robot;

    this.openLock = function (password) {
        log("解锁");
        for (var i = 0; i < MAX_RETRY_TIMES; i++) {
            var hasLayer = packageName("com.android.systemui").className("android.widget.FrameLayout").exists(); // 是否有上滑图层
            // 向上滑动即可解锁
            if (hasLayer) {
                log("向上滑动");
                this.openLayer();
            }

            if (this.unlock(password)) {
                return true;
            } else {
                toastLog("解锁失败，重试");
            }
        }

        toastLog("解锁失败，不再重试");
        this.failed();
    };

    this.failed = function () {
        KeyCode("KEYCODE_POWER");
        engines.stopAll();
        exit();
        return false;
    };

    this.openLayer = function () {
        var x = WIDTH / 2;
        var y = HEIGHT - 100;
        this.robot.swipe(x, y, x, 100, 750);
        sleep(500); // 等待动画
    };

    this.unlock = function (password) {
        var len = password.length;

        if (len < 4) {
            throw new Error("密码至少4位");
        }

        if (id("com.android.systemui:id/lockPatternView").exists()) {
            return this.unlockPattern(password, len);
        } else {
            return this.unlockKey(password, len);
        }
    };

    this.unlockKey = function (password, len) {
        for (var j = 0; j < len; j++) {
            var key_id = "com.android.systemui:id/key" + password[j];
            if (!id(key_id).exists()) {
                return false;
            }
            id(key_id).findOne(TIMEOUT).click();
        }
        if (id("com.android.systemui:id/key_enter").exists()) {
            id("com.android.systemui:id/key_enter").findOne(TIMEOUT).click();
        }

        sleep(500); // 等待动画
        if (id("android:id/message").textContains("重试").exists()) {
            toastLog("密码错误");
            return this.failed();
        }
        return !id("com.android.systemui:id/key0").exists();
    };

    this.unlockPattern = function (password, len) {
        var selector = id("com.android.systemui:id/lockPatternView");
        if (!selector.exists()) {
            return false;
        }
        var pattern = selector.findOne(TIMEOUT);
        var rect = pattern.bounds();
        // 使用坐标查找按键
        var oX = rect.left, oY = rect.top; // 第一个点位置
        var w = (rect.right - rect.left) / PATTERN_SIZE, h = (rect.bottom - rect.top) / PATTERN_SIZE; // 2点之单间隔为边框的1/3
        var points = [];

        points[0] = {
            x: 0,
            y: 0
        };
        // 初始化每个点的坐标
        for (var i = 1; i <= PATTERN_SIZE; i++) {
            for (var j = 1; j <= PATTERN_SIZE; j++) {
                var row = i - 1;
                var col = j - 1;
                var index = PATTERN_SIZE * (i - 1) + j; // 序号，从1开始
                points[index] = {
                    x: oX + col * w + w / 2,
                    y: oY + row * h + h / 2
                };
            }
        }

        // 使用手势解锁
        var gestureParam = [100 * len];
        for (var i = 0; i < len; i++) {
            var point = points[password[i]];

            gestureParam.push([point.x, point.y]);
        }
        gestures(gestureParam);

        sleep(500); // 等待动画
        if (id("android:id/message").textContains("重试").exists()) {
            toastLog("密码错误");
            return this.failed();
        }
        return !selector.exists();
    };
}

/**
 * 蚂蚁森林的各个操作
 * @param robot
 * @constructor
 */
function AntForest(robot) {
    this.robot = robot;

    this.openApp = function () {
        toastLog("即将收取蚂蚁森林能量，按Home键停止");

        launch(ALIPAY);
        //waitForPackage(ALIPAY, 500);
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
        if (!id("com.alipay.android.phone.openplatform:id/saoyisao_tv").findOne(TIMEOUT)) {
            toastLog("进入支付宝首页失败");
            return false;
        }

        var success = false;
        var btn = id("com.alipay.android.phone.openplatform:id/app_text").text("蚂蚁森林");
        for (var times = 0; times < MAX_RETRY_TIMES; times++) {
            if (btn.exists()) {
                log("点击按钮");
                success = this.robot.clickCenter(btn.findOne(TIMEOUT));
            }
            if (success) {
                break;
            } else {
                sleep(20);
            }
        }
        if (!success) {
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
        var bounds = className("android.view.View").depth(11).filter(function(o){
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

        this.takeOthers(bounds, icon, className("android.webkit.WebView").scrollable(true));

        var more = desc("查看更多好友").className("android.view.View").find();
        if (more.length) {
            toastLog("查看更多好友");
            this.robot.clickCenter(more[0]);

            // 等待更多列表刷新
            if (id("com.alipay.mobile.nebula:id/h5_tv_title").text("好友排行榜").findOne(TIMEOUT)) {
                sleep(2000); // 等待界面渲染
                //this.takeOthers(bounds, icon, desc("没有更多了").className("android.view.View"));
                this.takeOthers(bounds, icon, className("android.webkit.WebView").scrollable(true));
                this.robot.back();
            } else {
                toastLog("进入好友排行榜失败");
            }
        }

        toastLog("收取能量完毕");
        this.robot.back();
    };

    /**
     * 收取能量
     * @param bounds
     */
    this.take = function (bounds) {
        var filters = [];

        var all = descMatches("^(绿色能量|\\d+k?g)$").boundsInside(bounds.left, bounds.top, bounds.right, bounds.bottom).find();
        toastLog("找到" + (all.length - 1) + "个能量球");
        all.each(function (x) {
            filters.push(x);
        });

        // 等待能量球渲染
        sleep(1500);

        // 按在父元素中的位置顺序排，总能量为第一个
        filters.sort(function (o1, o2) {
            return o1.indexInParent() - o2.indexInParent();
        });

        // 找到第一个并删除（右上角控件）
        if (filters.length > 0) {
            filters.splice(0, 1);
        }

        for (var i = 0, len = filters.length; i < len; i++) {
            // 原有的click无效
            this.robot.clickCenter(filters[i], 100);
            log("点击->" + filters[i]);
            sleep(200);
        }
    };

    /**
     * 收取好友能量
     * @param bounds
     * @param icon
     * @param endSelector
     */
    this.takeOthers = function (bounds, icon, endSelector) {
        var times = 0;
        var prevTop = 0;
        var top = 0;
        var row_height = 192 * (HEIGHT / 1920);
        var x1 = WIDTH / 2;
        var y1 = HEIGHT - row_height;
        var x2 = WIDTH / 2;
        var y2 = row_height;
        while (times < MAX_RETRY_TIMES) {
            this.takeFromImage(bounds, icon);

            this.robot.swipe(x1, y1, x2, y2);
            sleep(1500); // 等待滑动动画

            this.takeFromImage(bounds, icon);

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
    };

    /**
     * 找图收取
     * @param bounds
     * @param icon
     */
    this.takeFromImage = function (bounds, icon) {
        var point, capture;
        var row_height = 192 * (HEIGHT / 1920); // 在1080*1920的屏幕上，一行占192，即一屏10行
        var options = {
            region: [WIDTH - row_height, row_height],
            threshold: 0.9
        };
        while(true) {
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
                sleep(500); // 等待界面渲染
                toastLog("进入好友森林成功");
            }

            // 收取、返回
            this.take(bounds);
            this.robot.back();

            // 等待好友列表刷新
            id("com.alipay.mobile.nebula:id/h5_tv_title").textMatches(/.+/).findOne(TIMEOUT);
            sleep(1500); // 等待界面渲染及加载
        }
    }
}

/**
 * 安卓5机器人
 * @constructor
 */
function LollipopRobot() {
    this.robot = new RootAutomator();

    this.click = function (x, y, duration) {
        Tap(x, y);
        sleep(duration);
        return true;
    };

    this.swipe = function (x1, y1, x2, y2, duration) {
        duration = duration || 1000;
        Swipe(x1, y1, x2, y2, duration);
        // 滑动之后有动画
        sleep(1500);
        return true;
    };
}

/**
 * 安卓7机器人
 * @constructor
 */
function NougatRobot() {
    this.click = function (x, y, duration) {
        return press(x, y, duration);
    };

    this.swipe = function (x1, y1, x2, y2, duration) {
        duration = duration || 200;
        return swipe(x1, y1, x2, y2, duration);
    };
}

/**
 * 机器人工厂
 * @constructor
 */
function Robot() {
    this.robot = (device.sdkInt < 24) ? new LollipopRobot() : new NougatRobot();

    this.click = function (x, y, duration) {
        duration = duration || 10;

        return this.robot.click(x, y, duration);
    };

    this.clickCenter = function (b, duration) {
        var rect = b.bounds();
        return this.click(rect.centerX(), rect.centerY(), duration);
    };

    this.swipe = function (x1, y1, x2, y2, duration) {
        this.robot.swipe(x1, y1, x2, y2, duration);
    };

    this.back = function () {
        KeyCode("KEYCODE_BACK");
    };

    this.kill = function (package_name) {
        shell("am force-stop " + package_name, true);
    };
}

