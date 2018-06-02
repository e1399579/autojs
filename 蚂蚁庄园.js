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
    pattern_size: 3,
    max_retry_times: 10,    // 最大失败重试次数
    timeout: 12000,         // 超时时间：毫秒
    forage_min: 180,        // 每次喂食的饲料数量
}, config); // 用户配置合并

// 所有操作都是竖屏
const WIDTH = Math.min(device.width, device.height);
const HEIGHT = Math.max(device.width, device.height);
const IS_ROOT = files.exists("/sbin/su") || files.exists("/system/xbin/su") || files.exists("/system/bin/su");

setScreenMetrics(WIDTH, HEIGHT);
start(options);

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
    antForest.drive();      // 驱赶
    //antForest.getForage();  // 获取饲料
    antForest.feed();       // 喂养
    //antForest.collectEgg(); // 收鸡蛋
    antForest.resumeState();

    // 退出
    exit();
}

/**
 * 检查必要模块
 */
function checkModule() {
    if (!files.exists("Robot.js")) {
        throw new Error("缺少Robot.js文件...");
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
    };
    this.options = Object.assign(settings, options);
    this.package = "com.eg.android.AlipayGphone"; // 支付宝包名
    this.state = {};
    this.capture = null;
    this.bounds = [0, 0, WIDTH, 1100];

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
        toastLog("即将去蚂蚁鸡窝，按音量上键停止");

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
        var home = id("com.alipay.android.phone.openplatform:id/tab_description").text("首页").findOne(timeout);
        if (!home) {
            toastLog("进入支付宝首页失败");
            return false;
        }
        home.parent().click();

        var success = false;
        var btn = id("com.alipay.android.phone.openplatform:id/app_text").text("蚂蚁庄园").findOne(timeout);
        if (!btn) {
            toastLog("查找蚂蚁庄园按钮失败");
            return false;
        }
        log("点击按钮");
        if (!(btn.parent() && btn.parent().click())) {
            toastLog("点击蚂蚁庄园失败");
            return false;
        }

        // 等待加载
        if (this.waitForLoading("星星球")) {
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
    
    // 检查是否正在进食
    this.isEatting = function(){
        // 研究很久，没搞定。无法获取“进食剩余下X小时X分钟”的控件
        return true;
    };

	// 喂食
	this.feed = function () {
        if(this.isEatting) 
            exit;
        
        var forage = descMatches(/\d+g/).boundsInside(WIDTH / 3 * 2, HEIGHT - 400, WIDTH, HEIGHT).findOne(2000);
        // 获取当前剩余饲料数量
        forageCount = forage ? parseInt(forage.contentDescription) : 0;
        log("当前饲料还有%dg", forageCount);
        // 如果当前饲料足够喂一次
        if(forageCount >= this.options.forage_min){
            log("准备投食...");
            this.robot.clickCenter(forage);
            toastLog("喂食成功...");
            if((forage - this.options.forage_min) < this.options.forage_min){
                log("饲料不足喂下一次，及时补充饲料");
            }
        }else{
            log("饲料不足，喂不了了...");
        }
            
		toastLog("喂食完毕！");
	}
    
    // 驱赶
    this.drive = function(){
        log("开始驱赶，不一定有小鸡在偷吃...")
        for (let i = 0; i < 3; i++) {
            this.robot.click(WIDTH / 3, HEIGHT / 6 * 4);
            sleep(500);
            this.robot.click(WIDTH * 0.83, HEIGHT / 6 *4);
            sleep(500);
        }
        log("驱动完成!");
    };

    // 获取饲料
    this.getForage = function(){
        log("开始领粮食...");
        var getForage = desc("领饲料").findOne(2000);
        if(getForage){
            this.robot.clickCenter(getForage);
            packageName("com.eg.android.AlipayGphone").find().forEach(function(tv){
            
                log(tv);
        
            });
        }

    }; 
    
    // 收鸡蛋
    this.collectEgg = function(){
        // 没有搞定
        
        //log("开始检查鸡蛋...")
        
        //var egg = descMatches(/\d+%/).boundsInside(100, 1350, WIDTH, HEIGHT).findOne(2000);
        //var egg = descContains("37%").boundsInside(100, 1350, 285, 1570).findOne(2000);
        //var egg = boundsContains(226, 1473, WIDTH - 500, HEIGHT - 300).clickable().findOne();
        //log(egg);
    }; 

	// 发送广播，延迟40分钟启动下一次任务
	this.notifyDelayTasker = function(){				
		var date = new Date();
		date.setMinutes(date.getMinutes() + 40);
		var nextTime = date.toDateString() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
		this.notifyTasker(nextTime);
		
	};
	
	this.back = function () {
        back();
    };

    
}