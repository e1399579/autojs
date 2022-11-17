function WidgetAutomator(robot) {
    this.robot = robot;

    this.launchLikeName = function (name, wait) {
        home();
        sleep(500);
        textContains(name).findOnce().click();
        sleep(wait);
    };

    this.clickCenterText = function (_text) {
        this.robot.clickCenter(text(_text).findOnce());
    };

    this.clickCenterId = function (_id) {
        this.robot.clickCenter(id(_id).findOnce());
    };

    this.clickCenterClass = function (_class) {
        this.robot.clickCenter(className(_class).findOnce());
    };

    this.clickCenterDesc = function (_desc) {
        this.robot.clickCenter(desc(_desc).findOnce());
    };

    // -------------------------------
    this.clickText = function (_text) {
        text(_text).findOnce().click();
    };

    this.clickId = function (_id) {
        id(_id).findOnce().click();
    };

    this.clickClass = function (_class) {
        className(_class).findOnce().click();
    };

    this.clickDesc = function (_desc) {
        desc(_desc).findOnce().click();
    };
}

module.exports = WidgetAutomator;