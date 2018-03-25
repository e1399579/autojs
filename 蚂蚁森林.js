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
    password: "", // 锁屏密码
    takeImg: "take.png", // 收取好友能量用到的图片
    pattern_size: 3, // 图案解锁每行点数
    max_retry_times: 10, // 最大失败重试次数
    timeout: 15000, // 超时时间：毫秒
    check_self_timeout: 60 // 检测自己能量时间：秒
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

    // 退出全部线程
    //engines.stopAll();
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
    this.capture = null;

    this.saveState = function (isScreenOn) {
        this.state.isScreenOn = isScreenOn;
        this.state.currentPackage = currentPackage(); // 当前运行的程序
        this.state.isRunning = parseInt(shell("ps | grep 'AlipayGphone' | wc -l", true).result); // 支付宝是否运行
        log(this.state);
    };

    this.resumeState = function () {
        if (this.state.currentPackage !== this.package) {
            this.robot.back(); // 回到之前运行的程序
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
        if (id("com.alipay.mobile.nebula:id/h5_tv_title").text("蚂蚁森林").findOne(timeout) && this.waitForLoading()) {
            log("进入蚂蚁森林成功");
        } else {
            toastLog("进入蚂蚁森林失败");
            return false;
        }

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
        return className("android.webkit.WebView").findOne(this.options.timeout).child(1);
    };

    this.getPower = function (forest) {
        return (forest.childCount() > 0) ? parseInt(forest.child(0).contentDescription) : null;
    };

    this.getTakePower = function () {
        var selector = desc("你收取TA");
        return selector.exists() ? parseInt(selector.findOnce().parent().child(2).contentDescription) : null;
    };

    this.work = function () {
        // 对话出现
        sleep(1000);

        var timeout = this.options.timeout;
        // 蚂蚁森林控件范围
        var forest = this.findForest();
        var bounds = forest.bounds();
        log(bounds);

        var dialog = forest.child(2);
        var dialog_x = WIDTH / 2;
        var dialog_y = dialog ? dialog.bounds().top - 100 : bounds.centerY();

        // 点击对话消失
        this.robot.click(dialog_x, dialog_y);
        sleep(500);

        var startPower = this.getPower(forest);

        // 开始收取
        this.take(forest);
        this.takeRemain(forest, this.options.check_self_timeout);
        sleep(500);

        var power = this.getPower(this.findForest()) - startPower;
        if (power > 0) toastLog("收取了" + power + "g自己的能量");

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
            /*if (remember = id("com.android.systemui:id/remember").checkable(true).findOne(timeout)) {
                remember.click();
            }*/
            if (beginBtn = classNameContains("Button").textContains("立即开始").findOne(timeout)) {
                beginBtn.click();
            }
        });
        if (!requestScreenCapture(false)) {
            toastLog("请求截图失败");
            engines.stopAll();
            exit();
        }

        // 跳过当前屏幕
        this.robot.swipe(WIDTH / 2, HEIGHT, WIDTH / 2, (HEIGHT * 0.1) | 0);
        sleep(1500);
        log("开始收取好友能量");

        
        var total = 0;
        total += this.takeOthers(icon, function () {
            var selector = className("android.webkit.WebView").scrollable(true);
            if (!selector.exists()) return false;

            var rank, num;
            var childNum = desc("查看更多动态").exists() ? 2 : 1;
            if ((rank = selector.findOne(timeout)) && (rank.childCount() >= childNum)) {
                var list = rank.child(childNum).child(1);
                num = list.childCount();
                if (num < 1) return true;
            } else {
                toastLog("查找排行榜失败");
                return true;
            }

            return list.child(num - 1).visibleToUser();
        });

        // 统计下次时间
        var minuteList = this.statisticsNextTime();

        this.robot.swipe(WIDTH / 2, HEIGHT - 100, WIDTH / 2, 100); // 兼容部分手机没有滑到底部问题
        var keyword = "查看更多好友";
        if (desc(keyword).exists()) {
            log(keyword);
            if (this.robot.clickCenter(desc(keyword).findOne(timeout))) {
                // 等待更多列表刷新
                if (id("com.alipay.mobile.nebula:id/h5_tv_title").text("好友排行榜").findOne(timeout) && this.waitForLoading()) {
                    log("进入好友排行榜成功");
                    total += this.takeOthers(icon, function () {
                        /*var selector = desc("没有更多了");
                        if (!selector.exists()) return false;

                        return selector.findOne().visibleToUser();*/
                        return findColorEquals(this.capture, "#30BF6C", WIDTH - 300, HEIGHT - 300, 200, 200) !== null;
                    }.bind(this));

                    minuteList = this.statisticsNextTime();

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

        // 统计部分，可以删除
        var date = new Date();

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

        var timeList = [];
        var timestamp = date.getTime();
        for (var i = 0, len = minuteList.length; i < len; i++) {
            var minute = minuteList[i];
            var now = timestamp + minute * 60 * 1000;
            date.setTime(now);
            timeList.push(date.getHours() + ":" + date.getMinutes());
        }
        if (timeList.length) {
            log("下次收取时间：" + timeList.join(', '));
        }
    };

    this.statisticsNextTime = function () {
        var minuteList = [];
        descMatches(/\d+’/).find().forEach(function (o) {
            minuteList.push(parseInt(o.contentDescription));
        });
        return minuteList;
    };

    /**
     * 收取能量
     * @param forest
     */
    this.take = function (forest) {
        // 等待能量球渲染
        //sleep(1500);
        forest = forest || this.findForest();
        var filters = forest.find(descMatches(/^(绿色能量|\d+k?g)$/));

        filters.sort(function (o1, o2) {
            return o2.indexInParent() - o1.indexInParent();
        });

        // 删除右上角控件
        filters.pop();
        log("找到" + filters.length + "个能量球");

        for (var i = 0, len = filters.length; i < len; i++) {
            // 原有的click无效
            this.robot.clickCenter(filters[i]);
            log("点击->" + filters[i].contentDescription + ", " + filters[i].bounds());
            sleep(50);
        }

        // 误点了按钮则返回
        if (id("com.alipay.mobile.ui:id/title_bar_title").exists()) {
            this.robot.back();
            sleep(1500);
        }
    };

    /**
     * 获取剩余能量球列表
     * @param {object} forest
     * @param {number} max_time
     */
    this.getRemainList = function (forest, max_time) {
        var list = [];
        forest.find(descMatches(/.*?\d{2}:\d{2}/)).forEach(function (o) {
            var time = this.getRemainTime(o);
            if (time > max_time) return;

            var rect = o.bounds();
            list.push({
                time: time,
                x: rect.centerX(),
                y: rect.centerY()
            });
        }.bind(this));

        return list;
    };

    /**
     * 获取剩余时间：秒
     * @param {object} o
     */
    this.getRemainTime = function (o) {
        var matches = o.contentDescription.match(/.*?(\d{2}):(\d{2})/);
        if (!matches) return 0;
        var hour = matches[1];
        var minute = matches[2];
        return (hour * 60 + minute) * 60;
    };

    this.takeRemain = function (forest, max_time) {
        if (!max_time) return;

        var list = this.getRemainList(forest, max_time);
        if (!list.length) return;

        list.sort(function (o1, o2) {
            return o1.time - o2.time;
        });
        var min_time = list[0].time;
        if (min_time > max_time) return;
        toastLog("开始检测剩余能量");

        max_time = Math.min(list[list.length - 1].time, max_time);
        var millisecond = max_time * 1000;
        var step_time = 100;
        var i = 0;
        do {
            list.forEach(function (o) {
                this.robot.click(o.x, o.y);
            }.bind(this));

            i += step_time + 156; // 每次操作有延迟

            sleep(step_time);
        } while (i <= millisecond);
        toastLog("检测结束");

        this.take(forest);
    };

    /**
     * 收取好友能量
     * @param icon
     * @param isEndFunc
     * @returns {number}
     */
    this.takeOthers = function (icon, isEndFunc) {
        // 9/10滑到1/10屏幕
        var x1 = WIDTH / 2;
        var y1 = (HEIGHT * 0.9) | 0;
        var x2 = WIDTH / 2;
        var y2 = (HEIGHT * 0.1) | 0;
        var total = 0;
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
            sleep(1000); // 在森林中查找控件比列表中查找快

            // 等待好友的森林
            var title = "好友森林";
            if ((title = id("com.alipay.mobile.nebula:id/h5_tv_title").textMatches(/.+蚂蚁森林/).findOne(this.options.timeout)) && this.waitForLoading()) {
                log("进入" + title.text() + "成功");
                total++;

                var cover = descMatches(/\d{2}:\d{2}:\d{2}/);
                if (cover.exists()) {
                    toastLog("保护罩还剩" + cover.findOnce().contentDescription + "，忽略");
                } else {
                    // 收取
                    var takePower = this.getTakePower();
                    this.take();
                    sleep(1500);
                    var added = this.getTakePower() - takePower;
                    if (added > 0) toastLog("收取了" + added + "g能量");
                }
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

