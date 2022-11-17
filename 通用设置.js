"ui";
let path = "./config/general.js";
let config = files.isFile(path) ? require(path) : {};
let default_config = {
    password: "", // 锁屏密码
    pattern_size: 3, // 图案解锁每行点数
    max_retry_times: 3, // 最大失败重试次数
};
if (typeof config !== "object") {
    config = {};
}

let options = Object.assign(default_config, config); // 用户配置合并

function showSettings(options) {
    ui.layout(
        <frame>
            <vertical h="auto" align="center" w="auto">
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
                <linear gravity="center">
                    <button id="submit" text="确定" />
                    <button id="reset" text="重置" />
                </linear>
            </vertical>
        </frame>
    );

    let initForm = function () {
        for (let i in options) {
            ui[i].text(options[i] + "");
        }
    };
    initForm();

    ui.submit.click(function () {
        // JSON.stringify(settings)
        let part = [];
        for (let i in options) {
            let line = '"' + i + '":' + ' "' + ui[i].text() + '"';
            part.push(line);
        }

        let format = "{\n    " + part.join(",\n    ") + "\n}";
        let text = "let general = " + format + ";\n\nmodule.exports = general;";
        let file = open(path, "w");

        file.write(text);
        file.close();
        toast("设置成功！文件为" + path);
        ui.finish();
    });

    ui.reset.click(initForm);
}

showSettings(options);