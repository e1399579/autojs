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
 * 1.将take.png与脚本放置于同目录下
 * 2.目前支持PIN解锁（5.0+）和图案解锁（7.0+，从1开始），若手机设置了密码，请将password改为实际密码；若无密码，则无需修改
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

var password = [1, 2, 3, 4]; // 锁屏密码
var takeImg = files.cwd() + "/take.png"; // 收取好友能量用到的图片
const MAX_RETRY_TIMES = 10; // 最大失败重试次数
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
    var km = context.getSystemService(context.KEYGUARD_SERVICE);
    var isLocked = km.inKeyguardRestrictedInputMode(); // 是否已经上锁
    var isSecure = km.isKeyguardSecure(); // 是否设置了密码
    var hasLayer = packageName("com.android.systemui").className("android.widget.FrameLayout").exists(); // 是否有上滑图层
    var isRunning = parseInt(shell("ps | grep 'AlipayGphone' | wc -l", true).result); // 支付宝是否运行

    log({
        isScreenOn: isScreenOn,
        isLocked: isLocked,
        isSecure: isSecure,
        hasLayer: hasLayer,
        isRunning: isRunning
    });

    if (!isScreenOn) {
        log("唤醒");
        device.wakeUp();
        sleep(200);
    }

    var robot = new Robot();

    // 向上滑动即可解锁
    var secure = new Secure();
    if (hasLayer) {
        log("向上滑动");
        secure.openLayer(robot);
    }

    if (isLocked) {
        log("解锁");
        var unlocked = false;
        for (var i = 0; i < MAX_RETRY_TIMES; i++) {
            unlocked = secure.unlock(password);
            if (unlocked) {
                break;
            } else {
                toastLog("解锁失败，重试");
                sleep(500);
                log("向上滑动");
                secure.openLayer(robot);
            }
        }
        if (!unlocked) {
            toastLog("解锁失败，不再重试");
            KeyCode("KEYCODE_POWER");
            exit();
        }
    }

    // 子线程监听Home键
    threads.start(function () {
        events.observeKey();
        events.onKeyDown("home", function (event) {
            toastLog("停止脚本");
            exit();
        });
    });

    var antForest = new AntForest(robot);
    antForest.launch();
    antForest.work();

    if (!isRunning) {
        robot.kill(ALIPAY);
    }

    if (!isScreenOn) {
        KeyCode("KEYCODE_POWER");
    }
    // 退出全部线程
    exit();
}

/**
 * 安全相关
 * @constructor
 */
