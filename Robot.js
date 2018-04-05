/**
 * 安卓5机器人
 * @constructor
 */
function LollipopRobot(max_retry_times) {
    this.robot = new RootAutomator();
    this.max_retry_times = max_retry_times || 10;

    this.click = function (x, y) {
        Tap(x, y);
        sleep(100);
        return true;
    };

    this.swipe = function (x1, y1, x2, y2, duration) {
        duration = duration || 50;
        var metrics = duration > 500 ? 1 : 6.5;
        var distance = y1 - y2;
        var centerY = (y1 - distance / 2) | 0;
        var new_distance = (distance / metrics) | 0;
        var new_y1 = centerY + new_distance / 2;
        var new_y2 = centerY - new_distance / 2;
        Swipe(x1, new_y1, x2, new_y2, duration);
        // 滑动之后有动画
        sleep(1200);
        return true;
    };
}

/**
 * 安卓7机器人
 * @constructor
 */
function NougatRobot(max_retry_times) {
    this.max_retry_times = max_retry_times || 10;

    this.click = function (x, y) {
        return click(x, y);
    };

    this.swipe = function (x1, y1, x2, y2, duration) {
        duration = duration || 50;
        return swipe(x1, y1, x2, y2, duration);
    };
}

/**
 * 机器人工厂
 * @param {int} max_retry_times 最大尝试次数
 * @author ridersam <e1399579@gmail.com>
 */
function Robot(max_retry_times) {
    this.robot = (device.sdkInt < 24) ? new LollipopRobot(max_retry_times) : new NougatRobot(max_retry_times);

    this.click = function (x, y) {
        return this.robot.click(x, y);
    };

    this.clickCenter = function (b) {
        var rect = b.bounds();
        return this.click(rect.centerX(), rect.centerY());
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

module.exports = Robot;