class CanvasElement {
    constructor(x, y, height, width, imageSource, alt) {
        this.img = new Image();
        this.img.src = imageSource;
        this.img.alt = alt;
        this.x = x;
        this.y = y;

        this.height = height;
        this.width = width;
        this.maxHeight = height;
        this.maxWidth = width;

        this.goTo = [x, y];
        this.goal = null;
        this.path = [];
        this.nextLoc = null;
    }

    update() {
        var xDist = Math.abs(this.goTo[0] - this.x);
        var yDist = Math.abs(this.goTo[1] - this.y);
        var xIncr = 10;
        var yIncr = 10;

        if (xDist > yDist) {
            yIncr *= yDist / xDist;
        } else {
            xIncr *= xDist / yDist;
        }

        if (this.x < this.goTo[0]) {
            this.x += xIncr;
        }
        if (this.x > this.goTo[0]) {
            this.x -= xIncr;
        }
        if (this.y > this.goTo[1]) {
            this.y -= yIncr;
        }
        if (this.y < this.goTo[1]) {
            this.y += yIncr;
        }

        if (this.height < this.maxHeight) this.height += 1;
        if (this.width < this.maxWidth) this.width += 1;
        if (this.height > this.maxHeight) this.height -= 1;
        if (this.width > this.maxWidth) this.width -= 1;
    }

    setLocation(location) {
        this.x = location.x;
        this.y = location.y;
        this.location = location;
    }

    setGoal(location) {
        this.goal = location;
    }

    isAtGoal() {
        if (this.goal == null) return false;
        if (Math.abs(this.x - this.goal.x) < 10 &&
            Math.abs(this.y - this.goal.y) < 10) return true;
        return false;
    }
}