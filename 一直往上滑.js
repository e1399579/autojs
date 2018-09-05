sleep(3000);

var x1, y1, x2, y2;
x1 = x2 = device.width / 2;
y1 = 350;
y2 = device.height - 300;

while (1) {
    var res = className("AbsListView").findOne().scrollBackward();
    if (!res) {
        swipe(x1, y1, x2, y2, 750);
        sleep(750);
    }
}
