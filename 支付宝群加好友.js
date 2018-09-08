auto();

var max_friend_num = 30; // 最多加好友人数
var max_swipe_num = 20; // 最大滑动次数
var wait_second = 3; // 界面等待时间：s

toastLog("请打开群聊成员界面");
waitForActivity("com.alipay.mobile.chatapp.ui.GroupContactListActivity_");
toastLog("你有" + wait_second + "s时间滑动界面");
sleep(wait_second * 1000);

multiScreenAdd(max_swipe_num, max_friend_num);
function multiScreenAdd(max_swipe_num, max_friend_num) {
    var total = 0;
    var swipe_num = 0;
    for (var i = 0;i < max_swipe_num;i++) {
        if (total > max_friend_num) break;
        if (swipe_num > max_swipe_num) break;

        total += oneScreenAdd();
        swipe(540, 1700, 540, 0, 50);
        sleep(3000);
        swipe_num++;
    }
}

function oneScreenAdd() {
    var total;
    id("com.alipay.mobile.chatapp:id/grid_item_root").find().forEach(function (o) {
        o.click();
        sleep(1500);
    
        var friend;
        if (friend = text("加好友").findOnce()) {
            friend.click();
            sleep(2000);

            if (text("发消息").exists()) {
                total++;
                toastLog("加好友成功");
            } else if (text("朋友验证").exists()) {
                back();
                sleep(1500);
                back();
                sleep(1500);
            }
        }
        back();
        sleep(1500);
    });

    return total;
}

exit();
