var dir = "/storage/emulated/0/脚本/record/friend/";

function KeepTool() {
    this.launch = function () {
        launch("com.google.android.keep");
    };

    this.importText = function (note) {
        id("com.google.android.keep:id/new_note_button").findOne(6000).click();
        
        setText(1, note.content);
        setText(0, note.title);
        
        back();
        back();
    };
}

function TextParser() {
    this.setFile = function (file) {
        this.file = file;
    };

    this.interpret = function () {
        var start = Math.max(0, this.file.lastIndexOf("/") + 1);
        var stop = this.file.lastIndexOf(".txt");
        var title = (-1 === stop) ? this.file.substr(start) : this.file.substring(start, stop);
        var content = files.read(this.file);

        return {
            title: title,
            content: content
        };
    };
}

var keep_tool = new KeepTool();
var parser = new TextParser();
keep_tool.launch();

files.listDir(dir).forEach(function (file) {
    parser.setFile(dir + file);
    var note = parser.interpret();

    if (note) {
        keep_tool.importText(note);
    }
});
