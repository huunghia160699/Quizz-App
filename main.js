document.addEventListener("DOMContentLoaded", () => {
  const $ = document.querySelector.bind(document);
  const $$ = document.querySelectorAll.bind(document);

  const quizApp = {
    // --- Elements ---
    ui: {
      wrap: $("#wrap"),
      fileInputLabel: $("#file-input-label"),
      fileInput: $("#file-input"),
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

    // Chuyển đổi giữa các màn hình
    showScreen(screenName) {
      // Ẩn tất cả các màn hình chính
      this.ui.fileInputLabel.classList.add("hidden");
      this.ui.questionSelection.classList.add("hidden");
      this.ui.questionContainer.classList.add("hidden");
      this.ui.result.classList.add("hidden");

      // Ẩn/hiện các thành phần phụ
      this.ui.nextButton.classList.add("hidden");
      this.ui.footer.style.display = "none";

      // Hiện màn hình được chỉ định
      switch (screenName) {
        case "file-input":
          this.ui.fileInputLabel.classList.remove("hidden");
          this.ui.wrap.classList.remove("active");
          break;
        case "selection":
          this.ui.questionSelection.classList.remove("hidden");
          this.ui.wrap.classList.add("active");
          break;
        case "question":
          this.ui.questionContainer.classList.remove("hidden");
          this.ui.footer.style.display = "flex";
          break;
        case "result":
          this.ui.result.classList.remove("hidden");
          this.ui.wrap.classList.add("active");
          break;
      }
    },

    // Phân tích file text thành dữ liệu câu hỏi
    parseQuizText(text) {
      const parsedData = [];
      const questionBlocks = text.split("--------------------");

      questionBlocks.forEach((block) => {
        const lines = block
          .trim()
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line);
        if (lines.length < 2) return;

        const question = { text: "", options: {}, correctAnswer: null };

        lines.forEach((line) => {
          if (line.match(/^Câu\s*\d+[:.]?\s*/)) {
            question.text = line.replace(/^Câu\s*\d+[:.]?\s*/, "").trim();
          } else if (line.match(/^[A-F]\.\s*/)) {
            const optionLetter = line[0];
            const optionText = line.substring(line.indexOf(".") + 1).trim();
            question.options[optionLetter] = optionText;
          } else if (line.startsWith("Đáp án:")) {
            const answerLetter = line
              .substring("Đáp án:".length)
              .trim()
              .toUpperCase();
            if (
              answerLetter.length === 1 &&
              answerLetter >= "A" &&
              answerLetter <= "F"
            ) {
              question.correctAnswer = answerLetter;
            }
          }
        });

        if (
          question.text &&
          Object.keys(question.options).length > 0 &&
          question.correctAnswer
        ) {
          parsedData.push(question);
        }
      });
      return parsedData;
    },

    // Xử lý khi người dùng chọn file
    handleFileSelect(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.readAsText(file, "UTF-8");

      reader.onload = (event) => {
        const fileContent = event.target.result;
        this.originalQuestions = this.parseQuizText(fileContent);

        if (this.originalQuestions.length > 0) {
          this.setupQuestionSelection();
          this.showScreen("selection");
        } else {
          alert(
            "Không tìm thấy dữ liệu câu hỏi hợp lệ trong file. Vui lòng kiểm tra lại định dạng."
          );
          this.resetApp();
        }
      };

      reader.onerror = () => {
        alert("Lỗi khi đọc file. Vui lòng thử lại.");
        this.resetApp();
      };
    },

    // Thiết lập màn hình chọn số câu hỏi
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

    // Bắt đầu làm bài
    startQuiz(sourceQuestions) {
      this.quizQuestions = this.shuffleArray([...sourceQuestions]);
      this.questionsToPlay = this.quizQuestions.length;
      this.currentQuestionIndex = 0;
      this.correctCount = 0;
      this.incorrectlyAnswered = [];

      this.showScreen("question");
      this.loadQuestion();
    },

    // Tải câu hỏi hiện tại
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
      this.ui.optionsContainer.innerHTML = "";

      const optionLetters = this.shuffleArray(Object.keys(question.options));

      optionLetters.forEach((letter) => {
        const optionButton = document.createElement("button");
        optionButton.className = "option";
        optionButton.dataset.option = letter;
        optionButton.innerHTML = `<span>${letter}</span> <p>${question.options[letter]}</p>`;
        optionButton.onclick = () => this.selectOption(optionButton, letter);
        this.ui.optionsContainer.appendChild(optionButton);
      });

      this.ui.nextButton.classList.add("hidden");
    },

    // Xử lý khi chọn một đáp án
    selectOption(selectedButton, selectedLetter) {
      const question = this.quizQuestions[this.currentQuestionIndex];
      const correctLetter = question.correctAnswer;
      const allOptionButtons = $$(".option");

      // Vô hiệu hóa tất cả các nút
      allOptionButtons.forEach((btn) => (btn.disabled = true));

      if (selectedLetter === correctLetter) {
        selectedButton.classList.add("correct");
        this.correctCount++;
      } else {
        selectedButton.classList.add("incorrect");
        this.incorrectlyAnswered.push(question); // Lưu câu trả lời sai
        // Hiển thị đáp án đúng
        const correctButton = $(`button[data-option="${correctLetter}"]`);
        if (correctButton) correctButton.classList.add("correct");
      }

      // Làm mờ các lựa chọn còn lại
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

    // Chuyển sang câu hỏi tiếp theo
    handleNextClick() {
      this.currentQuestionIndex++;
      if (this.currentQuestionIndex < this.questionsToPlay) {
        this.loadQuestion();
      } else {
        this.showResult();
      }
    },

    // Hiển thị màn hình kết quả
    showResult() {
      this.showScreen("result");
      this.ui.scoreDisplay.textContent = `${this.correctCount}/${this.questionsToPlay}`;

      // Bật/tắt nút "Làm lại câu sai"
      if (this.incorrectlyAnswered.length > 0) {
        this.ui.restartIncorrectButton.disabled = false;
      } else {
        this.ui.restartIncorrectButton.disabled = true;
      }
    },

    // Reset toàn bộ ứng dụng
    resetApp() {
      this.originalQuestions = [];
      this.quizQuestions = [];
      this.incorrectlyAnswered = [];
      this.currentQuestionIndex = 0;
      this.questionsToPlay = 0;
      this.correctCount = 0;
      this.ui.fileInput.value = ""; // Quan trọng để có thể chọn lại file cũ
      this.showScreen("file-input");
    },

    shuffleArray(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    },

    // Gắn các sự kiện
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

      // Sự kiện cho các nút trên màn hình kết quả
      this.ui.restartFullButton.onclick = () => {
        // Lấy lại các câu hỏi đã chơi trong vòng này và bắt đầu lại
        this.startQuiz(this.quizQuestions);
      };

      this.ui.restartIncorrectButton.onclick = () => {
        if (this.incorrectlyAnswered.length > 0) {
          // Bắt đầu quiz mới chỉ với các câu đã trả lời sai
          this.startQuiz(this.incorrectlyAnswered);
        }
      };

      this.ui.chooseNewFileButton.onclick = this.resetApp.bind(this);
    },

    // Khởi chạy
    init() {
      this.bindEvents();
      this.showScreen("file-input"); // Bắt đầu ở màn hình chọn file
    },
  };

  quizApp.init();
});
