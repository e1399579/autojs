auto();

const WIDTH = Math.min(device.width, device.height);
const HEIGHT = Math.max(device.width, device.height);

start();
function start() {
    var timeout = 10000;
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

    // 保持屏幕常亮
    if(!device.isScreenOn()){
        device.wakeUp();
        device.keepScreenDim(3600 * 1000);
    }
    

    var flag = true;
    while(flag){
        try {
            toastLog("请打开星星球界面");
            launchApp("支付宝");
            waitForActivity("com.alipay.mobile.nebulacore.ui.H5Activity");
            
            var antManor = new AntManor();
            antManor.play();    
        } catch (e) {
            if (e instanceof java.lang.IllegalStateException){
                toastLog("找不到星星球！")
            }
        }
        // 失败了，准备点击重来一局
        for(var i= 0; i < 10; i++){
            log("准备再来一局！")
            var w = desc("再来一局").findOne(2000);
            if(w != null){
                w.click();
                sleep(5000);
                flag = true;
                break;
            }
            flag = false;
        }   
    }
    
    device.cancelKeepingAwake();
    exit();
}

function AntManor() {
    this.colors = [
        "#FF4C4C", //球的红色部分
        "#4E86FF", //球的蓝色部分
    ];
    this.find_time = 5000;
    // this.max_retry_times = 4;

    this.play = function () {
        var len = this.colors.length;
        var wait_time = 100;
        var baseline = device.height * 0.412 | 0;
        var min_height = baseline * 0.55 | 0;
        log("baseline: %d, min_height: %d", baseline, min_height);
        // 发球
        var point = this.findColorPoint(len);
        var x = point.x;
        var y = point.y;
        click(x, y);
        
        while (1) {
            var point = this.findColorPoint(len);
            var x = point.x;
            var y = point.y;
            
            if (min_height <= y && y <= baseline)
                click(x, baseline);
                log("click x:%d, y:%d",x,baseline);
        }

    };

    this.findColorPoint = function (len) {
        var wait_time = 100;
        for (var time = 0;time < this.find_time;time += wait_time) {
            for (var i = 0;i < len;i++) {
                var capture = captureScreen();
                if (!capture) {
                    sleep(50);
                    continue;
                }
                var color = this.colors[i];
                var point = findColorEquals(capture, color, 0, 0, WIDTH, HEIGHT);
                if (point !== null) {
                    return point;
                }
            }
        }

      return null;
    };
}