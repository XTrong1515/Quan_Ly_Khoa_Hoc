
CREATE TABLE IF NOT EXISTS quizzes (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  lesson_id   INT NOT NULL,
  title       VARCHAR(255),
  pass_score  TINYINT NOT NULL DEFAULT 70,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  UNIQUE KEY uk_lesson_quiz (lesson_id)
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  quiz_id     INT NOT NULL,
  question    TEXT NOT NULL,
  type        ENUM('single','multiple') DEFAULT 'single',
  position    TINYINT NOT NULL DEFAULT 0,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quiz_options (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  question_id INT NOT NULL,
  option_text TEXT NOT NULL,
  is_correct  BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  quiz_id      INT NOT NULL,
  user_id      INT NOT NULL,
  score        TINYINT NOT NULL,
  passed       BOOLEAN NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quiz_id)  REFERENCES quizzes(id),
  FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_quiz_user (quiz_id, user_id)
);

CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  attempt_id   INT NOT NULL,
  question_id  INT NOT NULL,
  option_id    INT NOT NULL,
  FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE
);
