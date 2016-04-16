var Demo = {
    graphWindow: {
        x0: -10,
        y0: -10,
        x1: 10,
        y1: 10
    },
    wsize: 10,
    expr: "(x-1)^2+3",
    playing: true,
    t0: Date.now(),

    init: function() {
        Demo.canvas = document.createElement("canvas");
        Demo.canvas.width = 500;
        Demo.canvas.height = 500;

        //Interactive dragging
        Demo.canvas.addEventListener("mousedown", function(event){
            event.preventDefault();
            Demo.dragging = true;
            Demo.dragX0 = event.pageX;
            Demo.dragY0 = event.pageY;
            Demo.centerX0 = (Demo.graphWindow.x0 + Demo.graphWindow.x1) * 0.5;
            Demo.centerY0 = (Demo.graphWindow.y0 + Demo.graphWindow.y1) * 0.5;
        }, false);
        document.addEventListener("mousemove", function(event){
            if (Demo.dragging) {
                event.preventDefault();
                Demo.screenDirty = true;
                var dragscale = (Demo.graphWindow.y1 - Demo.graphWindow.y0)/Demo.canvas.height;
                var dragx = -(event.pageX - Demo.dragX0)*dragscale;
                var dragy = -(event.pageY - Demo.dragY0)*dragscale;
                var centerX = Demo.centerX0+dragx;
                var centerY = Demo.centerY0+dragy;
                Demo.graphWindow = {
                    x0: centerX - Demo.wsize,
                    y0: centerY - Demo.wsize,
                    x1: centerX + Demo.wsize,
                    y1: centerY + Demo.wsize
                };
            }
        });
        document.addEventListener("mouseup", function(event){
            Demo.dragging = false;
        });
        var scrl = function(event){
            event.preventDefault();
            var delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));
            Demo.wsize = Math.max(0.5,Math.min(100,Demo.wsize-delta));
            Demo.screenDirty = true;
            var centerX = (Demo.graphWindow.x0 + Demo.graphWindow.x1) * 0.5;
            var centerY = (Demo.graphWindow.y0 + Demo.graphWindow.y1) * 0.5;
            Demo.graphWindow = {
                x0: centerX - Demo.wsize,
                y0: centerY - Demo.wsize,
                x1: centerX + Demo.wsize,
                y1: centerY + Demo.wsize
            };
        };
        Demo.canvas.addEventListener("mousewheel", scrl, false);
        Demo.canvas.addEventListener("DOMMouseScroll", scrl, false);

        //controls
        document.getElementById("btnStore").addEventListener("click", function(){
            try {
                Demo.expr = new Expression(document.getElementById("textbox").value);
                Demo.t0 = Date.now();
            }
            catch (e) {
                alert("Error parsing expression:" + e);
            }
        }, false);
        document.getElementById("btnReset").addEventListener("click", function(){
            Demo.graphWindow = {
                x0: -10,
                y0: -10,
                x1: 10,
                y1: 10
            };
            Demo.wsize = 10;
        }, false);
        document.getElementById("btnPlayPause").addEventListener("click", function(event){
            Demo.playing = !Demo.playing;
            this.innerHTML = Demo.playing ? "Stop" : "Play";
            Demo.t0 = Date.now();
        }, false);

        //insert display into document
        document.getElementById("displayarea").appendChild(Demo.canvas);
        Demo.ctx = Demo.canvas.getContext("2d");
        Demo.drawGraph(Demo.expr);

        //screen refresh
        requestAnimationFrame(function step(){
            if (Demo.screenDirty) {
                Demo.drawGraph(Demo.expr.substitute({
                    t: (Date.now()-Demo.t0)/1000
                }));
                Demo.screenDirty = false;
            }
            if (Demo.playing) Demo.screenDirty = true;
            requestAnimationFrame(step);
        });
    },

    drawGraph: function(expr) {
        var w = Demo.canvas.width, h = Demo.canvas.height;
        Demo.ctx.fillStyle = "rgb(245,245,245)";
        Demo.ctx.fillRect(0,0,w,h);

        var xscale = Demo.canvas.width/(Demo.graphWindow.x1-Demo.graphWindow.x0);
        var yscale = Demo.canvas.height/(Demo.graphWindow.y1-Demo.graphWindow.y0);
        var yoffset = -(Demo.graphWindow.y1+Demo.graphWindow.y0)*yscale*0.5;
        var xoffset = -(Demo.graphWindow.x1+Demo.graphWindow.x0)*xscale*0.5;

        //x and y axis
        Demo.ctx.fillStyle = "rgb(165,205,165)";
        Demo.ctx.fillRect(0,Demo.canvas.height*0.5+yoffset,Demo.canvas.width,1);
        Demo.ctx.fillRect(Demo.canvas.width*0.5+xoffset,0,1,Demo.canvas.height);

        if (expr instanceof Expression) {
            Demo.ctx.strokeStyle = "black";
            Demo.ctx.beginPath();
            // Demo.ctx.moveTo(0,0);
            expr.evalInterval(function(i,val,data){
                Demo.ctx.lineTo(Demo.canvas.width*0.5+i*xscale+xoffset,Demo.canvas.height*0.5-val*yscale+yoffset);
            }, "x", Demo.graphWindow.x0, Demo.graphWindow.x1+1, 0.1, {});
            Demo.ctx.stroke();
        }

        //window labels
        Demo.ctx.shadowBlur = 4;
        Demo.ctx.shadowOffsetY = 0;
        Demo.ctx.shadowColor = "white";
        Demo.ctx.fillStyle = "black";
        Demo.ctx.font = "12pt monospace";
        var margin = 4;
        Demo.ctx.textBaseline = "center";
        Demo.ctx.textAlign = "left";
        Demo.ctx.fillText(Demo.graphWindow.x0.toFixed(1), margin, Demo.canvas.height*0.5);
        Demo.ctx.textAlign = "right";
        Demo.ctx.fillText(Demo.graphWindow.x1.toFixed(1), Demo.canvas.width-margin, Demo.canvas.height*0.5);
        Demo.ctx.textAlign = "center";
        Demo.ctx.textBaseline = "top";
        Demo.ctx.fillText((-Demo.graphWindow.y0).toFixed(1), Demo.canvas.width*0.5, margin);
        Demo.ctx.textBaseline = "bottom";
        Demo.ctx.fillText((-Demo.graphWindow.y1).toFixed(1), Demo.canvas.width*0.5, Demo.canvas.height-margin);
        Demo.ctx.shadowBlur = 0;
    }
}

window.addEventListener("load", function(){
    document.getElementById("textbox").value = Demo.expr;
    Demo.expr = new Expression(Demo.expr);
    Demo.init();
}, false);
