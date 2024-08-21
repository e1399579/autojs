function OcrTool() {
    this.img = null;
    this.offset = [0, 0];

    this.prepare = function(landscape) {
        // 请求截图并点击开始
        threads.start(function () {
            let sel = packageName('com.android.systemui').text('立即开始');
            let btn = sel.findOne(3000);
            if (btn) btn.click();
        });
        if (!requestScreenCapture(landscape)) {
            throw new Error("请求截图失败");
        }
        sleep(500);
    }

    this.capture = function() {
        log("截图");
        this.offset = [0, 0];
        this.img = images.captureScreen();
        return this.img;
    };

    this.clip = function(rect) {
        log("裁剪");
        this.offset = [rect[0], rect[1]];
        return images.clip(this.img, rect[0], rect[1], rect[2], rect[3]);
    };

    this.captureAndClip = function(rect) {
        this.capture();
        return this.clip(rect);
    };

    this.setOffset = function(x, y) {
        this.offset = [x, y];
    };

    this.getOffset = function() {
        return this.offset;
    };

    this.findText = function(img, keywords, recycle) {
        let list = ocr.detect(img);
        if (recycle) img.recycle();
        let n = keywords.length;
        let result = [];
        let found = 0;
        for (let obj of list) {
            for (let i = 0;i < n;++i) {
                if (result[i] && (result[i].length > 0)) continue;
                if (obj.label.indexOf(keywords[i]) === -1) {
                    result[i] = [];
                } else {
                    result[i] = [obj.bounds.left + this.offset[0], obj.bounds.top + this.offset[1]];
                    ++found;
                }
            }
            if (found >= n) break;
        }
        return result;
    }
}

module.exports = OcrTool;