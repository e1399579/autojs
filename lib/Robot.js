/**
 * 安卓5机器人
 */
function LollipopRobot(max_retry_times) {
    this.max_retry_times = max_retry_times || 10;

    this.click = function (x, y) {
        return (shell("input tap " + x + " " + y, true).code === 0);
    };

    this.swipe = function (x1, y1, x2, y2, duration) {
        duration = duration || 1000;
        return (shell("input swipe " + x1 + " " + y1 + " " + x2 + " " + y2 + " " + duration, true).code === 0);
    };

    this.clickMultiMeantime = function (points) {};
}

Array.prototype.chunk = function (size) {
    let list = [];
    while (this.length > 0) {
        list.push(this.splice(0, size));
    }
    return list;
};

/**
 * 安卓7+机器人
 */
function GeneralRobot(max_retry_times) {
    this.max_retry_times = max_retry_times || 10;

    this.click = function (x, y) {
        return click(x, y);
    };

    this.swipe = function (x1, y1, x2, y2, duration) {
        duration = duration || 50;
        return swipe(x1, y1, x2, y2, duration);
    };

    this.clickMultiMeantime = function (points) {
        let list = [];
        let duration = 1;
        let max_point = 10; // 最多触摸点数
        points.forEach(function (point) {
            list.push([0, duration, point]);
        });

        // 同时点击多个点
        let chunks = list.chunk(max_point); // 太多点则分成多段
        chunks.forEach(function (chunk) {
            gestures.apply(null, chunk);
        });
    };
}

/**
 * 机器人工厂
 * @param {int} max_retry_times 最大尝试次数
 */
function Robot(max_retry_times) {
    this.robot = (device.sdkInt < 24) ? new LollipopRobot(max_retry_times) : new GeneralRobot(max_retry_times);

    this.click = function (x, y) {
        return this.robot.click(x, y);
    };

    this.clickCenter = function (b) {
        let rect = b.bounds();
        return this.robot.click(rect.centerX(), rect.centerY());
    };

    this.swipe = function (x1, y1, x2, y2, duration) {
        this.robot.swipe(x1, y1, x2, y2, duration);
    };

    this.back = function () {
        back();
    };

    this.kill = function (package_name) {
        shell("am force-stop " + package_name, true);
    };

    this.close = function () {
        recents();
        sleep(1500);
        let x = device.width >> 1;
        let y2 = device.height >> 2;
        let y1 = device.height - y2;
        gesture(200, [x, y1], [x, y2]);
        sleep(800);
        home();
    };

    this.clickMulti = function (points) {
        points.forEach(function (point) {
            this.robot.click(point[0], point[1]);
        }.bind(this));
    };

    this.clickMultiCenter = function (collection) {
        let points = [];
        collection.forEach(function(o) {
            let rect = o.bounds();
            points.push([rect.centerX(), rect.centerY()]);
        });
        this.clickMulti(points);
    };
    
    this.clickMultiMeantime = function (points) {
        return this.robot.clickMultiMeantime(points);
    };
}

module.exports = Robot;