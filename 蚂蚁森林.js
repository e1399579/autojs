/**
 * 使用说明请看 https://github.com/e1399579/autojs/blob/master/README.md
 * @author ridersam <e1399579@gmail.com>
 */
auto(); // 自动打开无障碍服务
var config = files.isFile("config.js") ? require("config.js") : {};
if (typeof config !== "object") {
    config = {};
}
var options = Object.assign({
    password: "",
    pattern_size: 3
}, config); // 用户配置合并

// 所有操作都是竖屏
const WIDTH = Math.min(device.width, device.height);
const HEIGHT = Math.max(device.width, device.height);
const IS_ROOT = files.exists("/sbin/su") || files.exists("/system/xbin/su") || files.exists("/system/bin/su");

setScreenMetrics(WIDTH, HEIGHT);
start(options);

/**
 * 开始运行
 * @param options
 */
function start(options) {
    // 连续运行处理
    var source = "antForest";
    //storages.remove(source);exit();
    var stateStorage = storages.create(source);
    var running = stateStorage.get("running", []);
    var no = running.length ? running[running.length - 1] + 1 : 1;
    running.push(no);
    log(running);
    stateStorage.put("running", running);
    // 子线程监听音量上键
    threads.start(function () {
        events.observeKey();
        events.onceKeyDown("volume_up", function (event) {
            storages.remove(source);
            toastLog("停止脚本");
            engines.stopAll();
            exit();
        });
    });
    // 监听退出事件
    events.on("exit", function () {
        running = stateStorage.get("running", []);
        var index = running.indexOf(no);
        running.splice(index, 1);
        log(running);
        if (!running.length) {
            storages.remove(source);
        } else {
            stateStorage.put("running", running);
        }
    });
    while (1) {
        var waiting = stateStorage.get("running").indexOf(no);
        if (waiting > 0) {
            log("任务" + no + "排队中，前面有" + waiting + "个任务");
            sleep(15000);
        } else {
            log("任务" + no + "开始运行");
            break;
        }
    }

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

    if (files.exists("Secure.js")) {
        var Secure = require("Secure.js");
        var secure = new Secure(robot, options.max_retry_times);
        secure.openLock(options.password, options.pattern_size);
    }

    antForest.launch();
    antForest.work();
    antForest.resumeState();

    // 退出
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
        timeout: 8000, // 超时时间：毫秒
        max_retry_times: 10, // 最大失败重试次数
        takeImg: "take.png", // 收取好友能量用到的图片
        max_swipe_times: 100, // 好友列表最多滑动次数
        min_time: "7:14:00", // 检测时段
        max_time: "7:15:50",
        check_within_time: 5
    };
    this.options = Object.assign(settings, options);
    this.package = "com.eg.android.AlipayGphone"; // 支付宝包名
    this.state = {};
    this.capture = null;

    this.saveState = function (isScreenOn) {
        this.state.isScreenOn = isScreenOn;
        this.state.currentPackage = currentPackage(); // 当前运行的程序
        this.state.isRunning = IS_ROOT ? parseInt(shell("ps | grep 'AlipayGphone' | wc -l", true).result) : 0; // 支付宝是否运行
        this.state.version = context.getPackageManager().getPackageInfo(this.package, 0).versionName;
        log(this.state);
    };

    this.resumeState = function () {
        if (this.state.currentPackage !== this.package) {
            this.back(); // 回到之前运行的程序
            sleep(1500);
        }

        if (!this.state.isRunning) {
            this.closeApp();
        }

        if (!this.state.isScreenOn) {
            KeyCode("KEYCODE_POWER");
        }
    };

    this.openApp = function () {
        toastLog("即将收取能量，按音量上键停止");

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
                this.back();
                sleep(1500);
                this.openApp();
            }
        } while (times < this.options.max_retry_times);

        toastLog("运行失败");
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

        var home = id("com.alipay.android.phone.openplatform:id/tab_description").text("首页").findOne(timeout);
        if (!home) {
            toastLog("进入支付宝首页失败");
            return false;
        }
        home.parent().click();

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
        if (this.waitForLoading("合种")) {
            log("进入蚂蚁森林成功");
        } else {
            toastLog("进入蚂蚁森林失败");
            return false;
        }

        return true;
    };

    this.waitForLoading = function (keyword) {
        var timeout = this.options.timeout;
        var waitTime = 200;
        sleep(2000);
        timeout -= 2000;
        for (var i = 0; i < timeout; i += waitTime) {
            if (desc(keyword).exists()) {
                sleep(1000);
                return true;
            }

            sleep(waitTime); // 加载中
        }

        return false;
    };

    this.getPower = function () {
        var energy= id("tree_energy").findOnce() || descMatches(/\d+g/).boundsInside(WIDTH / 2, 0, WIDTH, 340).findOnce();
        return energy ? parseInt(energy.contentDescription) : null;
    };

    this.work = function () {
        sleep(1000);
        this.robot.click(WIDTH / 2, 510);

        var timeout = this.options.timeout;
        var startPower = this.getPower();
        log("当前能量：" + startPower);

        // 开始收取
        this.take();
        this.takeRemain(this.getRemainList(), this.options.min_time, this.options.max_time);
        sleep(500);

        var power = this.getPower() - startPower;
        if (power > 0) toastLog("收取了" + power + "g自己的能量");

        var icon = images.read(this.options.takeImg);
        if (null === icon) {
            toastLog("缺少图片文件，请仔细查看使用方法的第一条！！！");
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
        if (!requestScreenCapture(false)) {
            toastLog("请求截图失败");
            exit();
        }

        // 跳过当前屏幕
        var y = Math.min(HEIGHT, 1720);
        this.robot.swipe(WIDTH / 2, y, WIDTH / 2, 0);
        sleep(500);
        log("开始收取好友能量");
        
        var total = 0;
        var bottom = 0;
        total += this.takeOthers(icon, function () {
            var rect = desc("合种").findOnce().bounds();

            if (rect.bottom === bottom) {
                return true;
            }

            bottom = rect.bottom;
            return false;
        });

        // 统计下次时间
        var minuteList = [];
        var keyword = "查看更多好友";
        if (desc(keyword).exists()) {
            log(keyword);
            if (this.robot.clickCenter(desc(keyword).findOne(timeout))) {
                // 等待更多列表刷新
                if (id("com.alipay.mobile.nebula:id/h5_tv_title").text("好友排行榜").findOne(timeout)) {
                    sleep(1000);
                    log("进入好友排行榜成功");
                    // 跳过第一屏
                    var y = Math.min(HEIGHT, 1720);
                    this.robot.swipe(WIDTH / 2, y, WIDTH / 2, 0);
                    sleep(500);

                    var page, min_minute;
                    for (;;) {
                        log("往下翻页");
                        page = 0;
                        total += this.takeOthers(icon, function () {
                            /*var selector = desc("没有更多了");
                            if (!selector.exists()) return false;

                            return selector.findOne().visibleToUser();*/
                            page++;
                            return (page > this.options.max_swipe_times) 
                            || (findColorEquals(this.capture, "#30BF6C", WIDTH - 300, 0, 200, HEIGHT) !== null);
                        }.bind(this));

                        minuteList = this.statisticsNextTime();
                        this.filterMinuteList(minuteList);
                        
                        if (!this.executeNextTask()) {
                            break;
                        }

                        if (!minuteList.length) {
                            break;
                        }
                        min_minute = minuteList[0];
                        if (min_minute > this.options.check_within_time) {
                            break;
                        }

                        log("往上翻页");
                        page = 0;
                        total += this.takeOthers(icon, function () {
                            page++;
                            return (page > this.options.max_swipe_times) 
                            || (findColorEquals(this.capture, "#EFAE44", 0, 0, 110, HEIGHT / 2) !== null);
                        }.bind(this), "prev");
                    }

                    this.back();
                    sleep(2000);
                    this.waitForLoading("合种");
                } else {
                    toastLog("进入好友排行榜失败");
                }
            } else {
                toastLog("进入好友排行榜失败");
            }
        } else {
            minuteList = this.statisticsNextTime();
            this.filterMinuteList(minuteList);
        }
        
        var endPower = this.getPower();
        
        var added = endPower - startPower;
        added = Math.max(0, added);

        this.back();
        toastLog("收取完毕，共" + total + "个好友，" + added + "g能量");
        sleep(1500);

        // 统计部分，可以删除
        var timeList = this.getTimeList(minuteList);
        if (timeList.length) {
            log("可收取时间：" + timeList.join(', '));
            
            // 添加tasker任务
            if (this.executeNextTask()) {
                var date = new Date();
                var today = date.toDateString();
                var next_time = today + " " + timeList[0];
                this.notifyTasker(next_time);
            }
        }
    };

    this.statisticsNextTime = function () {
        var minuteList = [];
        descMatches(/\d+’/).find().forEach(function (o) {
            minuteList.push(parseInt(o.contentDescription));
        });
        return minuteList;
    };

    this.filterMinuteList = function (minuteList) {
        // 排序
        minuteList.sort(function (m1, m2) {
            return m1 - m2;
        });
        // 去掉重复的
        for (var i = 1, len = minuteList.length; i < len; i++) {
            // 相差1分钟以内认为是同一时间
            if ((minuteList[i] - minuteList[i - 1]) <= 1) {
                minuteList.splice(i--, 1);
                len--;
            }
        }
    };

    this.getTimeList = function (minuteList) {
        var date = new Date();
        var timeList = [];
        var timestamp = date.getTime();
        for (var i = 0, len = minuteList.length; i < len; i++) {
            var minute = minuteList[i];
            var now = timestamp + minute * 60 * 1000;
            date.setTime(now);
            timeList.push(date.getHours() + ":" + date.getMinutes());
        }
        return timeList;
    };

    this.executeNextTask = function () {
        var date = new Date();
        var timestamp = date.getTime();
        var today = date.toDateString();
        var max_time = today + " " + this.options.max_time;
        var max_timestamp = Date.parse(max_time);
        return (timestamp > max_timestamp);
    };

    this.notifyTasker = function (time) {
        app.sendBroadcast({
            action: "net.dinglisch.android.tasker.ActionCodes.RUN_SCRIPT",
            extras: {
                name: "蚂蚁森林",
                time: time
            }
        });
        log("已发送Tasker任务：" + time);
    };

    /**
     * 收取能量
     */
    this.take = function () {
        var left = 0, top = 0, right = WIDTH, buttom = 1100;
        var filters = descMatches(/收集能量/).boundsInside(left, top, right, buttom).find();

        var num = filters.length;
        log("找到" + num + "个能量球");
        sleep(100 * num);

        this.robot.clickMultiCenter(filters);
        
        // 误点了按钮则返回
        sleep(1000);
        if (id("com.alipay.mobile.ui:id/title_bar_title").exists()) {
            this.back();
            sleep(1500);
        }
    };

    /**
     * 获取剩余能量球列表
     */
    this.getRemainList = function () {
        var list = [];
        descMatches(/收集能量/).find().forEach(function (o) {
            var rect = o.bounds();
            list.push([rect.centerX(), rect.centerY()]);
        }.bind(this));

        return list;
    };

    this.takeRemain = function (list, min_time, max_time) {
        var len = list.length;
        if (!len) return;
        
        var date = new Date();
        var today = date.toDateString();
        var min_timestamp = Date.parse(today + " " + min_time);
        var max_timestamp = Date.parse(today + " " + max_time);
        var now = date.getTime();
        
        if ((min_timestamp <= now) && (now <= max_timestamp)) {
            toastLog("开始检测剩余能量");
            var millisecond = max_timestamp - now;
            var step_time = 50;
            var use_time = step_time + 200;
            for (var i = 0;i <= millisecond;i += use_time) {
                this.robot.clickMulti(list);

                sleep(step_time);
            }
            
            toastLog("检测结束");
        }
    };

    /**
     * 收取好友能量
     * @param icon
     * @param isEndFunc
     * @param scroll
     * @returns {number}
     */
    this.takeOthers = function (icon, isEndFunc, scroll) {
        var row = (192 * (HEIGHT / 1920)) | 0;
        var total = 0;
        var x1, y1, x2, y2;
        x2 = x1 = WIDTH / 2;
        switch (scroll) {
            case "next":
            default:
                y1 = HEIGHT - row;
                y2 = row;
                break;
            case "prev":
                y1 = row;
                y2 = HEIGHT - row;
                break;
        }
        while (1) {
            total += this.takeFromImage(icon);

            if (isEndFunc()) {
                break;
            }

            this.robot.swipe(x1, y1, x2, y2);
            sleep(500); // 等待滑动动画
        }

        return total;
    };

    /**
     * 找图收取
     * @param icon
     * @returns {number}
     */
    this.takeFromImage = function (icon) {
        var point;
        var row_height = HEIGHT / 10;
        var options = {
            region: [WIDTH - row_height, row_height],
            threshold: 0.8
        };
        var total = 0;
        var times = 0;
        var x = WIDTH / 2;
        var offset = icon.getHeight() / 2;
        while (times < this.options.max_retry_times) {
            this.capture = captureScreen();
            if (null === this.capture) {
                toastLog("截图失败");
                times++;
                sleep(200);
                continue;
            }
            point = findImage(this.capture, icon, options);
            if (null === point) {
                break;
            }
            
            var y = point.y + offset;
            this.robot.click(x, y);

            // 等待好友的森林
            var title = "好友森林";
            if (this.waitForLoading("浇水")) {
                title = id("com.alipay.mobile.nebula:id/h5_tv_title").findOnce();
                log("进入" + title.text() + "成功");
                total++;

                var cover;
                if (cover = descMatches(/\d{2}:\d{2}:\d{2}/).findOnce()) {
                    toastLog("保护罩还剩" + cover.contentDescription + "，忽略");
                } else {
                    // 收取
                    this.take();
                }
            } else {
                toastLog("进入好友森林失败");
            }

            // 返回好友列表
            this.back();
            sleep(3000);
        }

        return total;
    };

    this.back = function () {
        back();
    };
}

