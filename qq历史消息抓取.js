auto();

launch("com.tencent.tim");
waitForActivity("com.tencent.mobileqq.activity.ChatHistoryForC2C");
var content_id = "com\.tencent\.tim:id\/chat_item_content_layout";
var timestamp_id = "com\.tencent\.tim:id\/chat_item_time_stamp";
var regexp = "(" + content_id + "|" + timestamp_id + ")";
var record_mixed = {};
var record_other = {};
var record_i = {};
var current_date = "default";

function initRecord(record, key) {
    if (!record.hasOwnProperty(key)) {
        record[key] = [];
    }
}

var list_view = className("AbsListView").findOne();
var unique_map = [];
do {
    idMatches(regexp).find().forEach(function (o) {
        var text = o.text(); // 内容
        var text_id = o.id();

        // 使用横坐标(left,right)+内容去重
        var rect = o.bounds();
        var unique_key = rect.centerX() + text;
        if (-1 === unique_map.indexOf(unique_key)) {
            unique_map.push(unique_key);
        } else {
            return;
        }
        
        if (text_id === content_id) {
            var parent_ele = o.parent();
            // 3个元素则含时间元素
            var position = (parent_ele.childCount() > 2) ? 1 : 0;
    
            // 头像在左边是他人
            var talk_text = 
                (parent_ele.child(position).id() === "com.tencent.tim:id/chat_item_head_icon")
                ? "F:" : "I:";
            initRecord(record_mixed, current_date);
            record_mixed[current_date].push(talk_text + text);
    
            if (talk_text === "F:") {
                initRecord(record_other, current_date);
                record_other[current_date].push(text);
            } else {
                initRecord(record_i, current_date);
                record_i[current_date].push(text);
            }
        } else if (text_id === timestamp_id) {
            var arr = text.split(" ");
            if (arr.length > 1) {
                var date = arr[0];
                var time = arr[1];    
            } else {
                var now = new Date();
                var date = (now.getMonth() + 1) + '-' + now.getDate();
                var time = arr[0];
            }
            
            if (date !== current_date) {
                current_date = date;
                initRecord(record_mixed, current_date);
                initRecord(record_other, current_date);
                initRecord(record_i, current_date);
            }
    
            record_mixed[current_date].push(time);
            record_other[current_date].push(time);
            record_i[current_date].push(time);
        }
    });
    sleep(750);
} while(list_view.scrollForward());

// log(record_mixed);
// log(record_i);
// log(record_other);

function saveToFile(record, prefix) {
    for (let key in record) {
        var path = prefix + key + ".txt";
        files.create(path);
        files.write(path, record[key].join("\r\n"));
    }
}

//saveToFile(record_mixed, "record/mixed_");
//saveToFile(record_i, "record/i_");
saveToFile(record_other, "record/firend_");

