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

do {
    idMatches(regexp).find().forEach(function (o) {
        var text = o.text(); // 内容
        var text_id = o.id();
        
        if (text_id === content_id) {
            var parent_ele = o.parent();
            // 3个元素则含时间元素
            var position = (parent_ele.childCount() > 2) ? 1 : 0;

            // 头像在左边是他人
            var talk_text = 
                (parent_ele.child(position).id() === "com.tencent.tim:id/chat_item_head_icon")
                ? "OTHER:" : "I:";
            initRecord(record_mixed, current_date);
            record_mixed[current_date].push(talk_text + text);

            if (talk_text === "OTHER:") {
                initRecord(record_other, current_date);
                record_other[current_date].push(text);
            } else {
                initRecord(record_i, current_date);
                record_i[current_date].push(text);
            }
        } else if (text_id === timestamp_id) {
            var arr = text.split(" ");
            var date = arr[0];
            var time = arr[1];

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
} while(className("AbsListView").findOne().scrollForward());

// log(record_mixed);
// log(record_i);
// log(record_other);

function saveToFile(record, prefix) {
    for (let key in record) {
        var path = prefix + key + ".txt";
        files.write(path, record[key].join("\r\n"));
    }
}

// saveToFile(record_mixed, "mixed_");
// saveToFile(record_i, "i_");
saveToFile(record_other, "other_");

