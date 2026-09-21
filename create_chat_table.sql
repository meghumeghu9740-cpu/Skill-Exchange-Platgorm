USE skill_exchange;

CREATE TABLE Exchange_Messages (
    message_id INT PRIMARY KEY AUTO_INCREMENT,
    request_id INT NOT NULL,
    sender_id INT NOT NULL,
    message_text TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES Exchange_Requests(request_id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES Users(user_id) ON DELETE CASCADE
);
