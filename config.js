var config = {
	password: [1, 2, 3, 4], // 锁屏密码
    takeImg: files.cwd() + "/take.png", // 收取好友能量用到的图片
    pattern_size: 3, // 图案解锁每行点数
    max_retry_times: 10, // 最大失败重试次数
    timeout: 6000 // 超时时间：毫秒
};

module.exports = config;