//author Matias Nieminen, matiasnie2@gmail.com    
//version 10 June 2021

//get important elements from DOM
const quizWrapper = document.getElementById("quizWrapper");
const displayImage = document.getElementById("displayImage");
const startButton = document.getElementById("startButton");
const questionDiv = document.getElementById("question");
const timeBar = document.getElementById("timer");
const timeIncrement = document.getElementById("timeIncrementBar");
const progressBar = document.getElementById("progressBar");
const topNav = document.getElementById("topNav");
const quizMain = document.getElementById("quizMain");
const choices = document.getElementById("choices");
const overlay = document.getElementById("overlayWrap");
const performance = document.getElementById("performance");
const performanceIcon = document.getElementById("performanceIcon");
const mapImage = document.getElementById("mapDiv");
const c = document.getElementById("mapImage");
const correctText = document.getElementById("correctText");
const correctTextW = document.getElementById("correctTextWrap");
const textWindowC = document.getElementById("textWindowContentDiv");


//variables
var activeQuestion = 0;
//Timelimit for individual questions
let timeLimit = 20;
//Timers will be stored here, all timers can then be shutdown via for loop
let TIMER = [];
//question number
let count = 0;
let correctAnswers = 0;
//variable for a timer that updates map, essentially fps will be determined by this timer-to-be
let mapUpdateTimer;
//Debugging help, shows path recognized by bellmanford algorithm for pathfinging
let showPath = false;
//character offset on map
let ukkeliOffset = 250;
let currentLang = "fi";
let delay = false;

let questions;
let dictionary;

//load questions and other text
loadDictionary();
loadQuestions();

//tracking if the current question was already answered incorrectly
let answered = false;

let INTRO_TEXT = "Tervetuloa JYYn supermini-infopläjäys-peliin! Pelaat aloittelevana fuksipallerona läpi tyypillisen opiskelijan päivän, jossa kohtaat jos jonkinlaisia kysymysmerkkejä! Onnea matkaan!";

//variables for tracking game state
let gameOn = false
let grid = []

//canvas
const canvas = document.querySelector('canvas');
const ctx = c.getContext("2d");

//eventlisteners for mouse on the map
c.addEventListener('mousedown', function (e) {
    getCursorPosition(c, e)
})

//clickHere refers to the red X on the map, clickHereSize() changes the X's size according to mouse position
c.addEventListener('mousemove', function (e) {
    clickHereSize(c, e);
})


//player class
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

    //Updates (increments) items position on the map
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

    //sets items position on the map
    setLocation(location) {
        this.x = location.x;
        this.y = location.y;
        this.location = location;
    }

    //All items have a goal location to which they are moved towards by callling the update() function repeatedly
    setGoal(location) {
        this.goal = location;
    }

    //Determines if this item has reached its goal on the map
    isAtGoal() {
        if (this.goal == null) return false;
        if (Math.abs(this.x - this.goal.x) < 10 &&
            Math.abs(this.y - this.goal.y) < 10) return true;
        return false;
    }
}

//canvas
let size = 20;
let canvasPlayer = new CanvasElement(313, 43, size * 8, size * 17, "img/ukkeli.png", "An image of a stickman, representing the player.");
let clickHere = new CanvasElement(100, 100, 150, 150, "img/redx.png", "A red cross, representing the next location to be travelled to.");


//Class for different map locations
class Location {
    constructor(x, y, id, questions) {
        this.x = x;
        this.y = y;
        this.id = id;
        this.neighbours = [];

        //Bellman and ford algorithm variables
        this.initBellmanFord();
        this.img = null;

        //questions
        this.questions = questions;
    }

    //each location has its own image displayed on screen. That image is gotten from the location object (this).
    setImage(img) {
        this.img = img;
    }


    //Returns the neighbour (location) that is closest to the x and y coordinates via straight line distance
    closestNeighbour(location) {
        let x, y;
        x = location.x;
        y = location.y;
        let closestDistance = Number.MAX_SAFE_INTEGER;
        let closestNeighbour = null;
        let neighbour;
        let a, b, c;

        for (i = 0; i < this.neighbours.length; i++) {
            neighbour = this.neighbours[i];
            a = neighbour.x - x;
            b = neighbour.y - y;
            c = Math.hypot(a, b);

            if (c < closestDistance) {
                closestDistance = c;
                closestNeighbour = neighbour;
            }
        }

        // //console.log("closest neighbour is " + closestNeighbour.id);
        return closestNeighbour;
    }

