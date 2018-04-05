var config = {
    password: "", // 锁屏密码
    takeImg: "take.png", // 收取好友能量用到的图片
    pattern_size: 3, // 图案解锁每行点数
    max_retry_times: 10, // 最大失败重试次数
    timeout: 12000, // 超时时间：毫秒
    check_self_timeout: 60, // 检测自己能量时间：秒
    max_swipe_times: 100 // 好友列表最多滑动次数
};

module.exports = config;