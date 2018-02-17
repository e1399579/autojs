/**
 * 安全相关
 * @param {Robot} robot 机器人对象
 * @param {int} max_retry_times 最大尝试次数
 * @author ridersam <e1399579@gmail.com>
 */
function Secure(robot, max_retry_times) {
    this.robot = robot;
    this.max_retry_times = max_retry_times || 10;
    this.km = context.getSystemService(context.KEYGUARD_SERVICE);

    this.hasLayer = function () {
        return id("com.android.systemui:id/preview_container").visibleToUser(true).exists(); // 是否有上滑图层
    };

    this.openLock = function (password, pattern_size) {
        var isLocked = this.km.inKeyguardRestrictedInputMode(); // 是否已经上锁
        var isSecure = this.km.isKeyguardSecure(); // 是否设置了密码
        pattern_size = pattern_size || 3;
        log({
            isLocked: isLocked,
            isSecure: isSecure
        });

        var i = 0;
        while (this.hasLayer()) {
            if (i >= this.max_retry_times) {
                toastLog("打开上滑图层失败");
                return this.failed();
            }
            log("向上滑动");
            this.openLayer();
            i++;
        }

        if (!isLocked) return true;
        log("解锁");
        for (var i = 0; i < this.max_retry_times; i++) {
            if (this.unlock(password, pattern_size)) {
                return true;
            } else {
                toastLog("解锁失败，重试");
            }
        }

        toastLog("解锁失败，不再重试");
        return this.failed();
    };

    this.failed = function () {
        KeyCode("KEYCODE_POWER");
        engines.stopAll();
        exit();
        return false;
    };

    this.openLayer = function () {
        var x = WIDTH / 2;
        var y = HEIGHT - 100;
        this.robot.swipe(x, y, x, 100, 750);
        sleep(1500); // 等待动画
    };

    this.unlock = function (password, pattern_size) {
        var len = password.length;

        if (len < 4) {
            throw new Error("密码至少4位");
        }

        if (id("com.android.systemui:id/lockPatternView").exists()) {
            return this.unlockPattern(password, len, pattern_size);
        } else if (id("com.android.systemui:id/passwordEntry").exists()) {
            return this.unlockPassword(password);
        } else if (id("com.android.systemui:id/pinEntry").exists()) {
            return this.unlockKey(password, len);
        } else {
            toastLog("识别锁定方式失败，型号：" + device.brand + " " + device.product + " " + device.release);
            return this.failed();
        }
    };

    this.unlockKey = function (password, len) {
        for (var j = 0; j < len; j++) {
            var key_id = "com.android.systemui:id/key" + password[j];
            if (!id(key_id).exists()) {
                return false;
            }
            id(key_id).findOne(1000).click();
        }
        if (id("com.android.systemui:id/key_enter").exists()) {
            id("com.android.systemui:id/key_enter").findOne(1000).click();
        }

        return this.checkUnlock();
    };

    this.unlockPattern = function (password, len, pattern_size) {
        var pattern = id("com.android.systemui:id/lockPatternView").findOne(1000);
        var rect = pattern.bounds();
        // 使用坐标查找按键
        var oX = rect.left, oY = rect.top; // 第一个点位置
        var w = (rect.right - rect.left) / pattern_size, h = (rect.bottom - rect.top) / pattern_size; // 2点之单间隔为边框的1/3
        var points = [];

        points[0] = {
            x: 0,
            y: 0
        };
        // 初始化每个点的坐标
        for (var i = 1; i <= pattern_size; i++) {
            for (var j = 1; j <= pattern_size; j++) {
                var row = i - 1;
                var col = j - 1;
                var index = pattern_size * (i - 1) + j; // 序号，从1开始
                points[index] = {
                    x: oX + col * w + w / 2,
                    y: oY + row * h + h / 2
                };
            }
        }

        // 使用手势解锁
        var gestureParam = [100 * len];
        for (var i = 0; i < len; i++) {
            var point = points[password[i]];

            gestureParam.push([point.x, point.y]);
        }
        gestures(gestureParam);

        return this.checkUnlock();
    };

    this.unlockPassword = function (password) {
        if (typeof password !== "string") {
            password = password.join("");
        }
        Text(password); // 输入密码
        KeyCode("KEYCODE_ENTER"); // 按Enter

        sleep(1500);
        return this.checkUnlock();
    };

    this.checkUnlock = function () {
        sleep(1500); // 等待动画
        if (id("android:id/message").textContains("重试").exists()) {
            toastLog("密码错误");
            return this.failed();
        }

        return !this.km.inKeyguardRestrictedInputMode();
    };
}

module.exports = Secure;