    //Adds a neighbour for this location (Connected graph element -> https://mathworld.wolfram.com/ConnectedGraph.html)
    addNeighbour(locationId) {
        //check that the location isnt already added
        for (let i = 0; i < this.neighbours.length; i++) {
            if (locationId == this.neighbours[i].id) return;
        }

        //set the actual location object to a variable
        let location;
        for (let j = 0; j < locations.length; j++) {
            if (locations[j].id == locationId) location = locations[j];
        }
        
        //Set neighbours both ways
        this.neighbours.push(location);
        location.neighbours.push(this);

        //add a new grid items specifying the new neighbours and distance (cost) between them
        grid.push({
            start: this,
            end: location,
            cost: distance(location.x, location.y, this.x, this.y)
        });
        grid.push({
            start: location,
            end: this,
            cost: distance(location.x, location.y, this.x, this.y)
        });
    }

    //Draws line to neighbours
    drawPaths() {
        for (let i = 0; i < this.neighbours.length; i++) {
            ctx.beginPath();
            ctx.moveTo(this.x + 30, this.y + 30);
            ctx.lineTo(this.neighbours[i].x + 30, this.neighbours[i].y + 30);
            ctx.strokeStyle = "red";
            ctx.stroke();
        }
    }

    drawImage() {
        ctx.drawImage(this.img, this.x, this.y, 50, 50);
    }

    //Initializes bellmanford algorithm by setting the shortest path to infinity and latestVertex to null
    initBellmanFord() {
        this.shortestPath = Infinity;
        this.latestVertex = null;
    }

}

//Switches language
function changeLanguage() {
    if (currentLang == "fi") {
        currentLang = "en";
        loadQuestions();
        loadDictionary();
        //console.log(dictionary.start + "changed lang to en");
    } else {
        currentLang = "fi";
        loadQuestions();
        loadDictionary();
        //console.log(dictionary.start + "currentlang == en");

    }
    loadIntroSlides();

    //Delay has been implemented due to some <p>'s not changing unless there is a 500ms delay. Compromise.
    if (delay == false) {
        delay == true;
        setTimeout(() => {
            document.getElementById("startGameButton").innerHTML = dictionary.start;
            document.getElementById("changeLanguageButton").innerHTML = dictionary.changeLanguage;
            document.getElementById("nextQuestionText").innerHTML = dictionary.nextQuestion;
        }, 500);
    } else {
        document.getElementById("startGameButton").innerHTML = dictionary.start;
        document.getElementById("changeLanguageButton").innerHTML = dictionary.changeLanguage;
        document.getElementById("nextQuestionText").innerHTML = dictionary.nextQuestion;
    }

}

//Loads text from a json file to be displayed on screen later
function loadDictionary() {
    if (currentLang == "fi") {
        $.getJSON("textFI.json", function (data) {
            dictionary = data;
        });
    } else {
        $.getJSON("textEN.json", function (data) {
            dictionary = data;
        });
    }

}


//Simple distance between two coordinates
function distance(x1, y1, x2, y2) {
    var a = x1 - x2;
    var b = y1 - y2;

    return Math.sqrt(a * a + b * b);
}


//create locations for bellmanford algorithm
let locations = [
    new Location(1856, 1435, "startti"),
    new Location(1533, 849, "harjun rinne"),
    new Location(1691, 633, "kellotorni"),
    new Location(1683, 1194, "kaupungintalo", [10, 11, 12]), //+[13, 14]
    new Location(1331, 1497, "risteys"),
    new Location(1022, 1626, "polku alas 1"),
    new Location(792, 1677, "polku alas 2"),
    new Location(526, 1914, "polku alas 3"),
    new Location(382, 2079, "polku alas 4"),
    new Location(123, 2151, "polku alas 5"),
    new Location(94, 2461, "agora takapiha"),
    new Location(547, 2576, "mattilanniemi"),
    new Location(1252, 1274, "polku ylös 1"),
    new Location(1202, 1022, "polku ylös 2"),
    new Location(864, 914, "polku ylös 2.5"),
    new Location(821, 65, "tuomionjärvi"),
    new Location(511, 849, "polku ylös 3"),
    new Location(252, 734, "ylioppilaskylä", [0, 1, 2, 3, 4]),
    new Location(-7, 986, "polku ylös 4"),
    new Location(986, 2569, "ylistön silta"),
    new Location(1245, 2756, "ylistön piha"),
    new Location(1597, 2698, "ylistönrinne", [5, 6, 7]),
    new Location(734, 2094, "ruusupuiston piha"),
    new Location(1022, 2101, "ruusupuisto"),
    new Location(533, 1583, "seminaarinmäki", [8, 9]),
    new Location(353, 1396, "lasitalo")
]

