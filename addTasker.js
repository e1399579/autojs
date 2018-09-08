const KEY = "SCRIPT_QUEUE_LIST";

if (!(time && name)) {
    flash("测试");
    wait(3000);
    exit();
}

var str = global(KEY);
var queue = {
    name: name,
    time: time
};
var index = str.lastIndexOf(JSON.stringify(queue));
if (-1 === index) {
    var script_queue_list = str ? JSON.parse(str) : [];
    script_queue_list.push(queue);
    setGlobal(KEY, JSON.stringify(script_queue_list));
    flash("任务已添加：" + time);
} else {
    flash("任务已存在：" + time);
}
exit();
