const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const quizApp = {
  currentQuestionIndex: 0,
  questions: [],
  score: 0,
  startTime: null,
  isFileLoaded: false,
  wrap: document.querySelector(".wrap"),
  optionsElement: document.getElementById("options"),
  nextButton: document.getElementById("next-button"),
  startButton: document.getElementById("start-button"),
  resultElement: document.getElementById("result"),
  questionCounter: document.getElementById("question-counter"),
  totalQuestionsElement: document.getElementById("total-questions"),
  fileInput: document.querySelector("#file-input"),
  fileInputLabel: document.querySelector(".file-input-label"),
  questionsSelection: $("#question-selection"),
  questionsSelectionInput: document.querySelector(".input-box input"),

  loadFile() {
    const [file] = this.fileInput.files;
    const reader = new FileReader();
    if (file) {
      reader.readAsText(file);
    }
    reader.onload = (e) => {
      const fileContent = e.target.result;
      const lines = fileContent.split(/\r\n|\n/);
      const parsedQuestions = [];
      for (let i = 0; i < lines.length; i += 6) {
        if (lines[i].trim() !== "") {
          const question = {
            question: lines[i],
            options: [lines[i + 2], lines[i + 3], lines[i + 4], lines[i + 5]],
            answer: lines[i + 1],
          };
          parsedQuestions.push(question);
        }
      }
      this.questions = parsedQuestions;
      this.showQuestionSelection({ questions: this.questions });
      this.fileInput.disabled = true;
    };
  },

  showQuestionSelection({ questions }) {
    if (questions) {
      this.wrap.classList.add("top");
      this.questionsSelection.classList.remove("hidden");
      this.fileInputLabel.remove();
      this.questionsSelectionInput.value = questions.length;
      this.questionsSelectionInput.dataset.max = questions.length;
    }
    $("#ins").onclick = () => this.changeQuestionCount(1);
    $("#des").onclick = () => this.changeQuestionCount(-1);
  },

  changeQuestionCount(delta) {
    const numQuestionsInput = document.getElementById("num-questions");
    let currentValue = parseInt(numQuestionsInput.value);
    const min = parseInt(numQuestionsInput.dataset.min);
    const max = parseInt(numQuestionsInput.dataset.max);
    currentValue = Math.min(max, Math.max(min, currentValue + delta));
    numQuestionsInput.value = currentValue;
  },

  getRandomElements(arr, numElements) {
    const result = [];
    const arrayCopy = [...arr];
    while (result.length < numElements && arrayCopy.length > 0) {
      const randomIndex = Math.floor(Math.random() * arrayCopy.length);
      const randomElement = arrayCopy[randomIndex];
      result.push(randomElement);
      arrayCopy.splice(randomIndex, 1);
    }
    return result;
  },

  loadQuestion(qt) {
    this.nextButton.classList.add("hide");
    this.questionsSelection.innerHTML = "";
    this.questionsSelection.classList = "question";
    this.questions = qt;
    const currentQuestion = qt[this.currentQuestionIndex];
    this.questionsSelection.innerHTML = `<p>${currentQuestion.question}</p>`;
    this.questionsSelection.innerHTML += `<div id="options"></div>`;
    const optionsElement = document.getElementById("options");
    const randomOptions = this.getRandomElements(
      currentQuestion.options,
      currentQuestion.options.length
    );
    randomOptions.forEach((option) => {
      const button = document.createElement("button");
      button.innerText = option;
      button.className = "option-button";
      button.onclick = () => optionsElement.appendChild(button);
    });
    this.nextButton.disabled = true; // Disable the next button initially
    // this.questionCounter.innerText = `${this.currentQuestionIndex + 1} / ${
    //   qt.length
    // }`;
    // this.totalQuestionsElement.textContent = qt.length;
  },

  selectOption(selectedOption, button, currentQuestion) {
    if (selectedOption === currentQuestion.answer) {
      this.score++;
      button.classList.add("correct");
    } else {
      button.classList.add("incorrect");

      const correctButton = Array.from(
        document.getElementById("options").children
      ).find((btn) => {
        return btn.innerText === currentQuestion.answer;
      });
      if (correctButton) {
        correctButton.classList.add("correct");
      }
    }
    this.nextButton.classList.remove("hide");
    this.blurOptions();
    this.disableOptions();
  },

  showResult() {
    const endTime = new Date();
    const timeTaken = Math.floor((endTime - this.startTime) / 1000); // Time in seconds
    const accuracy = ((this.score / this.questions.length) * 100).toFixed(2); // Accuracy percentage
    const totalScore = this.score * 10; // Each question is worth 10 points

    this.wrap.innerHTML = "";

    this.resultElement.style.opacity = 1;
    this.resultElement.style.visibility = "visible";

    // Update accuracy percentage
    const accuracyElement = this.resultElement.querySelector(
      "#accuracy p span:last-child"
    );
    accuracyElement.innerText = `${accuracy}%`;

    // Update progress bar
    const progressBar = this.resultElement.querySelector(".progress");
    progressBar.style.width = `${accuracy}%`;

    // Update correct answers out of total
    const correctAnswersElement = this.resultElement.querySelector(
      ".stats .r span:last-child"
    );
    correctAnswersElement.innerText = `${this.score}/${this.questions.length}`;

    // Update total score
    const totalScoreElement = this.resultElement.querySelector(
      ".score .r span:last-child"
    );
    totalScoreElement.innerText = totalScore;
    this.nextButton.innerText = "Làm lại";
  },
  nextQuestion() {
    this.currentQuestionIndex++;
    if (this.currentQuestionIndex < this.questions.length) {
      this.loadQuestion(this.questions);
    } else {
      this.showResult();
    }
  },
  renderQuestion() {
    //
    const numQuestions = parseInt($("#num-questions").value);
    this.wrap.classList.add("bottom");
    this.loadQuestion(this.getRandomElements(this.questions, numQuestions));
    // this.nextButton
  },
  events() {
    this.fileInput.onchange = () => {
      this.loadFile();
    };

    this.startButton.onclick = () => {
      this.renderQuestion();
    };

    this.nextButton.onclick = () => {
      this.nextQuestion();
      if (this.isFileLoaded && this.nextButton.innerText == "Bắt đầu") {
        console.log(this.questions);

        // this.nextButton.innerText = "Tiếp theo";
      } else if (this.nextButton.innerText == "Tiếp theo") {
      } else if (this.nextButton.innerText == "Làm lại") {
        this.showQuestionSelection({ questions: this.questions });
        this.resultElement.style.opacity = 0;
        this.resultElement.style.visibility = "hidden";
        this.nextButton.innerText = "Bắt đầu";
      }
    };
    // document.getElementById("start-quiz").onclick = () => {

    // };
  },

  start() {
    this.events();
  },
};

quizApp.start();