//Debugging help, not visible
let testimage = new Image();
testimage.src = "img/redlight.png";
locations.forEach(loc => loc.setImage(testimage));


//Initialize the players location on the map
canvasPlayer.setLocation(locations[17]);
canvasPlayer.goTo = [canvasPlayer.location.x, canvasPlayer.location.y];

//Connecting the locations for bellmanford algorithm
addNeighbours("startti", "risteys");
addNeighbours("kaupungintalo", "risteys");
addNeighbours("startti", "kaupungintalo");
addNeighbours("risteys", "polku ylös 1");
addNeighbours("risteys", "polku alas 1");
addNeighbours("polku alas 2", "polku alas 1");
addNeighbours("polku alas 2", "polku alas 3");
addNeighbours("polku alas 2", "seminaarinmäki");
addNeighbours("lasitalo", "seminaarinmäki");
addNeighbours("polku alas 2", "polku alas 4");
addNeighbours("polku alas 5", "polku alas 4");
addNeighbours("ruusupuiston piha", "polku alas 4");
addNeighbours("ruusupuiston piha", "polku alas 3");
addNeighbours("ruusupuiston piha", "ruusupuisto");
addNeighbours("polku alas 5", "agora takapiha");
addNeighbours("mattilanniemi", "agora takapiha");
addNeighbours("mattilanniemi", "ylistön silta");
addNeighbours("ylistönrinne", "ylistön silta");
addNeighbours("ylistön piha", "ylistön silta");
addNeighbours("ylistönrinne", "ylistön piha");

addNeighbours("polku ylös 2", "polku ylös 1");
addNeighbours("polku ylös 2", "harjun rinne");
addNeighbours("kellotorni", "harjun rinne");
addNeighbours("polku ylös 2", "polku ylös 2.5");
addNeighbours("polku ylös 3", "polku ylös 2.5");
addNeighbours("tuomionjärvi", "polku ylös 2.5");
addNeighbours("polku ylös 3", "polku ylös 4");
addNeighbours("polku ylös 3", "ylioppilaskylä");
addNeighbours("polku ylös 4", "ylioppilaskylä");

//Debugging help, draws path between neighbours
ctx.strokeStyle = '#ff0000';
ctx.beginPath();
ctx.moveTo(0, 0);
ctx.lineTo(100, 100);
ctx.stroke();


//images
const worst = new Image();
const bad = new Image();
const average = new Image();
const good = new Image();
const best = new Image();
const player = new Image();
player.src = "img/nolight.png";
worst.src = "img/1.png";
bad.src = "img/2.png";
average.src = "img/3.png"
good.src = "img/4.png"
best.src = "img/5.png"

//audio
switchBool = false;
correctCue = [new Audio("audio/correct_bloop.mp3"), new Audio("audio/correct_bloop.mp3")];
wrongCue = [new Audio("audio/wrong_bloop.mp3"), new Audio("audio/wrong_bloop.mp3")];
happyCue = new Audio("audio/happy_bloop.mp3");

let introSlides;
let introSlide = 0;

//Loads question texts from json
function loadQuestions() {
    if (currentLang == "fi") {
        $.getJSON("questionsFI.json", function (data) {
            questions = data;
            //console.log("getting finnish json")
        });
    } else {
        $.getJSON("questionsEN.json", function (data) {
            questions = data;
            //console.log("getting englihs json")

        });
    }
}

//Loads introslide texts from the active dictionary
function loadIntroSlides() {
    introSlides = [{
        h: dictionary.welcome,
        t: dictionary.welcomeText,
        img: ""
    }, {
        h: dictionary.map,
        t: dictionary.mapText,
        img: "img/mapExample.jpg"
    }]
}

