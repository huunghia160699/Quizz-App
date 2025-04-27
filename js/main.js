const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const quizApp = {
  // Cấu trúc dữ liệu mới cho allQuestion
  // Mảng các đối tượng câu hỏi, mỗi đối tượng có dạng:
  // {
  //   number: '...',         // Số thứ tự câu hỏi
  //   text: '...',           // Nội dung câu hỏi
  //   options: {             // Đối tượng chứa các lựa chọn { chữ_cái: nội_dung_lựa_chọn }
  //     'A': '...',
  //     'B': '...',
  //     ...
  //   },
  //   correctAnswer: '...', // Chữ cái của đáp án đúng ('A', 'B', ...)
  //   shuffleOptions: false // Cờ xáo trộn (nếu có từ Python, mặc định False)
  // }
  allQuestion: null,
  currentQuestionIndex: 0, // Đổi tên biến cho rõ nghĩa hơn
  maxQuestion: 0,
  correctedCount: 0,

  // --- Hàm phân tích nội dung file TXT (Đã sửa đổi từ phiên bản Python V5 output) ---
  parseQuizText(text) {
    const parsedData = [];
    // Tách các khối câu hỏi dựa vào dòng phân cách "--------------------"
    const questionBlocks = text.split("--------------------");

    questionBlocks.forEach((block) => {
      // Tách các dòng trong mỗi khối, loại bỏ dòng trống và khoảng trắng ở đầu/cuối dòng
      const lines = block
        .trim()
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "");
      if (lines.length < 2) {
        // Một khối hợp lệ cần ít nhất dòng câu hỏi và dòng đáp án/lựa chọn đầu tiên
        // console.warn('Bỏ qua khối trống hoặc quá ngắn:', block.trim().substring(0, 50) + '...');
        return; // Bỏ qua khối rỗng hoặc không đủ dữ liệu cơ bản
      }

      const question = {
        number: "N/A",
        text: "",
        options: {}, // { 'A': 'Option A text', 'B': 'Option B text', ... }
        correctAnswer: null, // 'A', 'B', 'C', ...
        // shuffleOptions: false, // Bạn có thể thêm lại nếu Python script output có include
      };

      // Duyệt qua từng dòng đã clean trong khối
      lines.forEach((line) => {
        // Nhận diện dòng Câu hỏi (Bắt đầu bằng "Câu " và số)
        if (line.startsWith("Câu ")) {
          const match = line.match(/^Câu\s*(\d+):?\s*(.*)/); // Regex bắt số câu và nội dung
          if (match) {
            question.number = match[1];
            question.text = match[2].trim();
          } else {
            // Fallback cho định dạng "Câu X" không có ":"
            const numMatchFallback = line.match(/^Câu\s*(\d+)\s*(.*)/);
            if (numMatchFallback) {
              question.number = numMatchFallback[1];
              question.text = numMatchFallback[2].trim();
            } else {
              console.warn(`Không phân tích đầy đủ dòng câu hỏi: "${line}"`);
              question.text = line.replace(/^Câu\s*\d+\s*/, "").trim(); // Chỉ xóa "Câu X "
              const simpleNumMatch = line.match(/\d+/); // Cố gắng lấy số đơn giản
              if (simpleNumMatch) question.number = simpleNumMatch[0];
            }
          }
          // Nhận diện dòng Lựa chọn (Bắt đầu bằng chữ cái A-F và dấu chấm)
        } else if (line.match(/^[A-F]\.\s*/)) {
          const optionLetter = line[0]; // Lấy ký tự A, B, C...
          const optionText = line.substring(line.indexOf(".") + 1).trim(); // Lấy nội dung sau dấu chấm
          question.options[optionLetter] = optionText;
          // Nhận diện dòng Đáp án (Bắt đầu bằng "Đáp án:")
        } else if (line.startsWith("Đáp án:")) {
          const answerLetter = line.substring("Đáp án:".length).trim();
          // Kiểm tra xem đáp án có phải là một chữ cái đơn A-F không
          if (
            answerLetter.length === 1 &&
            answerLetter >= "A" &&
            answerLetter <= "F"
          ) {
            question.correctAnswer = answerLetter;
          } else {
            console.warn(
              `Không phân tích được chữ cái đáp án đúng: "${line}" cho câu ${question.number}`
            );
            question.correctAnswer = null; // Đặt null nếu không hợp lệ
          }
        }
        // Bỏ qua các dòng khác không khớp mẫu
      });

      // Thêm câu hỏi đã phân tích vào danh sách nếu nó hợp lệ
      // Hợp lệ khi có text câu hỏi, ít nhất 1 lựa chọn VÀ đáp án đúng được xác định
      if (
        question.text &&
        Object.keys(question.options).length > 0 &&
        question.correctAnswer
      ) {
        parsedData.push(question);
      } else {
        console.warn(
          `Bỏ qua khối câu hỏi có thể không đầy đủ (thiếu text, lựa chọn, hoặc đáp án):`,
          lines
        );
      }
    });

    return parsedData;
  },

  // --- Sửa đổi hàm loadFile ---
  loadFile() {
    // Giả định phần tử input file có ID "file-input"
    const fileInput = $("#file-input");
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      console.warn(
        "Không tìm thấy phần tử input file hoặc chưa có file nào được chọn."
      );
      // Bạn có thể hiển thị một thông báo trên giao diện người dùng nếu cần
      return;
    }
    const file = fileInput.files[0];

    const reader = new FileReader();
    // Đọc file dưới dạng văn bản, đảm bảo dùng mã hóa UTF-8
    reader.readAsText(file, "UTF-8");

    reader.onload = (e) => {
      const fileContent = e.target.result;
      // Sử dụng hàm parseQuizText mới để phân tích nội dung file
      this.allQuestion = this.parseQuizText(fileContent);

      if (this.allQuestion.length > 0) {
        console.log(
          `Đã tải và phân tích thành công ${this.allQuestion.length} câu hỏi.`
        );

        // Xóa bỏ hoặc ẩn phần tử input file và nhãn của nó
        const fileInputLabel = $("#file-input-label"); // Giả định ID của nhãn/container
        if (fileInputLabel) {
          fileInputLabel.style.display = "none"; // Hoặc fileInputLabel.remove();
        } else {
          console.warn("#file-input-label không tìm thấy, không thể ẩn.");
        }
        fileInput.style.display = "none"; // Ẩn chính input file

        $("#wrap").classList.add("active"); // Kích hoạt container chính

        // Chuyển sang màn hình chọn số lượng câu hỏi
        this.loadPartialHTML("./html/selection.html", "wrap");
      } else {
        console.error("Không tìm thấy dữ liệu quiz hợp lệ trong file đã chọn.");
        alert(
          "Không tìm thấy dữ liệu quiz hợp lệ trong file đã chọn.\nVui lòng kiểm tra định dạng file TXT."
        );
        // Đặt lại input file để người dùng có thể chọn lại
        fileInput.value = "";
        // Hiển thị lại phần input file nếu nó đã bị ẩn
        if (fileInputLabel) fileInputLabel.style.display = "";
        fileInput.style.display = "";
      }
    };

    reader.onerror = (e) => {
      console.error("Lỗi khi đọc file:", e);
      alert("Lỗi khi đọc file. Vui lòng thử lại.");
      // Đặt lại input file
      fileInput.value = "";
    };
  },