function Secure() {
    this.openLayer = function (robot) {
        var x = WIDTH / 2;
        var y = HEIGHT - 100;
        robot.swipe(x, y, x, 100, 500);
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
            id(key_id).findOne().click();
        }
        if (id("com.android.systemui:id/key_enter").exists()) {
            id("com.android.systemui:id/key_enter").findOne().click();
        }

        sleep(500); // 等待动画
        return !id("com.android.systemui:id/key0").find().length;
    };

    this.unlockPattern = function (password, len) {
        var selector = id("com.android.systemui:id/lockPatternView");
        if (!selector.exists()) {
            return false;
        }
        var pattern = selector.findOne();
        var rect = pattern.bounds();
        // 使用坐标查找按键
        var oX = rect.left, oY = rect.top; // 第一个点位置
        var w = (rect.right - rect.left) / 3, h = (rect.bottom - rect.top) / 3; // 2点之单间隔为边框的1/3
        var points = [];

        points[0] = {
            x: 0,
            y: 0
        };
        // 初始化每个点的坐标
        for (var i = 1; i <= 3; i++) {
            for (var j = 1; j <= 3; j++) {
                var row = i - 1;
                var col = j - 1;
                var index = 3 * (i - 1) + j; // 序号，从1开始
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
    this.times = 0;

    this.launch = function () {
        toastLog("即将收取蚂蚁森林能量，请勿操作！");

        launch(ALIPAY);
        //waitForPackage(ALIPAY, 500);
        var launched = false;
        for (var i = 0; i < MAX_RETRY_TIMES; i++) {
            if (id("com.alipay.android.phone.openplatform:id/saoyisao_tv").exists()) {
                launched = true;
                break;
            } else {
                sleep(200);
            }
        }
        if (!launched) {
            toastLog("进入支付宝首页失败");
            return this.relaunch();
        }

        var success = false;
        var btn = id("com.alipay.android.phone.openplatform:id/app_text").text("蚂蚁森林");
        for (var times = 0; times < MAX_RETRY_TIMES; times++) {
            if (btn.exists()) {
                log("点击按钮");
                success = this.robot.clickCenter(btn.findOne());
            }
            if (success) {
                break;
            } else {
                sleep(20);
            }
        }
        if (!success) {
            toastLog("进入蚂蚁森林失败");
            return this.relaunch();
        }

        // 等待加载
        className("android.widget.Button").desc("攻略").waitFor();
        toastLog("进入蚂蚁森林成功");

        // 对话出现
        var dialog_x = WIDTH / 2;
        var dialog_y = 510 * (HEIGHT / 1920);
        sleep(2000);

        // 点击对话消失
        this.robot.click(dialog_x, dialog_y);

        return true;
    };

    this.relaunch = function () {
        if (this.times < MAX_RETRY_TIMES) {
            this.times++;
            this.robot.kill(ALIPAY);
            return this.launch();
        } else {
            toastLog("运行失败");
            exit();
        }
    };

    this.work = function () {
        // 开始收取
        this.take("攻略");
        toastLog("收取自己的能量完毕");

        // 等待好友列表
        sleep(2000);
        toastLog("开始收取好友能量");
        var icon = images.read(takeImg);
        if (null === icon) {
            toastLog("缺少图片文件，请仔细查看使用方法的第一条！！！");
            exit();
        }
        // 截图权限申请
        threads.start(function () {
            classNameContains("Button").textContains("立即开始").click();
        });
        if (!requestScreenCapture()) {
            toastLog("请求截图失败");
            exit();
        }

        this.takeOthers(icon, desc("爱心捐赠").className("android.widget.Image"));

        var more = desc("查看更多好友").className("android.view.View").find();
        if (more.length) {
            toastLog("查看更多好友");
            this.robot.clickCenter(more[0]);

            // 等待更多列表刷新
            sleep(5000);
            this.takeOthers(icon, desc("没有更多了").className("android.view.View"));
            this.robot.back();
        }

        toastLog("收取能量完毕");
        this.robot.back();
    };

    /**
     * 收取能量
     * @param keyword
     */
    this.take = function (keyword) {
        var right_bottom = className("android.widget.Button").desc(keyword).findOne();
        var left_top = id("com.alipay.mobile.nebula:id/h5_tv_nav_back").findOne();

        var filters = [];
        var left = 0;
        var right = WIDTH;
        var top = left_top.bounds().bottom;
        var bottom = right_bottom.bounds().top;

        log(left + "-" + top + "-" + right + "-" + bottom);
        var all = descMatches("^(绿色能量|\\d+k?g)$").boundsInside(left, top, right, bottom).clickable(true).find();
        toastLog("找到" + (all.size() - 1) + "个能量球");
        all.each(function (x) {
            filters.push(x);
        });

        filters.sort(function (o1, o2) {
            return distance(o1) - distance(o2);
        });

        if (filters.length > 0) {
            filters.splice(0, 1);
        }

        for (var i = 0, len = filters.length; i < len; i++) {
            //原有的click无效
            this.robot.clickCenter(filters[i], 100);
            log("点击->" + filters[i]);
            sleep(200);
        }

        function distance(o) {
            var rect = o.bounds();
            return Math.pow((rect.top - top), 2) + Math.pow((rect.right - right), 2);
        }
    };

    /**
     * 收取好友能量
     * @param icon
     * @param endSelector
     */
    this.takeOthers = function (icon, endSelector) {
        var times = 0;
        var prevTop = 0;
        var top = 0;
        while (times < MAX_RETRY_TIMES) {
            this.takeFromImage(icon);

            this.robot.swipe(WIDTH / 2, HEIGHT - 100, WIDTH / 2, 100, 500);
            sleep(1500); // 等待滑动动画

            this.takeFromImage(icon);

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
            /*if (bottomUi.length && (bottomUi[0].bounds().top < HEIGHT)) {
                break;
            } else {
                times++;
            }*/
        }
    };

    /**
     * 找图收取
     * @param icon
     */
    this.takeFromImage = function (icon) {
        var point, capture;
        var row_height = 192 * (WIDTH / 1080); // 在1080*1920的屏幕上，一行占192，即一屏10行
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
            // 等待好友的森林
            sleep(3000);

            // 收取、返回
            this.take("浇水");
            this.robot.back();

            // 等待好友列表刷新
            sleep(3000);
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
        duration = duration || 50;

        return this.robot.click(x, y, duration);
    };

    this.clickCenter = function (b, duration) {
        var rect = b.bounds();
        return this.click(rect.centerX(), rect.centerY(), duration);
    };

    this.swipe = function (x1, y1, x2, y2, duration) {
        duration = duration || 200;

        this.robot.swipe(x1, y1, x2, y2, duration);
    };

    this.back = function () {
        KeyCode("KEYCODE_BACK");
    };

    this.kill = function (package_name) {
        shell("am force-stop " + package_name, true);
    };
}