//Launches the intro to the game
function intro() {
    setTimeout(() => {
        quizMain.style.height = "80vh";
    }, 1000);
    document.getElementById("nextSlideButton").innerHTML = dictionary.next;
    loadDictionary();
    loadIntroSlides();
    loadQuestions();
    new Audio("audio/happy_bloop.mp3").play();
    hideQuiz();
    showTextWindow(dictionary.welcomeText, dictionary.welcome);
}

//displayes the next slide on the intro screen
function nextIntroSlide() {
    introSlide++;
    let img = document.getElementById("mapExampleImage");
    
    if (introSlide > introSlides.length) return;

    //Slides over, start quiz
    if (introSlide == introSlides.length) {
        happyCue.play();
        hideTextWindow();
        start();
        setTimeout(() => {
            img.style.display = "none";
            showQuiz();
        }, 700);
        return;
    }
    new Audio("audio/click.mp3").play();

    let header = document.getElementById("textWindowHeader");
    let text = document.getElementById("textWindowText");
    textWindowC.style.opacity = "0";
    setTimeout(() => {
        //Last slide
        if (introSlide == introSlides.length - 1) {
            document.getElementById("nextSlideButton").innerHTML = dictionary.start;
        }

        //Slide features image
        if (introSlides[introSlide].img !== "") {
            img.style.display = "block";
            // img.src = introSlides[introSlide].img;
            img.src = "img/mapex.jpg";
            img.alt = "An example of the map, player and next destination."
        }
        header.innerHTML = introSlides[introSlide].h;
        text.innerHTML = introSlides[introSlide].t;
    }, 300);
    setTimeout(() => {
        textWindowC.style.opacity = "1";
    }, 400);
}


//starts the quiz, sets relevant elements opacity to 1
function start() {
    quizMain.style.height = "80vh";
    gameOn = true;
    renderQuestion();
    renderProgress();
    //Hiding current elements
    quizWrapper.style.opacity = "0";
    startButton.style.cursor = "default";

    setTimeout(() => {
        //Displaying elements
        startButton.style.display = "none";
        questionDiv.style.display = "block";
        // timeBar.style.display = "block"; TIMER NOT IN USE
        progressBar.style.display = "block";
        displayImage.style.display = "block";

        //Fading divs in
        choices.style.display = "block";
        quizMain.style.opacity = "1";
        timeBar.style.opacity = "1";
        progressBar.style.opacity = "1";
        questionDiv.style.opacity = "1";
        quizWrapper.style.opacity = "1";
        startTimer();
    }, 1000);
}


//Renders a question based on active question
function renderQuestion() {
    //out of questions to render
    if (activeQuestion > questions.length - 1) {
        stopTimer();
        credits();
        return true;
    }

    questionDiv.innerHTML = "";
    q = questions[activeQuestion];
    //q.q is the text of the question, 'question text of the question object'
    questionDiv.innerHTML = "<p>" + q.q + "</p>";
    displayImage.src = q.lImgSrc;
    displayImage.alt = q.alt;

    //Timeouts are for animations to play through before displaying new elements
    setTimeout(function () {
        displayImage.src = q.imgSrc;
    }, 500);

    //Spawn answer choices
    for (i = 0; i < q.ans.length; i++) {
        questionDiv.innerHTML += "<div onclick='answer(" + i + ")' class='choice'><a>" + q.ans[i] + "</a></div>";
    }
    //Return false to signify question have not run out
    return false;
}

//Displays the credit section, which will show the players score after some text slides
function credits() {
    hideQuiz();
    setTimeout(() => {
        showTextWindow(dictionary.finishedText, dictionary.congrats)
    }, 500);
    let btn = document.getElementById("nextSlideButton");
    btn.innerHTML = dictionary.scores;
    btn.removeAttribute("onclick");
    btn.onclick = function () {
        hideTextWindow(true);
        showQuiz(true);
        endQuiz();
    };
}


//Connects two Location objects as neighbours
function addNeighbours(id1, id2) {
    let loc1;
    let loc2;
    for (let i = 0; i < locations.length; i++) {
        if (locations[i].id == id1) loc1 = locations[i];
        if (locations[i].id == id2) loc2 = locations[i];
    }
    if (loc1 == null || loc2 == null) {
        //console.log("one or more locations not found");
    }
    loc1.addNeighbour(loc2.id);
}

