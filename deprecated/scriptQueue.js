var wait_time = 15000;

const KEY = "SCRIPT_QUEUE_LIST";

function getQueueList() {
    var str = global(KEY);
    var script_queue_list = str ? JSON.parse(str) : [];
    return script_queue_list;
}
function dequeue() {
    var script_queue_list = getQueueList();
    var queue = script_queue_list.shift();
    setGlobal(KEY, JSON.stringify(script_queue_list));
    return queue;
}
while(1) {
    var script_queue_list = getQueueList();
    var queue = dequeue();
    if (queue) {
        var date = new Date();
        var now = date.getTime();
        var timestamp = Date.parse(queue.time);
        var remain_time = timestamp - now;
        remain_time = Math.max(1000, remain_time);
        setTimeout(function (time, name) {
            // 开始执行
            flash("开始执行：" + time + " " + name);
            performTask(name, 5, "", "");
        }, remain_time, queue.time, queue.name);
    }

    wait(wait_time);
}

