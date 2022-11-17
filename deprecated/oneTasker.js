if (!(time && name)) {
    flash("测试");
    wait(3000);
    exit();
}

var date = new Date();
var now = date.getTime();
var timestamp = Date.parse(time);
var remain_time = timestamp - now;
remain_time = Math.max(1000, remain_time);

setTimeout(function (time, name) {
    // 开始执行
    flash("开始执行：" + time + " " + name);
    performTask(name, 5, "", "");
    exit();
}, remain_time, time, name);