//Function for giving an answer
function answer(num) {
    if (num == questions[activeQuestion].correct - 1 || questions[activeQuestion].correct == -1) {
        resetTimer();
        rightAnswer();
    } else {
        wrongAnswer();
    }
    answered = true;
}


//Encapsules everything that has to be done to display (or not display when running out) the next question
function nextQuestion() {
    (new Audio("audio/click.mp3")).play();
    answered = false;
    activeQuestion++;

    //renderQuestion returns true, if the question was the last in the collection, else it returns false
    if (!renderQuestion()) {
        overlay.style.visibility = "hidden";
        overlay.style.display = "none";
        quizMain.style.overflowY = "auto";
        document.getElementById("nextQuestionButton").style.display = "none";
        startTimer();
    }

    //If a question has an event, it means the map should be displayed and the player has to move to the next location
    if (questions[activeQuestion].event == true) {
        showMap();
        var loc = locations[questions[activeQuestion].location];
        clickHere.goTo = [loc.x, loc.y];
        clickHere.setLocation(loc);
    }
}


//Timer has been discarded. renderCount() was updating timer display and acting accordingly when time runs out.
function renderCount() {
    if (count <= timeLimit) {
        timeIncrement.style.width = (count / timeLimit) * 100 + "%";
    } else if (count > timeLimit) {
        resetTimer();
        wrongAnswer();
        activeQuestion++;
        renderQuestion();
    }
    count += 1;
}

function wrongAnswer() {
    (new Audio("audio/wrong_bloop.mp3")).play();
    img = document.getElementById(activeQuestion);
    img.src = "img/redlight.png";
    img.alt = "A red traffic light, representing an incorrect answer.";
}

function rightAnswer() {
    (new Audio("audio/correct_bloop.mp3")).play();
    if (answered == false) {
        correctAnswers++;
        img = document.getElementById(activeQuestion);
        img.src = "img/greenlight.png";
        img.alt = "A green traffic light, representing a correct answer.";

    }

    overlay.style.visibility = "visible";
    quizMain.style.overflowY = "hidden";
    overlay.style.display = "block";
    quizMain.scrollTop = 0;

    stopTimer();
    correctText.innerHTML = questions[activeQuestion].correctText;
    correctTextW.scrollTop = 0;
    document.getElementById("nextQuestionButton").style.display = "block";
}


//Resets timer when called
function resetTimer() {
    //console.log("timer reset");
    count = 0;
    timeIncrement.style.transitionDuration = ".3s"
    timeIncrement.style.backgroundColor = "transparent";
    setTimeout(() => {
        timeIncrement.style.width = "0px";

    }, 150);

    setTimeout(() => {
        timeIncrement.style.backgroundColor = "hotpink";
        timeIncrement.style.transitionDuration = "1s"
    }, 700);
}


//Adds an image of a green or red light
function renderProgress() {
    for (f = 0; f < questions.length; f++) {
        progressBar.innerHTML += "<img src='img/nolight.png' id='" + f + "' alt='Blank traffic light'>";
    }
}


//Encapsules all actions to be performed when quiz is ended. Creates a retry button
function endQuiz() {
    document.getElementById("nextQuestionButton").style.display = "none";
    correctText.style.display = "none";
    performancePer = (100 * (correctAnswers / questions.length)).toFixed(0);

    performanceIcon.src = performancePer < 33 ? "img/hupsis.png" :
        performancePer < 66 ? "img/iloinen.png" : "img/superiloinen.png";

    performanceIcon.style.display = "block";
    performance.style.display = "block";
    performanceIcon.style.opacity = "1";
    performance.innerHTML = performancePer + " %";
    overlay.style.visibility = "visible";
    quizMain.style.overflowY = "hidden";
    overlay.style.display = "block";
    gameOn = false;
    document.getElementById("retryButton").style.display = "block";
    stopTimer();
    (new Audio("audio/game_end.mp3")).play();

    retryButton = document.getElementById("retryButton");
    retryButton.innerHTML = dictionary.retry;
}


