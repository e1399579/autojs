/**
 * 利用蚂蚁森林的个人动态，每日定时上报能量变动。
 * 服务器地址：___
 *  */
auto(); // 自动打开无障碍服务
var config = files.isFile("config.js") ? require("config.js") : {};
if (typeof config !== "object") {
    config = {};
}

var options = Object.assign({
    remoteAPI_Collent: "http://xx",     //采集能量的上报接口
    remoteAPI_WithCollent: "http://"    //被他人采集的记录上报接口
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
        if(!secure.openLock(options.password, options.pattern_size)){
            storages.remove(source);
            toastLog("停止脚本");
            engines.stopAll();
            exit();
        }else{
            // 拉起到前台界面 
+           antForest.openApp(); 
        }
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
    this.bounds = [0, 0, WIDTH, 1100];

    toastLog("即将收取能量，按音量上键停止");

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
        sleep(1000);
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

    // 进入我的大树成长记录
    this.enterTreeGrowUpRecord = function () {
        // 寻找大树养成的入口按钮，参见图片（\图片识别\大树养成记录入口.jpg）
        var btnHome = boundsContains(772,285,WIDTH - 772, HEIGHT - 285).depth(7).className("android.view.View").findOne(5000);
        if(btnHome){
            btnHome.click();
            // 等待进入大树养成记录页
            var title = "大树养成记录";
            if (this.waitForLoading("返回")) {
                title = id("com.alipay.mobile.nebula:id/h5_tv_title").findOne(2000);
                if(title){
                    log("成功进入大树成长记录页...");
                    return true;
                }
            }
        }
        return false;
    };

    this.work = function () {
        sleep(500);
        this.robot.click(WIDTH / 2, 510);
        var timeout = this.options.timeout;
        
        // 进入我的大树成长记录
        if(!this.enterTreeGrowUpRecord()){
            log("进入我的大树养成记录失败...退出...");
            exit();
        }

        // 从服务器中获取当前支付宝账号的最后一条能量记录时间
        // 只获取该时间之后的大树成长记录
        // 如果服务器中无此支付宝账号的能量记录，那么服务器会返回7天前的时间点，这样本次就获取7天内的记录
        var remoteLastRecordTime = this.getLastRecordTimeFromRemote();
        log("远程获取最后的能量记录:%s",remoteLastRecordTime);
        if(!remoteLastRecordTime){
            exit();
        }

        // 跳过头部屏幕
        this.robot.swipe(WIDTH / 2, 522, WIDTH / 2, 204);
        sleep(200);

        log("开始获取能量历史..."); 
        var tc = 0;
        this.takeGrowUpRecord(2000,function(currentTakeTime){
            if(tc == 1){
                return true;
            }
            tc ++;
            // if(currentTakeTime < remoteLastRecordTime){
            //     return ture;     
            // }
        });
        
        exit();
        this.back();
        sleep(1000);
    };

    // 从大树成长记录页中，读取能量记录
    this.takeGrowUpRecord = function(swipe_sleep, isEndFunc,scroll){
        var row = (192 * (HEIGHT / 1920)) | 0;
        var recordCount = 0;    //记录的数量
        var x1, y1, x2, y2;
        x2 = x1 = WIDTH / 2;
        switch (scroll) {
            case "next":
            default:
                y1 = HEIGHT - row;
                y2 = row;
                break;
            case "prev":
                y1 = row * 1.5;
                y2 = HEIGHT - row;
                break;
        }
        // while (1) {
            this.takeGrowUpRecordFromImage();
            // if (isEndFunc()) {
            //     break;
            // }
            sleep(swipe_sleep); // 等待滑动动画
            this.robot.swipe(x1, y1, x2, y2,swipe_sleep);
            sleep(swipe_sleep); // 等待滑动动画
            this.takeGrowUpRecordFromImage();
        // }
    }

    // 截图并从图中读取能量的记录
    this.takeGrowUpRecordFromImage = function(){
        var listview = descMatches(/\d+g/).boundsInside(0, 204, WIDTH, 700).find();
        log(listview.length);
        for(var i= 0; i < listview.length; i++){
            var c = listview[i];
            var parent = c.parent();
            log("%s, %s, %s", parent.child(2).desc(),  parent.child(3).desc() ,c.desc());
            //log(c.desc() + " " + c.indexInParent());
        }
        listview = [];
    }

    // // 截图并从图中读取能量的记录
    // this.takeGrowUpRecordFromImage = function(){
    //     var listview = className("android.view.View").boundsInside(0, 204, WIDTH, HEIGHT).depth(6).filter(function(o){
    //         return (o.childCount() == 5 && o.clickable());
    //     }).find();
    //     log(listview.length);
    //     var l = listview.length / 3;
    //     log(l);
    //     for(var i= 0; i < l; i++){
    //         var c = listview[i];
    //         log("%s %s %s %o", c.child(2).desc(), c.child(3).desc(), c.child(4).desc(),c.child(2).bounds());
    //         //log(c.desc() + " " + c.indexInParent());
    //     }
    //     listview = [];
    // }

    // 从远程服务器获取当前支付宝账号的最后一条能量记录时间
    // 如果服务器中没有记录，则会返回7天前的时间点
    this.getLastRecordTimeFromRemote = function(){
        //TODO 暂时未去服务器获取，后续要改 
        var date = new Date();
        date.setMinutes(date.getDay() - 7);
        return date; 
    }
    
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

	// 发送广播，延迟40分钟启动下一次任务
	this.notifyDelayTasker = function(){				
		var date = new Date();
		date.setMinutes(date.getMinutes() + 40);
		var nextTime = date.toDateString() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
		this.notifyTasker(nextTime);
		
    };
    
    this.autoBack = function () {
        // 误点了按钮则返回
        sleep(1000);
        if (id("com.alipay.mobile.ui:id/title_bar_title").exists() || text("通知").exists()) {
            this.back();
            sleep(1500);
        }
    };

    this.back = function () {
        back();
    };
    
    this.scrollUp = function () {
        var y = Math.min(HEIGHT, 1500);
        for(var i=0; i<5; i++){
            this.robot.swipe(WIDTH / 2, 400, WIDTH / 2, y);
            sleep(100);
        }
    }
	

}