// --- Hàm trộn mảng (Fisher-Yates shuffle) ---
  shuffleArray(array) {
    let currentIndex = array.length;
    let randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex !== 0) {
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex],
        array[currentIndex],
      ];
    }

    return array;
  },
  // --- Hàm loadPartialHTML (Điều chỉnh lại các listener gắn sau khi load) ---
  async loadPartialHTML(url, targetId) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const htmlContent = await response.text();
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.innerHTML = htmlContent;

        // --- Gắn lại các event listener cho các phần tử trong nội dung vừa load ---

        // Gắn listener cho input file nếu màn hình input file được load lại
        const fileInput = $("#file-input");
        if (fileInput) {
          // Xóa listener cũ nếu có để tránh gắn nhiều lần
          // (Cần lưu trữ hàm handler để remove đúng) hoặc dùng cờ hiệu
          // Cách đơn giản ở đây là chỉ gắn 1 lần khi start hoặc dựa vào cấu trúc HTML
          // Trong code mới, loadFile chỉ gọi khi change event trên #file-input
          // nên việc gắn listener cho #file-input cần làm SAU KHI load file-input.html
          fileInput.addEventListener("change", this.loadFile.bind(this)); // Gắn listener loadFile
        }

        // Listeners cho màn hình chọn số lượng câu hỏi (selection.html)
        const questionSelectionElement = $("#question-selection");
        if (questionSelectionElement) {
          let input = $("#question-selection-input input");
          // Đảm bảo this.allQuestion có dữ liệu trước khi lấy length
          const totalQuestions = this.allQuestion ? this.allQuestion.length : 0;
          input.dataset.max = totalQuestions;
          input.dataset.min = totalQuestions > 0 ? 1 : 0; // Min là 1 nếu có câu hỏi, 0 nếu không
          input.value = totalQuestions; // Mặc định chọn min(total, 10) hoặc 0

          // Đảm bảo giá trị input không vượt quá min/max khi người dùng nhập
          input.addEventListener("change", () => {
            const min = parseInt(input.dataset.min) || 0;
            const max = parseInt(input.dataset.max) || 0;
            let currentValue = parseInt(input.value);
            if (isNaN(currentValue) || currentValue < min) currentValue = min;
            if (currentValue > max) currentValue = max;
            input.value = currentValue;
          });

          $("#ins").onclick = () => this.changeQuestionCount(1);
          $("#des").onclick = () => this.changeQuestionCount(-1);
          $("#start-button").onclick = () => {
            this.maxQuestion = parseInt(
              $("#question-selection-input input").value
            );
            // Kiểm tra số lượng hợp lệ trước khi bắt đầu
            if (
              isNaN(this.maxQuestion) ||
              this.maxQuestion < 1 ||
              this.maxQuestion > totalQuestions
            ) {
              alert(
                `Vui lòng chọn số lượng câu hỏi hợp lệ từ 1 đến ${totalQuestions}.`
              );
              return;
            }

            // Tùy chọn: Xáo trộn allQuestion ở đây nếu muốn chọn ngẫu nhiên
            this.allQuestion = this.shuffleArray([...this.allQuestion]).slice(0, this.maxQuestion);

            // Lấy số lượng câu hỏi đã chọn (nếu không xáo trộn thì lấy từ đầu danh sách)
            this.allQuestion = this.allQuestion.slice(0, this.maxQuestion);

            // Chuyển sang màn hình câu hỏi
            // questionSelectionElement.remove(); // Xóa màn hình chọn câu hỏi
            this.loadPartialHTML("./html/question.html", "wrap"); // Load màn hình câu hỏi
          };
        }

        // Listeners cho màn hình câu hỏi (question.html)
        const questionContainerElement = $("#question-container");
        if (questionContainerElement) {
          this.currentQuestionIndex = 0; // Bắt đầu từ câu hỏi đầu tiên
          this.correctedCount = 0; // Reset điểm số
          if (this.allQuestion && this.allQuestion.length > 0) {
            this.loadQuestion(); // Load câu hỏi đầu tiên
            // Gắn listener cho nút "Câu tiếp theo" chỉ 1 lần sau khi nó được load
            const nextButton = $("#next-button");
            if (nextButton) {
              // Sử dụng bind(this) để đảm bảo 'this' trong handleNextButtonClick là đối tượng quizApp
              nextButton.onclick = this.handleNextButtonClick.bind(this);
            } else {
              console.warn(
                "#next-button không tìm thấy sau khi load question.html"
              );
            }
          } else {
            console.error("Không có dữ liệu câu hỏi để hiển thị.");
            questionContainerElement.innerHTML =
              "<p>Không có câu hỏi nào được tải.</p>";
            const nextButton = $("#next-button");
            if (nextButton) nextButton.classList.add("hidden");
          }
        }

        // Listeners cho màn hình kết quả (result.html)
        const resultElement = $("#result");
        if (resultElement) {
          // Hiển thị điểm số
          const scoreDisplay = $$("#result span")[1]; // Dựa vào cấu trúc HTML gốc của bạn
          if (scoreDisplay) {
            scoreDisplay.textContent = `${this.correctedCount}/${this.maxQuestion}`;
          } else {
            console.warn(
              "Không tìm thấy phần tử hiển thị điểm số trong result.html"
            );
          }

          // Nút "Làm lại" (đã dùng chung ID #next-button)
          const restartButton = $("#next-button");
          if (restartButton) {
            restartButton.textContent = "Làm lại"; // Đặt lại text cho nút
            // Listener cho nút "Làm lại" đã được gắn ở trên (handleNextButtonClick)
          } else {
            console.warn(
              "#next-button không tìm thấy sau khi load result.html"
            );
          }
        }
      } else {
        console.error(
          `Không tìm thấy phần tử mục tiêu có ID: ${targetId} để load nội dung.`
        );
      }
    } catch (error) {
      console.error(`Lỗi khi tải partial HTML từ ${url}:`, error);
      // Hiển thị lỗi trên giao diện nếu có nơi hiển thị chung
    }
  },

  // Hàm thay đổi số lượng câu hỏi (Giữ nguyên)
  changeQuestionCount(delta) {
    const numQuestionsInput = $("#question-selection-input input");
    if (!numQuestionsInput) return; // Đảm bảo phần tử tồn tại

    let currentValue = parseInt(numQuestionsInput.value);
    const min = parseInt(numQuestionsInput.dataset.min) || 1;
    const max =
      parseInt(numQuestionsInput.dataset.max) ||
      (this.allQuestion ? this.allQuestion.length : 1); // Max là số lượng câu hỏi đã load

    if (isNaN(currentValue)) currentValue = min; // Xử lý giá trị ban đầu không phải số

    currentValue += delta;

    currentValue = Math.min(max, Math.max(min, currentValue)); // Giới hạn giá trị trong khoảng min/max

    numQuestionsInput.value = currentValue;
  },

  // --- Sửa đổi hàm loadQuestion ---
  loadQuestion() {
    // Đảm bảo chỉ số câu hỏi hợp lệ
    if (
      !this.allQuestion ||
      this.currentQuestionIndex >= this.allQuestion.length
    ) {
      console.error(
        "Không thể tải câu hỏi: Chỉ số không hợp lệ hoặc chưa tải câu hỏi nào."
      );
      // Chuyển sang màn hình kết quả nếu hết câu hoặc có lỗi
      this.loadResult();
      return;
    }

    const currentQuestion = this.allQuestion[this.currentQuestionIndex];

    // Cập nhật hiển thị câu hỏi
    const questionContentElement = $("#question-content");
    if (questionContentElement) {
      questionContentElement.textContent = currentQuestion.text; // Sử dụng 'text' từ dữ liệu đã phân tích
    } else console.warn("#question-content không tìm thấy.");

    // Cập nhật số thứ tự câu hỏi hiện tại
    const questionCounterElement = $("#question-counter");
    if (questionCounterElement) {
      questionCounterElement.textContent = `Câu ${
        this.currentQuestionIndex + 1
      } / ${this.maxQuestion}`;
    } else console.warn("#question-counter không tìm thấy.");

    // Cập nhật hiển thị các lựa chọn

    const optionsContainer = $("#options-container"); // Thay bằng ID thực tế

    if (optionsContainer) {
      optionsContainer.innerHTML = ""; // Xóa các lựa chọn cũ

      // Lấy các chữ cái lựa chọn (A, B, C, ...) và sắp xếp chúng
      const optionLetters = Object.keys(currentQuestion.options).sort();

      optionLetters.forEach((letter) => {
        const optionText = currentQuestion.options[letter];
        if (optionText != "") {
          // Tạo nút cho mỗi lựa chọn, giống cấu trúc HTML gốc của bạn
          const optionButton = document.createElement("button");
          optionButton.classList.add("option"); // Thêm class ".option" của bạn
          // Tạo cấu trúc nội dung bên trong nút (ví dụ: <span>A</span> <p>Nội dung...</p>)

          optionButton.innerHTML = `<span>${letter}</span> <p>${optionText}</p>`;

          // Lưu chữ cái lựa chọn vào data attribute để dùng khi check đáp án
          optionButton.dataset.option = letter;

          // Gắn sự kiện click cho nút lựa chọn
          // Sử dụng bind(this) để đảm bảo 'this' trong selectOption là đối tượng quizApp
          // currentQuestion.correctAnswer chứa chữ cái đáp án đúng (ví dụ: 'A')
          optionButton.onclick = this.selectOption.bind(this, letter); // Truyền chữ cái lựa chọn đã click

          optionsContainer.appendChild(optionButton);
        }
      });
    } else {
      console.warn(".options container không tìm thấy để load lựa chọn.");
    }

    // Reset trạng thái nút "Câu tiếp theo"
    const nextButton = $("#next-button");
    if (nextButton) {
      nextButton.classList.add("hidden"); // Ẩn nút tiếp theo ban đầu
      nextButton.textContent = "Tiếp theo"; // Đảm bảo text đúng
    } else console.warn("#next-button không tìm thấy trong loadQuestion");

    // Đảm bảo các class highlight (correct, incorrect, blurred) và disabled được xóa khỏi các nút MỚI
    // Việc tạo nút mới và gán innerHTML đã làm sạch các class/thuộc tính cũ, nên không cần xóa thủ công ở đây.
  },

  // --- Sửa đổi hàm selectOption ---
  // Hàm này nhận chữ cái của lựa chọn vừa click và kiểm tra với đáp án đúng
  selectOption(selectedOptionLetter) {
    // Chỉ nhận chữ cái của lựa chọn đã click
    // Lấy câu hỏi hiện tại
    const currentQuestion = this.allQuestion[this.currentQuestionIndex];
    const correctAnswerLetter = currentQuestion.correctAnswer; // Lấy đáp án đúng từ dữ liệu

    // Lấy tất cả các nút lựa chọn để vô hiệu hóa và highlight
    const optionButtons = Array.from($$(".option"));
    console.log(optionButtons);

    // Vô hiệu hóa tất cả các lựa chọn sau khi người dùng click
    this.disableOptions(optionButtons);

    // Kiểm tra đáp án và highlight
    if (selectedOptionLetter === correctAnswerLetter) {
      // Tìm nút tương ứng với lựa chọn đúng (nút vừa click là đúng)
      const selectedButton = optionButtons.find(
        (btn) => btn.dataset.option === selectedOptionLetter
      );
      if (selectedButton) selectedButton.classList.add("correct");
      this.correctedCount += 1; // Tăng điểm
    } else {
      // Tìm nút tương ứng với lựa chọn sai (nút vừa click là sai)
      const selectedButton = optionButtons.find(
        (btn) => btn.dataset.option === selectedOptionLetter
      );
      if (selectedButton) selectedButton.classList.add("incorrect");

      // Tìm và highlight đáp án đúng (nút khác với nút vừa click)
      const correctButton = optionButtons.find(
        (btn) => btn.dataset.option === correctAnswerLetter
      );
      if (correctButton) correctButton.classList.add("correct");
      else
        console.warn(
          `Không tìm thấy nút cho đáp án đúng '${correctAnswerLetter}'`
        ); // Debug nếu không tìm thấy nút đáp án đúng
    }

    // Làm mờ các lựa chọn còn lại (chưa được chọn và không phải đáp án đúng)
    this.blurOptions(optionButtons);

    // Hiển thị nút "Câu tiếp theo"
    const nextButton = $("#next-button");
    if (nextButton) {
      nextButton.classList.remove("hidden");
    } else console.warn("#next-button không tìm thấy trong selectOption");
  },

  // Hàm làm mờ các lựa chọn chưa chọn (Giữ nguyên)
  blurOptions(buttons) {
    for (let button of buttons) {
      if (
        !button.classList.contains("correct") &&
        !button.classList.contains("incorrect")
      ) {
        button.classList.add("blurred");
      }
    }
  },

  // Hàm vô hiệu hóa các lựa chọn (Giữ nguyên)
  disableOptions(buttons) {
    for (let button of buttons) {
      button.disabled = true;
    }
  },

  // Hàm load màn hình kết quả (Giữ nguyên)
  loadResult() {
    this.loadPartialHTML("./html/result.html", "wrap");
  },

  // --- Hàm xử lý nút "Câu tiếp theo" / "Làm lại" ---
  // Hàm này được gắn vào sự kiện click của #next-button
  handleNextButtonClick(event) {
    // Dựa vào text của nút để quyết định hành động
    if (event.target.textContent === "Tiếp theo") {
      this.currentQuestionIndex += 1; // Tăng chỉ số câu hỏi

      // Kiểm tra xem còn câu hỏi nào nữa không
      if (this.currentQuestionIndex < this.maxQuestion) {
        // So sánh với tổng số câu hỏi đã chọn
        this.loadQuestion(); // Tải câu hỏi tiếp theo
      } else {
        // Nếu đã hết câu hỏi, chuyển sang màn hình kết quả
        this.loadResult();
      }
    } else if (event.target.textContent === "Làm lại") {
      // Reset lại tất cả trạng thái để bắt đầu lại
      this.maxQuestion = 0;
      this.currentQuestionIndex = 0;
      this.correctedCount = 0;
      this.allQuestion = null; // Xóa dữ liệu câu hỏi đã tải
      // Tải lại màn hình input file ban đầu
      this.loadPartialHTML("./html/file-input.html", "wrap");
      $("#wrap").classList.remove("active");
      event.target.textContent = "Tiếp theo";
      event.target.classList.add("hidden");

      // Các reset khác cho nút next và wrap sẽ được xử lý khi loadPartialHTML hoàn thành
    }
  },

  // --- Hàm handleEvents (Đã đơn giản hóa) ---
  // Các listener chính (input file change, next button click) được gắn trong loadPartialHTML
  handleEvents() {
    console.log(
      "handleEvents: Chỉ gắn các listener phụ nếu cần thiết. Listener chính được gắn động."
    );
    // Bạn có thể thêm các listener toàn cục khác ở đây nếu cần
  },

  // --- Hàm start ---
  start() {
    // Chờ DOM load xong rồi mới bắt đầu tải màn hình đầu tiên
    document.addEventListener("DOMContentLoaded", () => {
      // Tải màn hình input file ban đầu vào container #wrap
      this.loadPartialHTML("./html/file-input.html", "wrap");
      // Listener cho nút next/làm lại sẽ được gắn sau khi #next-button được load vào DOM
    });
    // Các listener phụ có thể gắn ở đây hoặc trong loadPartialHTML
    // this.handleEvents(); // Có thể gọi hoặc không tùy vào việc bạn có listener phụ nào không gắn động
  },
};

// Khởi chạy ứng dụng
quizApp.start();
// updated
