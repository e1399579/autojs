function OcrTool() {
    this.img = null;

    this.prepare = function() {
        // 请求截图并点击开始
        threads.start(function () {
            let sel = packageName('com.android.systemui').text('立即开始');
            let btn = sel.findOne(3000);
            if (btn) btn.click();
        });
        if (!requestScreenCapture(false)) {
            throw new Error("请求截图失败");
        }
        sleep(500);
    }

    this.captureOrClip = function(rect) {
        toastLog("截图");
        let img = images.captureScreen();
        this.img = rect ? images.clip(img, rect[0], rect[1], rect[2], rect[3]) : img;
    }

    this.findText = function(keywords) {
        toastLog("OCR开始");
        let list = ocr.detect(this.img);
        toastLog("OCR结束");
        this.img.recycle();
        let n = keywords.length;
        let result = [];
        let found = 0;
        for (let obj of list) {
            for (let i = 0;i < n;++i) {
                if (result[i] && (result[i].length > 0)) continue;
                if (obj.label.indexOf(keywords[i]) === -1) {
                    result[i] = [];
                } else {
                    result[i] = [obj.bounds.left, obj.bounds.top];
                    ++found;
                }
            }
            if (found >= n) break;
        }
        return result;
    }
}

module.exports = OcrTool;