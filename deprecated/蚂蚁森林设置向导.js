"ui";
var config = files.isFile("config.js") ? require("config.js") : {};
var default_config = {
    password: "", // 锁屏密码
    takeImg: "take.png", // 收取好友能量用到的图片
    pattern_size: 3, // 图案解锁每行点数
    max_retry_times: 10, // 最大失败重试次数
    timeout: 12000, // 超时时间：毫秒
    min_time: "7:14:00", // 检测时段
    max_time: "7:15:50",
    max_swipe_times: 100, // 好友列表最多滑动次数
    check_within_time: 5, // 排行反复检测5分钟以内
    help_img: "" // 帮TA收取用到的图片
};
if (typeof config !== "object") {
    config = {};
}

var options = Object.assign(default_config, config); // 用户配置合并
delete options["check_self_timeout"];

function showSettings(options) {
    ui.layout(
        <frame>
            <vertical h="auto" align="center" w="auto">
                <linear>
                    <text w="96" h="*" gravity="right|center" size="16">收取图片路径</text>
                    <input id="takeImg" w="150" h="40" />
                </linear>
                <linear>
                    <text w="96" h="*" gravity="right|center" size="16">爱心图片路径</text>
                    <input id="help_img" w="150" h="40" />
                </linear>
                <linear>
                    <text w="96" h="*" gravity="right|center" size="16">锁屏密码</text>
                    <input id="password" w="150" h="40" />
                </linear>
                <linear>
                    <text w="96" h="*" gravity="right|center" size="16">图案格数</text>
                    <input id="pattern_size" w="150" h="40" />
                </linear>
                <linear>
                    <text w="96" h="*" gravity="right|center" size="16">失败最多重试</text>
                    <input id="max_retry_times" w="150" h="40" />
                    <text w="*" h="*" gravity="left|center" size="16">次</text>
                </linear>
                <linear>
                    <text w="96" h="*" gravity="right|center" size="16">查找控件超时</text>
                    <input id="timeout" w="150" h="40" />
                    <text w="*" h="*" gravity="left|center" size="16">毫秒</text>
                </linear>
                <linear>
                    <text w="96" h="*" gravity="right|center" size="16">自己的能量从</text>
                    <input id="min_time" w="75" h="40" />
                    <text> - </text>
                    <input id="max_time" w="75" h="40" />
                    <text w="*" h="*" gravity="left|center" size="16">执行检测</text>
                </linear>
                <linear>
                    <text w="96" h="*" gravity="right|center" size="16">排行最多滑动</text>
                    <input id="max_swipe_times" w="150" h="40" />
                    <text w="*" h="*" gravity="left|center" size="16">次</text>
                </linear>
                <linear>
                    <text w="96" h="*" gravity="right|center" size="16">排行反复检测</text>
                    <input id="check_within_time" w="150" h="40" />
                    <text w="*" h="*" gravity="left|center" size="16">分钟以内能量</text>
                </linear>
                <linear gravity="center">
                    <button id="submit" text="确定" />
                    <button id="reset" text="重置" />
                </linear>
            </vertical>
        </frame>
    );

    var initForm = function () {
        for (var i in options) {
            ui[i].text(options[i] + "");
        }
    };
    initForm();

    ui.submit.click(function () {
        // JSON.stringify(settings)
        var part = [];
        for (var i in options) {
            var line = '"' + i + '":' + ' "' + ui[i].text() + '"';
            part.push(line);
        }

        var format = "{\n    " + part.join(",\n    ") + "\n}";
        var text = "var config = " + format + ";\n\nmodule.exports = config;";
        var path = "config.js";
        var file = open(path, "w");

        file.write(text);
        file.close();
        toast("设置成功！文件为" + path);
        ui.finish();
    });

    ui.reset.click(initForm);
}

showSettings(options);