//Resets all variables and displays start screen
function retry() {
    quizMain.style.height = "33vh";
    document.getElementById("nextSlideButton").onclick = function () { nextIntroSlide(); };

    //player back to beginning
    canvasPlayer.setLocation(locations[17]);
    canvasPlayer.goTo = [locations[17].x, locations[17].y];
    (new Audio("audio/click.mp3")).play();
    gameOn = false;
    quizWrapper.style.opacity = "0";
    setTimeout(() => {
        //Undisplaying elements
        questionDiv.style.display = "none";
        timeBar.style.display = "none";
        progressBar.style.display = "none";
        choices.style.display = "none";
        displayImage.style.display = "none";
        overlay.style.visibility = "hidden";
        overlay.style.display = "none";
        quizMain.style.overflowY = "auto";

        retryButton.style.display = "none";
        performanceIcon.style.display = "none";
        performance.style.display = "none";

        startButton.style.display = "block";
        startButton.style.opacity = "1";
        startButton.style.cursor = "pointer";
        quizMain.style.display = "block";
        quizMain.style.opacity = "1";
        correctText.style.display = "block";

        //Clearing progressbar
        progressBar.innerHTML = "";
    }, 1000);
    setTimeout(() => {
        quizWrapper.style.opacity = "1";
    }, 1100);
    resetTimer();
    stopTimer();
    TIMER = [];


    activeQuestion = 0;
    correctAnswers = 0;
    startButton.onclick = function () { start();};
}


//Displays map
function showMap() {
    stopTimer();
    canvas.style.display = "block";
    var map = new Image();
    map.src = "img/map.jpg";
    ctx.drawImage(canvasPlayer.img, canvasPlayer.x, canvasPlayer.y - ukkeliOffset);
    ctx.drawImage(clickHere.img, clickHere.x, clickHere.y, clickHere.height, clickHere.width);

    updateMap();
    hideQuiz();

    setTimeout(() => {
        mapImage.style.opacity = "1";
    }, 800);
}


//Hides the main wrapper for quiz
function hideQuiz() {
    quizWrapper.style.opacity = "0";
    topNav.style.opacity = "0";
    setTimeout(() => {
        quizWrapper.style.display = "none";
        topNav.style.display = "none";
        mapImage.style.display = "block";
    }, 750);
}


//Hides the map canvas and displays quiz
function hideMap() {
    mapImage.style.opacity = "0";
    setTimeout(() => {
        mapImage.style.display = "none";
    }, 400);

    showQuiz();
    clearInterval(mapUpdateTimer);
    if (gameOn) startTimer();
}


//Displays quiz window
function showQuiz(instant) {
    if (instant == true) {
        quizWrapper.transitionDuration = 0;
        quizWrapper.style.display = "block";
        quizWrapper.style.opacity = "1";
        topNav.style.opacity = "1";
        setTimeout(() => {
            quizWrapper.transitionDuration = 1;
        }, 500);
        return;
    }
    setTimeout(() => {
        quizWrapper.style.display = "block";
    }, 400);

    setTimeout(() => {

        quizWrapper.style.opacity = "1";
        topNav.style.opacity = "1";
    }, 700);
}


//Displays info screen based on the question at hand
function showTextWindow(t, h) {
    let window = document.getElementById("textWindow");
    let text = document.getElementById("textWindowText");
    let header = document.getElementById("textWindowHeader");
    header.innerHTML = h;
    text.innerHTML = t;
    window.style.display = "block";
    setTimeout(() => {
        let lang = document.getElementById("changeLanguageButton");
        lang.style.display = "none";
        window.style.opacity = "1";
    }, 700);

}


//Undisplays text window
function hideTextWindow(instant) {
    let window = document.getElementById("textWindow");
    if (instant == true) {
        window.transitionDuration = 0;
        window.style.opacity = "0";
        window.style.display = "none";
        window.transitionDuration = 1;
    } else {
        window.style.opacity = "0";
        setTimeout(() => {
            window.style.display = "none";
        }, 700);
    }
}


//Performs updating of canvas map on intervals
function updateMap() {
    mapUpdateTimer = setInterval(() => {
        //Clear the whole canvas
        ctx.clearRect(0, 0, c.width, c.height);
        //Update player and 'X' position
        canvasPlayer.update();
        clickHere.update();

        //Debugging, shows the grid that has been created
        if (showPath) {
            for (let i = 0; i < locations.length; i++) {
                locations[i].drawPaths();
                locations[i].drawImage();
            }
        }

        //Draw player and 'X'
        ctx.drawImage(canvasPlayer.img, canvasPlayer.x, canvasPlayer.y - ukkeliOffset, canvasPlayer.height, canvasPlayer.width);
        ctx.drawImage(clickHere.img, clickHere.x, clickHere.y, clickHere.height, clickHere.width);
        
        //If player is at goTo location
        if (Math.abs(canvasPlayer.x - canvasPlayer.goTo[0]) < 10 &&
            Math.abs(canvasPlayer.y - canvasPlayer.goTo[1]) < 10) {

            //If goal has not been reached, update players position
            if (canvasPlayer.isAtGoal() == false) {
                moveTo();
            } else if (canvasPlayer.isAtGoal() && canvasPlayer.goal == clickHere.location) {
                //Else if goal has been reached, hide map
                hideMap();
                canvasPlayer.goal = null;
            }
        }
    }, 10);

}


