## 简介：
* 蚂蚁森林自动收取脚本
* 根据 酷安@群主让我注册 脚本修改而来，原下载地址：https://github.com/start201711/autojs?files=1
* 感谢原作者提供的核心算法，感谢Auto.js作者提供的API平台
* 欢迎使用和提交bug反馈

## 设备要求：
1. 免ROOT权限(安卓7.0以上，与Tasker结合使用) 或 ROOT权限(安卓5.0以上，与Edge或Tasker结合使用)
2. 安卓5.0或更高版本(需要开启无障碍服务)
3. Auto.js软件<font color=gold>4.0.1 Beta或更高版本</font>，下载链接 https://www.coolapk.com/apk/org.autojs.autojs

## 使用方法：
1. 将take.png（找图所需，仅适用于1920*1080屏幕。其它机型请自己制作截图，图片应略小于小手范围，10KB以下）、
   config.js（配置文件）、Robot.js（机器人模块）、Secure.js（解锁模块，可选）、蚂蚁森林设置向导.js 与脚本放置于同目录下，一般为`/storage/emulated/0/脚本/`
   
   > Mix2s 可能会需要使用绝对路径才能找到文件
2. 将“蚂蚁森林”按钮设置在支付宝首页，方便查找控件
3. 运行蚂蚁森林设置向导.js，修改个性化配置。支持的解锁方式（仅限类原生及MIUI 9系统，如LineageOS、Mokee）：滑动（5.0+）、PIN码（5.0+）、密码（5.0+）、
   图案（7.0+，将点转换为数字即可，布局参考9宫格数字键盘）
4. 直接在软件里面运行脚本即可，不用手动打开支付宝。建议先手动运行一次，成功之后再配置定时任务
5. 申请截图的权限时，不需要手动点击"立即开始"，脚本会自行点击"立即开始"
6. 脚本运行时，可以按音量上键停止运行
7. 定时任务可以选择Edge pro或Tasker

## Xposed edge pro定时任务（建议）步骤：
1. 添加多重动作，假设脚本命名为蚂蚁森林，路径是`/storage/emulated/0/脚本/蚂蚁森林.js`  
    动作如下：  
    唤醒：可选  
    shell命令：勾选【在系统中运行】，内容参考  
    `am start -n org.autojs.autojs/.external.open.RunIntentActivity -d file:///storage/emulated/0/脚本/蚂蚁森林.js -t text/javascript`
2. 添加定时计划，动作是【保存的多重动作】
3. 若该机型不能正常解锁，可以使用edge录制手势解决，建议多重动作：  
    唤醒  
    延时  
    注入手势  
    延时  
    shell命令
4. 在配置的时间段内定时收自己的能量，当有剩余能量球的时候，脚本会持续点击，默认1分钟后才会停止。安卓6.0系统及更低版本由于点击较慢，可能需要比预期更多时间

## Tasker入门教程
- 参考网友帖子 http://tieba.baidu.com/p/5288908002

## Tasker定时任务（建议）步骤：
1. 新建任务(目的是启动蚂蚁森林脚本)，命名为【蚂蚁森林】。假设脚本路径为file:///storage/emulated/0/脚本/蚂蚁森林.js
2. 依次点击 添加(+)>系统>发送意图，来到操作修改界面
3. 其中，需要填写的选项如下：  
    类别(Category)：`Default`  
    Mime类型(MimeType)：`text/javascript`  
    数据(Data)：`file:///storage/emulated/0/脚本/蚂蚁森林.js`  
    包名(PackageName)：`org.autojs.autojs`  
    类名(ClassName)：`org.autojs.autojs.external.open.RunIntentActivity`
4. 返回到任务界面，点击右上角应用(√)按钮生效
5. 在配置文件栏，新增定时任务。依次点击 添加(+)>时间，来到时间修改界面
6. 选择时间段，结束与开始时间相同
7. 返回到配置文件界面，选择【蚂蚁森林】任务，点击右上角应用(√)按钮生效
> 需要Tasker 5.0或更高版本

## Tasker自动定时启动（建议）步骤：
1. 下载oneTasker.js，假设脚本路径为`file:///storage/emulated/0/脚本/oneTasker.js`
2. 新建任务(目的是启动oneTasker脚本)，命名为【执行一次】
3. 依次点击 添加(+)>代码>JavaScript，来到操作修改界面
4. 其中，需要填写的选项如下：  
    路径：手动选择所在位置，或者直接填写 `脚本/oneTasker.js`  
    自动退出：取消勾选  
    超时：3600
5. 返回到任务界面，点击右上角应用(√)按钮生效
6. 在配置文件栏，新增广播接收事件。依次点击 添加(+)>事件>系统>收到的意图，来到事件修改界面
7. 其中，需要填写的选项如下：  
    动作(Action)：`net.dinglisch.android.tasker.ActionCodes.RUN_SCRIPT`  
    类别(Category)：`Default`  
8. 返回到配置文件界面，选择【执行一次】任务，点击右上角应用(√)按钮生效

## Tasker自动定时启动触发机制：
- 在蚂蚁森林脚本执行结束之后，若有下次可收取时间，且当前时间大于检测能量的最大时间(为了不影响检测能量任务)，将发送一条广播给Tasker，Tasker在收到广播时，启动oneTasker.js，它会启动延时定时器，等到指定时间，执行【蚂蚁森林】任务


## 软件测试结果：
1. 魔趣7.1系统正常，偶尔出现崩溃情况，依赖于Auto.js.apk稳定性
2. Sony D6633 6.0系统打开会出现“系统界面已停止运行”，请不要使用
3. 红米Note 5(MIUI 9/10)系统正常，无ROOT权限
