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

    antForest.launchPersonalCenter();
    antForest.launchAntForest();
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
    this.timeHandle = new timeStringHandle();
    this.alipayID = "";         //支付宝账号

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

    //进入个人主页，获取支付宝账号
    this.launchPersonalCenter = function () {
        var times = 0;
        do {
            if (this.doLaunchPersonalCenter()) {
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

    this.doLaunchPersonalCenter = function () {
        // 可能出现的红包弹框，点击取消
        var timeout = this.options.timeout;
        threads.start(function () {
            var cancelBtn;
            if (cancelBtn = id("com.alipay.android.phone.wallet.sharetoken:id/btn1").findOne(timeout)) {
                cancelBtn.click();
            }
        });
        //等同于 className("android.widget.TextView").text("我的").findOne(timeout)
        var home = id("com.alipay.android.phone.wealth.home:id/tab_description").text("我的").findOne(timeout);
        if (!home) {
            toastLog("进入“我的”失败");
            return false;
        }
        home.parent().click();

        var btn = id("com.alipay.android.phone.wealth.home:id/user_account").findOne(timeout);
        if (!btn) {
            toastLog("查找第一级个人主页失败");
            return false;
        }
        
        if (!(btn.parent() && btn.parent().click())) {
            toastLog("点击第一级个人主页失败");
            return false;
        }
        
        // 等待加载进入个人账号
        // 等同于 className("android.widget.TextView").text("个人信息").findOne(timeout))
        if(!id("com.alipay.mobile.ui:id/title_bar_title").text("个人信息").findOne(timeout)){
            return false;
        }

        // 进入个人主页
        // 等同于 className("android.widget.TextView").text("个人主页").findOne(timeout)
        btn = id("com.alipay.mobile.antui:id/item_left_text").text("个人主页").findOne(timeout);
        if(!btn){
            toastLog("查找第二级个人主页失败");
            return false;
        }
        btn.parent().click();

        if (this.waitForLoading("更多设置")) {
            // toastLog("进入第二级个人主页成功");
        } else {
            toastLog("进入第二级个人主页失败");
            return false;
        }
        
        if(!this.getPersonalID()){
            return false;
        }
        sleep(500);
        this.back();
        sleep(500);
        this.back();

        return true;
    };

    /*
        在第二级个人主页中获取支付宝账号
    */
    this.getPersonalID = function(){
        var timeout = this.options.timeout;

        var alipayID = id("com.alipay.android.phone.wallet.profileapp:id/tv_right").findOne(timeout);
        this.alipayID = alipayID.text().trim();
        log("当前支付宝账号：%s", this.alipayID);
        if(!alipayID){
            return false;
        }

        return true;
    };
    
    // 进入蚂蚁森林
    this.launchAntForest = function () {
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
        this.takeGrowUpRecord(500,function(currentTakeTime){
            if(tc == 1000){
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
        var buttomTag = 0;    // 记录本次最后找到的能量记录位置，用于去掉重复的能量记录
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

        while (1) {
            buttomTag = this.takeGrowUpRecordFromImage(buttomTag);
                
            if (isEndFunc()) {
                break;
            }
            sleep(swipe_sleep); // 等待滑动动画
            this.robot.swipe(x1, y1, x2, y2,swipe_sleep);
            sleep(swipe_sleep); // 等待滑动动画
        }
    }

    // 截图并从图中读取能量的记录
    this.takeGrowUpRecordFromImage = function(buttom){
        var parentView;
        var listview = descMatches(/\d+g/).find();
        for(var i= 0; i < listview.length - 1; i++){
            parentView = listview[i].parent();
            if(parentView.boundsInParent().bottom <= buttom || parentView.childCount() != 5){
                continue;
            }                                                                                           
            var target = parentView.child(2).desc().replace(/收取/,"");
            var time = this.timeHandle.execute(parentView.child(3).desc());
            var amount = parentView.child(4).desc().replace(/g/,"");
            log("%s, %s（%s）, %s", target, time, parentView.child(3).desc(), amount);
        }
        return parentView.boundsInParent().bottom;
    }

    // 从远程服务器获取当前支付宝账号的最后一条能量记录时间
    // 如果服务器中没有记录，则会返回7天前的时间点
    this.getLastRecordTimeFromRemote = function(){
        //TODO 暂时未去服务器获取，后续要改 
        var date = new Date();
        date.setMinutes(date.getDay() - 7);
        return date; 
    }
    
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
}

// 时间处理
function timeStringHandle(){

    this.execute = function(str){
        var index = str.indexOf("上午");
        str = str.trim();
        if(index != -1){
            return this.morning(str,index);
        }
        
        index = str.indexOf("凌晨");
        if(index != -1){
               return this.morning(str,index);
        }
        
        index = str.indexOf("下午");
        if(index != -1){
            return this.afternoon(str,index);
        }
        
        index = str.indexOf("晚上");
        if(index != -1){
               return this.afternoon(str,index);
        }

        index = str.indexOf("分钟");
        if(index != -1){
            return this.sixtyMinutes(str);
        }
        return ""
    };
    
    /* 
        处理上午与凌晨格式的时间字符串
        eg:
            昨天 上午7:12
            上午7:10
            06-19 上午7:12
            昨天 凌晨0:34
            凌晨0:34
            06-19 凌晨0:34 
    */
    this.morning = function(str,i){
        var myDate = new Date();
        switch(i){
            case 0: // 上午7:10
                var s = myDate.toDateString() + " " + str.replace(/[\u4e00-\u9fa5]/g,"");
                s = s.replace(new RegExp(/-/gm) ,"/");
                var z = Date.parse(s);
                return z;
            case 6: // 06-19 上午7:12
                var s = "2018-" + str.replace(/[\u4e00-\u9fa5]/g,"");
                s = s.replace(new RegExp(/-/gm) ,"/");
                var z = Date.parse(s);
                return z;
            case 11:// 2018-06-10 上午7:12
                var s = str.replace(/[\u4e00-\u9fa5]/g,"");
                s = s.replace(new RegExp(/-/gm) ,"/");
                var z = Date.parse(s);
                return z;
            case 3: // 昨天 上午7:12
                myDate.setHours(myDate.getHours() - 24);
                var s = myDate.toDateString() + " " + str.replace(/[\u4e00-\u9fa5]/g,"");
                s = s.replace(new RegExp(/-/gm) ,"/");
                var z = Date.parse(s);
                return z;
        }
    };
    
    /* 
        处理下午与晚上格式的时间字符串
        特别处理“下午12:12”，遇到12点的数据，不能加12小时。
        eg:
            昨天 下午12:12
            下午13:10
            06-19 下午14:12
            昨天 晚上8:34
            晚上8:34
            06-19 晚上8:34
    */
    this.afternoon = function(str,i){
        var myDate = new Date();
        switch(i){
            case 0: // 下午12:10
                var s = myDate.toDateString() + " " + str.replace(/[\u4e00-\u9fa5]/g,"");
                var r = new Date(Date.parse(s));
                if(r.getHours() != 12){
                    r.setHours(r.getHours() + 12);
                }
                return r.getTime();
            case 6: // 06-19 下午12:12
                var s = "2018-" + str.replace(/[\u4e00-\u9fa5]/g,"");
                s = s.replace(new RegExp(/-/gm) ,"/");
                var r = new Date(Date.parse(s));
                if(r.getHours() != 12){
                    r.setHours(r.getHours() + 12);
                }
                return r.getTime();
            case 11:// 2018-06-10 下午12:12
                var s = str.replace(/[\u4e00-\u9fa5]/g,"");
                s = s.replace(new RegExp(/-/gm) ,"/");
                var r = new Date(Date.parse(s));
                if(r.getHours() != 12){
                    r.setHours(r.getHours() + 12);
                }
                return r.getTime();
            case 3: // 昨天 下午12:12
                myDate.setHours(myDate.getHours() - 24);
                var s = myDate.toDateString() + " " + str.replace(/[\u4e00-\u9fa5]/g,"");
                s = s.replace(new RegExp(/-/gm) ,"/");
                var r = new Date(Date.parse(s));
                if(r.getHours() != 12){
                    r.setHours(r.getHours() + 12);
                }
                return r.getTime();
        }
    };

    /*
	处理以下时间字符串，60分钟以内的时间
    eg:
    	24分钟前
        59分钟前
    */
    this.sixtyMinutes = function(str){
        var myDate = new Date();
        myDate.setMinutes(myDate.getMinutes() - parseInt(str));
        return myDate.getTime();
    };

}