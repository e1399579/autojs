## 简介
* 一些实用脚本

## 设备要求
1. 原生/类原生系统，Android 9.0+（需要开启无障碍服务）
2. 安装 [AutoJs6 by SuperMonster003](https://github.com/SuperMonster003/AutoJs6/releases)
3. 安装 Tasker 5.0+（可选）

## 目录结构
```
├─config        配置文件目录
├─deprecated    已废弃脚本
└─lib           库
...             中文名的脚本，可直接运行
```

## 使用说明

### 通用设置
* 用途：设置锁屏密码
* 配置密码（没有则忽略）
    * 图案方式，对应连接圆点的数字，圆点顺序从左至右，3格时为`1~9`，4格时为`1~16`
    * PIN码/密码，直接填写

### 解锁
* 用途：解锁屏幕
* 加载到其他脚本运行。也可单独使用，一般不用管


### 支付宝签到
* 用途：支付宝每日签到领积分
* 要求：主页有支付宝图标

### 京东签到
* 用途：京东每日签到领京豆
* 要求：主页有京东图标

### Tasker定时任务
* 直接导入`Tasker.xml`，然后根据需求修改时间、脚本路径等

## 相关链接
[AutoJs6 应用文档](https://docs.autojs6.com/) by [SuperMonster003](https://github.com/SuperMonster003)

[AutoJs6 VSCode插件](http://vscext-project.autojs6.com) by [SuperMonster003](https://github.com/SuperMonster003)

[蚂蚁森林脚本](https://github.com/SuperMonster003/Ant-Forest) by [SuperMonster003](https://github.com/SuperMonster003)

[每日签到脚本](https://github.com/Sitoi/dailycheckin) by [Sitoi](https://github.com/Sitoi/)