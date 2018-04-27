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

    toastLog("请打开星星球界面");
    waitForActivity("com.alipay.mobile.nebulacore.ui.H5Activity");

    var antManor = new AntManor();

    antManor.play();

    exit();
}

function AntManor() {
    this.colors = [
        "#4E86FF",
        "#FF4C4C",
    ];
    this.max_retry_times = 10;

    this.play = function () {
        var len = this.colors.length;
        var wait_time = 100;
        while (1) {
            var points = this.untilFindColorPoint(len);
            gestures.apply(null, points);

            sleep(wait_time);
        }
    };

    this.untilFindColorPoint = function (len) {
        var points = [];
        for (var i = 0;i < this.max_retry_times;i++) {
            points = this.findColorPoint(len);
            if (points.length) break;
        }
        return points;
    };

    this.findColorPoint = function (len) {
        var points = [];
        var during = 65;
        var capture = captureScreen();
        if (!capture) {
            sleep(50);
            return points;
        }
        for (var i = 0;i < len;i++) {
            var color = this.colors[i];
            var point = findColorEquals(capture, color, 0, 0, WIDTH, HEIGHT);
            if (point !== null) {
                points.push([0, during, [point.x, point.y]]);
            }
        }

        return points;
    };
}