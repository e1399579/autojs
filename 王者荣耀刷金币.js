/**
 * 王者荣耀刷金币
 */
auto(); // 自动打开无障碍服务

var options = {
    repeatTime : 60,        // 重复通过次数
    gameMode : 1,           // 通关模式：1=重新挑战 -> 挑战界面，2=重新挑战-> 更换阵容
    stepWait : [2000, 24000, 170, 3000],   // 各步骤等待间隔
    timeout: 8000, // 超时时间：毫秒
    max_retry_times: 10, // 最大失败重试次
};  

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
    var source = "tmgp.sgame";
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

    var Robot = require("Robot.js");
    var robot = new Robot(options.max_retry_times);
    var App = new AppGame(robot, options);

    // 先打开APP，节省等待时间
    threads.start(function () {
        App.saveState(isScreenOn);
        App.openApp();
    });

    App.launch();
    App.work();
    App.resumeState();

    // 退出
    exit();
}

/**
 * 各个操作
 * @param robot
 * @param options
 * @constructor
 */
function AppGame(robot, options) {
    this.robot = robot;
    options = options || {};
    this.options = Object.assign(options);
    this.package = "com.tencent.tmgp.sgame";
    this.activity = "com.tencent.tmgp.sgame.SGameActivity";
    this.state = {};
    this.capture = null;

    toastLog("即将启动王者荣耀，按音量上键停止");

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
        launch(this.package);
    };

    this.closeApp = function () {
        this.robot.kill(this.package);
    };

    this.launch = function () {
        var times = 0;
        do {
            if (this.doLaunch()) {
                sleep(50000);
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
        sleep(4000);
        return (currentActivity() === this.activity);
    };

    this.work = function() {
        sleep(5000);
        for (let i = 0; i < this.options.repeatTime; i++){
            toastLog("第%d次通过即将开始", i);
            if (this.options.gameMode == 1){
                toastLog('#0 start the game');
                this.robot.click(1600, 970);
                sleep(this.options.stepWait[0]);
            }
                
            toastLog('#1 ready, go!!!');
            this.robot.click(1450, 910);
            sleep(this.options.stepWait[1]);

            toastLog('#2 auto power on!');
            //this.robot.click(1780, 40);

            for (let l = 0; l < this.options.stepWait[2]; l++){
                this.robot.click(1720, 80);
                sleep(1);
            }

            toastLog('#3 do it again...');
            this.robot.click(1600, 980);
            sleep(this.options.stepWait[3]);
        }
    };
    
    // this.work = function () {
    //     if (!requestScreenCapture(false)) {
    //         toastLog("请求截图失败");
    //         exit();
    //     }

    //     // 关闭弹窗广告（可能没有)
    //     this.closeADPopup();
    //     // 登陆（不一定需要）

        
    // };
    
    // // 关闭弹窗广告
    // this.closeADPopup = function(){
    //     var image = images.read("图片识别/1.jpg");
    //     if (null === image) {
    //         toastLog("缺少图片文件！！！");
    //         exit();
    //     }

    //     this.clickFromImage(image);
        
    // };

    // /**
    //  * 根据传入的图片，在屏幕上寻找相同的区域，并进行点击
    //  * @param image 传入的小图
    //  */
    // this.clickFromImage = function(image){
    //     var point;
    //     var times = 0;
    //     var offsetX = image.getWidth() / 2;
    //     var offsetY = image.getHeight() / 2;
    //     while (times < this.options.max_retry_times) {
    //         this.capture = captureScreen();
    //         if (null === this.capture) {
    //             toastLog("截图失败");
    //             times++;
    //             sleep(200);
    //             continue;
    //         }
    //         point = findImage(this.capture, image);
    //         console.log("位置：o%",point);
    //         if (null != point) {
    //             break;
    //         }
    //     }
    //     var y = point.y + offsetY;
    //     var x = point.x + offsetX;
    //     this.robot.click(x, y);
    // };

    this.back = function () {
        back();
    };
}