//Returns the nearest Location to given x and y coordinates
function nearestLocation(x, y) {
    let location;
    let nearestDist = Number.MAX_SAFE_INTEGER;
    let nearestLoc;
    let a, b, c;
    for (let i = 0; i < locations.length; i++) {
        location = locations[i];
        a = location.x - x;
        b = location.y - y;
        c = Math.hypot(a, b);

        if (c < nearestDist) {
            nearestDist = c;
            nearestLoc = location;
        }
    }
    return nearestLoc;
}


//Sets the players goal as the nearest Location to mouse click coordinates.
function getCursorPosition(canvas, event) {
    clearInterval(mapUpdateTimer);

    var mouseX = event.clientX - ctx.canvas.offsetLeft;
    var mouseY = event.clientY - ctx.canvas.offsetTop;

    // scale mouse coordinates to canvas coordinates
    var x = mouseX * canvas.width / canvas.clientWidth;
    var y = mouseY * canvas.height / canvas.clientHeight;

    x -= 50;
    y -= 50;

    //console.log("new Location(" + Math.round(x) + ", " + Math.round(y) + ");");

    let L = nearestLocation(x, y);
    canvasPlayer.setGoal(L);
    //console.log("goal = " + L.id);
    canvasPlayer.path = calculatePath(canvasPlayer.location, L);
    //console.log(canvasPlayer.path);
    moveTo(L.id);

    updateMap();
}


//Changes the click here X's size when mouse is hovering above it
function clickHereSize(canvas, event) { 
    var mouseX = event.clientX - ctx.canvas.offsetLeft;
    var mouseY = event.clientY - ctx.canvas.offsetTop;

    // scale mouse coordinates to canvas coordinates
    var x = mouseX * canvas.width / canvas.clientWidth;
    var y = mouseY * canvas.height / canvas.clientHeight;

    x -= 50;
    y -= 50;

    if (distance(clickHere.x, clickHere.y, x, y) < 100) {
        //console.log("distance is less than 50");
        clickHere.maxHeight = 200;
        clickHere.maxWidth = 200;
    } else {
        clickHere.maxHeight = 150;
        clickHere.maxWidth = 150;
    }
}


//Stops all running timers that have been listed in TIMER array
function stopTimer() {
    for (i = 0; i < TIMER.length; i++) {
        clearInterval(TIMER[i]);
    }
}


//Starts timer. TODO: This functionality has been removed, yet to be refactored. 
function startTimer() {
    return;
    stopTimer()
    TIMER.push(setInterval(() => {
        renderCount();
    }, 1000))
}


//Set players goTo to the location of the id
function moveTo() {
    path = canvasPlayer.path;
    if (path.length == 0 || canvasPlayer.location.id == path[path.length - 1].id) return;

    //Set players goTo-field to the next map location
    let nextLoc = path.pop();
    if (nextLoc == null) return;
    canvasPlayer.goTo = [nextLoc.x, nextLoc.y];
    canvasPlayer.location = nextLoc;
}


//Bellman and ford algorithm
//Input two Locations
function calculatePath(from, to) {
    //Init vertexes for bellmanford
    locations.forEach(a => a.initBellmanFord());
    from.shortestPath = 0;
    from.latestVertex = from;

    let edge;
    //
    for (let i = 0; i < grid.length; i++) {
        edge = grid[i];
        if (edge.start.shortestPath + edge.cost < edge.end.shortestPath) {
            edge.end.shortestPath = edge.start.shortestPath + edge.cost;
            edge.end.latestVertex = edge.start;
            i = 0;
        }
    }

    let path = [];
    let end = to;
    while (end !== from) {
        path.push(end);
        end = end.latestVertex;
    }
    // path.reverse();

    return path;
}