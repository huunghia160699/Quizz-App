document.addEventListener("DOMContentLoaded", () => {
  const $ = document.querySelector.bind(document);
  const $$ = document.querySelectorAll.bind(document);

  const quizApp = {
    // --- Elements ---
    ui: {
      fileInputLabel: $("#file-input-label"),
      fileInput: $("#file-input"),
      loader: $("#loader"),
      questionSelection: $("#question-selection"),
      questionSelectionInput: $("#question-selection-input input"),
      desButton: $("#des"),
      insButton: $("#ins"),
      startButton: $("#start-button"),
      questionContainer: $("#question-container"),
      questionCounterDisplay: $("#question-counter-display"),
      questionContent: $("#question-content"),
      optionsContainer: $("#options-container"),
      result: $("#result"),
      scoreDisplay: $("#score-display"),
      nextButton: $("#next-button"),
      footer: $(".footer"),
      restartFullButton: $("#restart-full-button"),
      restartIncorrectButton: $("#restart-incorrect-button"),
      chooseNewFileButton: $("#choose-new-file-button"),
    },

    // --- State ---
    originalQuestions: [],
    quizQuestions: [],
    incorrectlyAnswered: [],
    currentQuestionIndex: 0,
    questionsToPlay: 0,
    correctCount: 0,

    // --- Methods ---

    showScreen(screenName) {
      // Ẩn tất cả các màn hình chính
      this.ui.fileInputLabel.classList.add("hidden");
      this.ui.loader.classList.add("hidden");
      this.ui.questionSelection.classList.add("hidden");
      this.ui.questionContainer.classList.add("hidden");
      this.ui.result.classList.add("hidden");

      this.ui.nextButton.classList.add("hidden");
      this.ui.footer.classList.add("hidden");

      switch (screenName) {
        case "file-input":
          this.ui.fileInputLabel.classList.remove("hidden");
          break;
        case "loader":
          this.ui.loader.classList.remove("hidden");
          break;
        case "selection":
          this.ui.questionSelection.classList.remove("hidden");
          break;
        case "question":
          this.ui.questionContainer.classList.remove("hidden");
          this.ui.footer.classList.remove("hidden");
          break;
        case "result":
          this.ui.result.classList.remove("hidden");
          break;
      }
    },

    parseQuizText(text) {
      const parsedData = [];
      // Sử dụng regex để tách các khối câu hỏi, linh hoạt với nhiều dấu gạch
      const questionBlocks = text.split(/\+{5,}/);

      questionBlocks.forEach((block, idx) => {
        const lines = block
          .trim()
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line);
        if (lines.length < 2) return;

        // Parse
        const question = { text: "", options: [], correctAnswer: null };
        let answerLetter = null;
        lines.forEach((line) => {
          if (line.match(/^Câu\s*\d+[:.]?\s*/i)) {
            question.text = line.replace(/^Câu\s*\d+[:.]?\s*/i, "").trim();
          } else if (line.match(/^[A-Z]\./)) {
            let optionText = line.substring(line.indexOf(".") + 1);
            if (optionText[0] === " ") optionText = optionText.substring(1);
            optionText = optionText.trim();
            question.options.push(optionText);
          } else if (line.match(/^Đáp\sán\s*:/i)) {
            answerLetter = line
              .substring(line.indexOf(":") + 1)
              .trim()
              .toUpperCase();
          }
        });
        // Lưu đáp án đúng theo nội dung
        if (answerLetter && question.options.length > 0 && question.text) {
          const letterIdx = "ABCD".indexOf(answerLetter);
          if (letterIdx >= 0 && letterIdx < question.options.length) {
            question.correctAnswer = question.options[letterIdx];
            parsedData.push(question);
          } else {
            console.log(`Câu hỏi lỗi ở block ${idx + 1}:`, block);
          }
        } else {
          console.log(`Câu hỏi lỗi ở block ${idx + 1}:`, block);
        }
      });
      return parsedData;
    },

    handleFileSelect(e) {
      const file = e.target.files[0];
      if (!file) return;

      // Hiển thị loader
      this.showScreen("loader");

      const reader = new FileReader();
      // Đọc file dưới dạng ArrayBuffer cho Mammoth.js
      reader.readAsArrayBuffer(file);

      reader.onload = (event) => {
        const arrayBuffer = event.target.result;

        // Sử dụng Mammoth.js để chuyển đổi .docx sang text
        mammoth
          .extractRawText({ arrayBuffer: arrayBuffer })
          .then((result) => {
            const fileContent = result.value; // Nội dung text của file
            this.originalQuestions = this.parseQuizText(fileContent);

            if (this.originalQuestions.length > 0) {
              this.setupQuestionSelection();
              this.showScreen("selection");
            } else {
              alert(
                "Không tìm thấy dữ liệu câu hỏi hợp lệ trong file. Vui lòng kiểm tra lại định dạng file Word."
              );
              this.resetApp();
            }
          })
          .catch((err) => {
            console.error(err);
            alert(
              "Đã có lỗi xảy ra khi xử lý file Word. File có thể bị lỗi hoặc không đúng định dạng."
            );
            this.resetApp();
          });
      };

      reader.onerror = () => {
        alert("Lỗi khi đọc file. Vui lòng thử lại.");
        this.resetApp();
      };
    },

    setupQuestionSelection() {
      const total = this.originalQuestions.length;
      this.ui.questionSelectionInput.max = total;
      this.ui.questionSelectionInput.min = 1;
      this.ui.questionSelectionInput.value = total;
    },

    changeQuestionCount(delta) {
      const input = this.ui.questionSelectionInput;
      let currentValue = parseInt(input.value);
      const min = parseInt(input.min);
      const max = parseInt(input.max);

      currentValue += delta;

      if (currentValue > max) currentValue = max;
      if (currentValue < min) currentValue = min;

      input.value = currentValue;
    },

    startQuiz(sourceQuestions) {
      this.quizQuestions = this.shuffleArray([...sourceQuestions]);
      this.questionsToPlay = this.quizQuestions.length;
      this.currentQuestionIndex = 0;
      this.correctCount = 0;
      this.incorrectlyAnswered = [];

      this.showScreen("question");
      this.loadQuestion();
    },

    loadQuestion() {
      if (this.currentQuestionIndex >= this.quizQuestions.length) {
        this.showResult();
        return;
      }

      const question = this.quizQuestions[this.currentQuestionIndex];
      this.ui.questionContent.textContent = question.text;
      this.ui.questionCounterDisplay.textContent = `Câu ${
        this.currentQuestionIndex + 1
      } / ${this.questionsToPlay}`;
      // Hiển thị số câu hỏi ở footer
      const footerCounter = document.getElementById("question-counter-footer");
      if (footerCounter) {
        footerCounter.textContent = `Câu ${this.currentQuestionIndex + 1} / ${
          this.questionsToPlay
        }`;
      }
      this.ui.optionsContainer.innerHTML = "";

      // Xáo trộn nội dung đáp án, ký tự ABCD giữ nguyên vị trí
      const optionLetters = ["A", "B", "C", "D"].filter(
        (l) => l in question.options
      );
      const optionContents = optionLetters.map((l) => question.options[l]);
      const shuffledContents = this.shuffleArray([...optionContents]);
      optionLetters.forEach((letter, idx) => {
        const optionButton = document.createElement("button");
        optionButton.className = "option";
        optionButton.dataset.option = letter;
        optionButton.innerHTML = `<span>${letter}</span> <p>${shuffledContents[idx]}</p>`;
        optionButton.onclick = () => this.selectOption(optionButton, letter);
        this.ui.optionsContainer.appendChild(optionButton);
      });

      this.ui.nextButton.classList.add("hidden");
    },

    selectOption(selectedButton, selectedOptionText) {
      const question = this.quizQuestions[this.currentQuestionIndex];
      const correctText = question.correctAnswer;
      const allOptionButtons = $$(".option");

      allOptionButtons.forEach((btn) => (btn.disabled = true));

      if (selectedOptionText === correctText) {
        selectedButton.classList.add("correct");
        this.correctCount++;
      } else {
        selectedButton.classList.add("incorrect");
        this.incorrectlyAnswered.push(question);
        const correctButton = $(`button[data-option="${correctText}"]`);
        if (correctButton) correctButton.classList.add("correct");
      }

      allOptionButtons.forEach((btn) => {
        if (
          !btn.classList.contains("correct") &&
          !btn.classList.contains("incorrect")
        ) {
          btn.classList.add("blurred");
        }
      });

      this.ui.nextButton.classList.remove("hidden");
    },

    handleNextClick() {
      this.currentQuestionIndex++;
      if (this.currentQuestionIndex < this.questionsToPlay) {
        this.loadQuestion();
      } else {
        this.showResult();
      }
    },

    showResult() {
      this.showScreen("result");
      this.ui.scoreDisplay.textContent = `${this.correctCount}/${this.questionsToPlay}`;
      this.ui.restartIncorrectButton.disabled =
        this.incorrectlyAnswered.length === 0;
    },

    resetApp() {
      this.originalQuestions = [];
      this.quizQuestions = [];
      this.incorrectlyAnswered = [];
      this.currentQuestionIndex = 0;
      this.questionsToPlay = 0;
      this.correctCount = 0;
      this.ui.fileInput.value = "";
      this.showScreen("file-input");
    },

    shuffleArray(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    },

    bindEvents() {
      this.ui.fileInput.addEventListener(
        "change",
        this.handleFileSelect.bind(this)
      );
      this.ui.desButton.onclick = () => this.changeQuestionCount(-1);
      this.ui.insButton.onclick = () => this.changeQuestionCount(1);

      this.ui.startButton.onclick = () => {
        const num = parseInt(this.ui.questionSelectionInput.value);
        const max = this.originalQuestions.length;
        if (isNaN(num) || num < 1 || num > max) {
          alert(`Vui lòng chọn số câu hỏi hợp lệ từ 1 đến ${max}.`);
          return;
        }
        const questionsForThisRound = this.shuffleArray([
          ...this.originalQuestions,
        ]).slice(0, num);
        this.startQuiz(questionsForThisRound);
      };

      this.ui.nextButton.onclick = this.handleNextClick.bind(this);

      this.ui.restartFullButton.onclick = () => {
        this.startQuiz(this.quizQuestions);
      };

      this.ui.restartIncorrectButton.onclick = () => {
        if (this.incorrectlyAnswered.length > 0) {
          this.startQuiz(this.incorrectlyAnswered);
        }
      };

      this.ui.chooseNewFileButton.onclick = this.resetApp.bind(this);
    },

    init() {
      this.bindEvents();
      this.showScreen("file-input");
    },
  };

  quizApp.init();
});
