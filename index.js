drop schema checkjin_2023874;
CREATE SCHEMA checkjin_2023874;
use checkjin_2023874;

CREATE TABLE School (
   school_id INT AUTO_INCREMENT PRIMARY KEY,
    school_name VARCHAR(100) NOT NULL,  # UNIQUE, 일단 중복 허용
    monthly_total_time INT DEFAULT 0, -- 해당 학교의 월별 총 공부 시간 (분 단위)
    total_time INT DEFAULT 0,
    total_points INT DEFAULT 0, -- 해당 학교의 월별 총 포인트
    total_ranking INT DEFAULT NULL,
    monthly_ranking INT DEFAULT NULL, -- 학교 순위 (월별 대회)
    local_ranking INT DEFAULT NULL,
    school_level INT DEFAULT 1,
    school_local VARCHAR(100) NULL,
    start_date DATE,
    end_date DATE
);

CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY, -- user 구분
    email VARCHAR(255) NOT NULL UNIQUE, -- 아이디
    password VARCHAR(255) NOT NULL, -- 비번
    nickname VARCHAR(50) NOT NULL, -- 닉네임
    school_name VARCHAR(100), -- 학교명
    profile_image BLOB, -- 프로필 이미지
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 계정 생성 시간 기록
    last_login TIMESTAMP NULL DEFAULT NULL, -- 마지막 로그인 시간
    account_status ENUM('active', 'dormant', 'disabled') DEFAULT 'active',
    school_id INT NULL,
    points INT DEFAULT 0,
    FOREIGN KEY (school_id) REFERENCES School(school_id) ON DELETE CASCADE
);

CREATE TABLE StudyTimeRecords (
    record_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    record_date DATE, -- 일별 기록
    daily_time TIME DEFAULT '00:00:00', -- 하루 누적 공부 시간
    total_points INT DEFAULT 0, -- 포인트 저장
    monthly_time INT DEFAULT 0, -- 시간 저장
    total_time INT DEFAULT 0, -- 시간 저장
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE Medal(
   medal_id INT auto_increment PRIMARY KEY,
   user_id INT NOT NULL,
    school_id INT NOT NULL,
    school_name VARCHAR(100) NOT NULL,  # UNIQUE, 일단 중복 허용
    ranking INT DEFAULT NULL, -- 학교 순위 (월별 대회)
    monthly_total_time INT NULL,
    get_date VARCHAR(100),
    battle_inf VARCHAR(100) NULL, -- 대회 정보 (지역인지 전국인지)
    school_local VARCHAR(10) NULL,
   FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (school_id) REFERENCES School(school_id) ON DELETE CASCADE
);

CREATE TABLE Friends (
    friendship_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    friend_id INT NOT NULL,
    status ENUM('requested', 'accepted', 'blocked') DEFAULT 'requested',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES Users(user_id) ON DELETE CASCADE
);



CREATE TABLE Store (
    item_id INT AUTO_INCREMENT PRIMARY KEY,  -- 아이템 고유 ID
    item_name VARCHAR(255) NOT NULL,          -- 아이템 이름
    category VARCHAR(100) NOT NULL,           -- 아이템 카테고리 (예: "동물", "책상")
    description TEXT,                         -- 아이템 설명
    price INT NOT NULL,                       -- 아이템 가격 (포인트 단위)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP  -- 아이템 등록일 (기본값: 현재 시간)
);

CREATE TABLE Inventory (
    inventory_id INT AUTO_INCREMENT PRIMARY KEY,  -- 인벤토리 고유 ID
    user_id INT NOT NULL,                         -- 사용자 ID (user 테이블의 외래 키)
    item_id INT NOT NULL,                         -- 아이템 ID (Shop 테이블의 외래 키)
    x DOUBLE,
    y DOUBLE,
    category VARCHAR(100) NOT NULL,               -- 아이템 카테고리 (예: "동물", "책상")
    acquired_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 아이템 획득일 (기본값: 현재 시간)
    is_placed BOOLEAN DEFAULT FALSE,              -- 아이템이 홈에 배치되었는지 여부 (기본값: FALSE)
    priority INT DEFAULT 0,                        -- 아이템 배치 우선 순위
       
    -- 외래 키 제약조건
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,  -- user 테이블의 user_id를 참조
    FOREIGN KEY (item_id) REFERENCES Store(item_id) ON DELETE CASCADE   -- Shop 테이블의 item_id를 참조
);

CREATE TABLE Notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,  -- 알림 고유 ID
    user_id INT NOT NULL,                            -- 사용자 ID (Users 테이블의 외래 키)
    title VARCHAR(255) NOT NULL,                    -- 알림 제목
    message TEXT NOT NULL,                          -- 알림 내용
    type ENUM('system', 'reward', 'friend_request', 'custom') DEFAULT 'custom', -- 알림 유형
    is_read BOOLEAN DEFAULT FALSE,                  -- 읽음 여부 (기본값: 읽지 않음)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 알림 생성 시간
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE -- 사용자와 관계 설정
);

CREATE TABLE Log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


DROP PROCEDURE IF EXISTS CreateNotification;
DELIMITER $$
CREATE PROCEDURE CreateNotification(
    IN input_user_id INT,
    IN input_title VARCHAR(255),
    IN input_message TEXT,
    IN input_type ENUM('system', 'reward', 'friend_request', 'custom')
)
BEGIN
    INSERT INTO Notifications (user_id, title, message, type)
    VALUES (input_user_id, input_title, input_message, input_type);
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS MarkNotificationAsRead;
DELIMITER $$
CREATE PROCEDURE MarkNotificationAsRead(
    IN input_notification_id INT
)
BEGIN
    UPDATE Notifications
    SET is_read = TRUE
    WHERE notification_id = input_notification_id;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS GetUserNotifications;
DELIMITER $$
CREATE PROCEDURE GetUserNotifications(
    IN input_user_id INT
)
BEGIN
    SELECT 
        notification_id, 
        title, 
        message, 
        type, 
        is_read, 
        created_at
    FROM Notifications
    WHERE user_id = input_user_id
    ORDER BY created_at DESC;
END$$
DELIMITER ;

-- 개인 공부 시간 누적 및 포인트 계산 프로시저
DROP PROCEDURE IF EXISTS CalculateTimeAndPoints_proc;
DELIMITER $$

CREATE PROCEDURE CalculateTimeAndPoints_proc(
    IN input_record_time TIME, 
    IN input_user_id INT
)
BEGIN
    DECLARE total_minutes INT;
    DECLARE new_points INT;
    DECLARE user_school_id INT;

    -- 공부 시간을 분 단위로 변환하고 포인트 계산
    SET total_minutes = TIME_TO_SEC(input_record_time) / 60;
    SET new_points = total_minutes * 100;

    -- 사용자의 학교 이름 가져오기
     SELECT school_id INTO user_school_id
    FROM Users 
    WHERE user_id = input_user_id;

    -- 사용자의 일별 공부 시간과 포인트 누적
    UPDATE StudyTimeRecords
    SET daily_time = ADDTIME(daily_time, input_record_time),
        total_points = total_points + new_points,
   monthly_time = monthly_time + total_minutes,
        total_time = total_time + total_minutes
    WHERE user_id = input_user_id; 


    -- 사용자의 총 포인트 누적
    UPDATE Users
    SET points = points + new_points
    WHERE user_id = input_user_id;

    -- 사용자의 학교가 존재하는 경우에만 월별 공부 시간 및 포인트 누적
    IF user_school_id IS NOT NULL THEN
        UPDATE School
        SET monthly_total_time = monthly_total_time + total_minutes,
            total_time = total_time + total_minutes,
            total_points = total_points + new_points
        WHERE school_id = user_school_id;

        -- 학교별 랭킹 업데이트, 레벨 업데이트 프로시저 호출
        CALL update_school_monthly_ranking();
        CALL update_school_total_ranking();
   CALL update_school_local_ranking();
        CALL UpdateSchoolLevel();
    END IF;
END $$

DELIMITER ;

-- 토탈 랭킹 업데이트
DROP PROCEDURE IF EXISTS update_school_total_ranking;
DELIMITER $$
CREATE PROCEDURE update_school_total_ranking()
BEGIN
    -- 학교 순위 계산을 위해 임시 테이블을 생성
    DROP TEMPORARY TABLE IF EXISTS temp_rank;
    CREATE TEMPORARY TABLE temp_rank AS
    SELECT 
        s.school_id,
        s.school_name,
        s.total_time,
        RANK() OVER (ORDER BY s.total_time DESC) AS school_rank
    FROM School s;

    -- 임시 테이블에서 순위를 School 테이블에 업데이트
    UPDATE School sbr
    JOIN temp_rank tr ON sbr.school_id = tr.school_id
    SET sbr.total_ranking = tr.school_rank;

    -- 임시 테이블 삭제
    DROP TEMPORARY TABLE IF EXISTS temp_rank;
END $$
DELIMITER ;

-- 월별 랭킹 업데이트
DROP PROCEDURE IF EXISTS update_school_monthly_ranking;
DELIMITER $$
CREATE PROCEDURE update_school_monthly_ranking()
BEGIN
    -- 학교 순위 계산을 위해 임시 테이블을 생성
    DROP TEMPORARY TABLE IF EXISTS temp_rank;
    CREATE TEMPORARY TABLE temp_rank AS
    SELECT 
        s.school_id,
        s.school_name,
        s.monthly_total_time,
        RANK() OVER (ORDER BY s.monthly_total_time DESC) AS school_rank
    FROM School s;

    -- 임시 테이블에서 순위를 SchoolBattleRecords 테이블에 업데이트
    UPDATE School sbr
    JOIN temp_rank tr ON sbr.school_id = tr.school_id
    SET sbr.monthly_ranking = tr.school_rank;

    -- 임시 테이블 삭제
    DROP TEMPORARY TABLE IF EXISTS temp_rank;
END $$
DELIMITER ;

-- 지역 랭킹 업데이트
DROP PROCEDURE IF EXISTS update_school_local_ranking;
DELIMITER $$
CREATE PROCEDURE update_school_local_ranking()
BEGIN
    -- 지역별 순위 계산을 위해 임시 테이블 생성
    DROP TEMPORARY TABLE IF EXISTS temp_local_rank;
    CREATE TEMPORARY TABLE temp_local_rank AS
    SELECT 
        s.school_id,
        s.school_name,
        s.school_local,
        s.monthly_total_time,
        RANK() OVER (PARTITION BY s.school_local ORDER BY s.monthly_total_time DESC) AS local_rank
    FROM School s
    WHERE s.school_local IS NOT NULL; -- 지역 정보가 있는 경우만 처리

    -- 임시 테이블에서 지역별 순위를 School 테이블에 업데이트
    UPDATE School sbr
    JOIN temp_local_rank tlr ON sbr.school_id = tlr.school_id
    SET sbr.local_ranking = tlr.local_rank;

     -- 임시 테이블 삭제
    DROP TEMPORARY TABLE IF EXISTS temp_local_rank;
END $$
DELIMITER ;

DROP PROCEDURE IF EXISTS UpdateSchoolLevel;
DELIMITER //
CREATE PROCEDURE UpdateSchoolLevel()
BEGIN
    UPDATE School
    SET 
        school_level = CASE
            WHEN total_points < 600000 THEN 1
            WHEN total_points >= 600000 AND total_points < 3000000 THEN 2       -- 100 * 600 = 60000, 500 * 600 = 240000
            WHEN total_points >= 3000000 AND total_points < 15000000 THEN 3     -- 2500 * 600 = 1500000
            WHEN total_points >= 15000000 AND total_points < 62500000 THEN 4    -- 12500 * 600 = 6250000
            WHEN total_points >= 62500000 AND total_points < 255000000 THEN 5  -- 42500 * 600 = 25500000
            WHEN total_points >= 255000000 AND total_points < 510000000 THEN 6  -- 85000 * 600 = 51000000
            WHEN total_points >= 510000000 THEN 7
            ELSE school_level
        END;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS purchaseItem;
DELIMITER $$
CREATE PROCEDURE purchaseItem(
    IN input_user_id INT, 
    IN input_item_id INT, 
    IN input_item_price INT
)
BEGIN
    DECLARE item_category VARCHAR(100);

    -- 아이템의 카테고리 가져오기
    SELECT category INTO item_category
    FROM Store
    WHERE item_id = input_item_id;

    -- 사용자의 포인트가 충분한지 확인
    IF (SELECT points FROM Users WHERE user_id = input_user_id) >= input_item_price THEN
        -- 포인트 차감
        UPDATE Users
        SET points = points - input_item_price
        WHERE user_id = input_user_id;

        -- 인벤토리에 아이템 추가
        INSERT INTO Inventory (user_id, item_id, category, acquired_at)
        VALUES (input_user_id, input_item_id, item_category, NOW());
    ELSE
        -- 포인트 부족 시 오류 발생
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '포인트가 부족합니다.';
    END IF;
END$$
DELIMITER ;



START TRANSACTION;

-- 서울고등학교 (school_id: 1) Lv.5
INSERT INTO `School` (`school_name`, `monthly_total_time`, `total_time`, `total_points`, `total_ranking`, `monthly_ranking`, `school_level`, `school_local`, `start_date`, `end_date`)
VALUES
('서울고등학교', 0, 625000, 62500000, NULL, NULL, 1, '서울', '2024-01-01', NULL);

-- 부산고등학교 (school_id: 2) Lv.4
INSERT INTO `School` (`school_name`, `monthly_total_time`, `total_time`, `total_points`, `total_ranking`, `monthly_ranking`, `school_level`, `school_local`, `start_date`, `end_date`)
VALUES
('부산고등학교', 0, 150000, 15000000, NULL, NULL, 1, '부산', '2024-01-01', NULL);

-- 동아고등학교 (school_id: 3) Lv.6
INSERT INTO `School` (`school_name`, `monthly_total_time`, `total_time`, `total_points`, `total_ranking`, `monthly_ranking`, `school_level`, `school_local`, `start_date`, `end_date`)
VALUES
('동아고등학교', 0, 5098349, 509834900, NULL, NULL, 1, '부산', '2024-01-01', NULL);

-- 창원고등학교 (school_id: 4) Lv.7
INSERT INTO `School` (`school_name`, `monthly_total_time`, `total_time`, `total_points`, `total_ranking`, `monthly_ranking`, `school_level`, `school_local`, `start_date`, `end_date`)
VALUES
('창원고등학교', 0, 5100000, 510000000, NULL, NULL, 1, '창원', '2024-01-01', NULL);

-- 다대고등학교 (school_id: 5) Lv.1
INSERT INTO `School` (`school_name`, `monthly_total_time`, `total_time`, `total_points`, `total_ranking`, `monthly_ranking`, `school_level`, `school_local`, `start_date`, `end_date`)
VALUES
('다대고등학교', 0, 0, 0, NULL, NULL, 1, '부산', '2024-01-01', NULL);

-- 울산고등학교 (school_id: 6) Lv.2
INSERT INTO `School` (`school_name`, `monthly_total_time`, `total_time`, `total_points`, `total_ranking`, `monthly_ranking`, `school_level`, `school_local`, `start_date`, `end_date`)
VALUES
('울산고등학교', 0, 6000, 600000, NULL, NULL, 1, '울산', '2024-01-01', NULL);

-- 인천고등학교 (school_id: 7) Lv.3
INSERT INTO `School` (`school_name`, `monthly_total_time`, `total_time`, `total_points`, `total_ranking`, `monthly_ranking`, `school_level`, `school_local`, `start_date`, `end_date`)
VALUES
('인천고등학교', 0, 30000, 3000000, NULL, NULL, 1, '인천', '2024-01-01', NULL);

-- 포항고등학교 (school_id: 8) Lv.3
INSERT INTO `School` (`school_name`, `monthly_total_time`, `total_time`, `total_points`, `total_ranking`, `monthly_ranking`, `school_level`, `school_local`, `start_date`, `end_date`)
VALUES
('포항고등학교', 0, 30000, 3000000, NULL, NULL, 1, '포항', '2024-01-01', NULL);

-- 중앙고등학교 (school_id: 9) Lv.4
INSERT INTO `School` (`school_name`, `monthly_total_time`, `total_time`, `total_points`, `total_ranking`, `monthly_ranking`, `school_level`, `school_local`, `start_date`, `end_date`)
VALUES
('중앙고등학교', 0, 150000, 15000000, NULL, NULL, 1, '서울', '2024-01-01', NULL);

-- 용호고등학교 (school_id: 10) Lv.5
INSERT INTO `School` (`school_name`, `monthly_total_time`, `total_time`, `total_points`, `total_ranking`, `monthly_ranking`, `school_level`, `school_local`, `start_date`, `end_date`)
VALUES
('용호고등학교', 0, 625000, 62500000, NULL, NULL, 1, '창원', '2024-01-01', NULL);


-- 서울고등학교 (school_id: 1)
INSERT INTO `Users` (`email`, `password`, `nickname`, `school_name`, `school_id`)
VALUES
('user1@naver.com', '1234', 'user1', '서울고등학교', 1),  -- user1
('user2@naver.com', '1234', 'user2', '서울고등학교', 1),  -- user2
('user3@naver.com', '1234', 'user3', '서울고등학교', 1),  -- user3
('user4@naver.com', '1234', 'user4', '서울고등학교', 1),  -- user4
('user5@naver.com', '1234', 'user5', '서울고등학교', 1),  -- user5
('user6@naver.com', '1234', 'user6', '서울고등학교', 1),  -- user6
('user7@naver.com', '1234', 'user7', '서울고등학교', 1),  -- user7
('user8@naver.com', '1234', 'user8', '서울고등학교', 1),  -- user8
('user9@naver.com', '1234', 'user9', '서울고등학교', 1),  -- user9
('user10@naver.com', '1234', 'user10', '서울고등학교', 1);  -- user10

-- 부산고등학교 (school_id: 2)
INSERT INTO `Users` (`email`, `password`, `nickname`, `school_name`, `school_id`)
VALUES
('user11@naver.com', '1234', 'user11', '부산고등학교', 2),  -- user11
('user12@naver.com', '1234', 'user12', '부산고등학교', 2),  -- user12
('user13@naver.com', '1234', 'user13', '부산고등학교', 2),  -- user13
('user14@naver.com', '1234', 'user14', '부산고등학교', 2),  -- user14
('user15@naver.com', '1234', 'user15', '부산고등학교', 2),  -- user15
('user16@naver.com', '1234', 'user16', '부산고등학교', 2),  -- user16
('user17@naver.com', '1234', 'user17', '부산고등학교', 2),  -- user17
('user18@naver.com', '1234', 'user18', '부산고등학교', 2),  -- user18
('user19@naver.com', '1234', 'user19', '부산고등학교', 2),  -- user19
('user20@naver.com', '1234', 'user20', '부산고등학교', 2);  -- user20

-- 동아고등학교 (school_id: 3)
INSERT INTO `Users` (`email`, `password`, `nickname`, `school_name`, `school_id`)
VALUES
('user21@naver.com', '1234', 'user21', '동아고등학교', 3),  -- user21
('user22@naver.com', '1234', 'user22', '동아고등학교', 3),  -- user22
('user23@naver.com', '1234', 'user23', '동아고등학교', 3),  -- user23
('user24@naver.com', '1234', 'user24', '동아고등학교', 3),  -- user24
('user25@naver.com', '1234', 'user25', '동아고등학교', 3),  -- user25
('user26@naver.com', '1234', 'user26', '동아고등학교', 3),  -- user26
('user27@naver.com', '1234', 'user27', '동아고등학교', 3),  -- user27
('user28@naver.com', '1234', 'user28', '동아고등학교', 3),  -- user28
('user29@naver.com', '1234', 'user29', '동아고등학교', 3),  -- user29
('user30@naver.com', '1234', 'user30', '동아고등학교', 3);  -- user30

-- 창원고등학교 (school_id: 4)
INSERT INTO `Users` (`email`, `password`, `nickname`, `school_name`, `school_id`)
VALUES
('user31@naver.com', '1234', 'user31', '창원고등학교', 4),  -- user31
('user32@naver.com', '1234', 'user32', '창원고등학교', 4),  -- user32
('user33@naver.com', '1234', 'user33', '창원고등학교', 4),  -- user33
('user34@naver.com', '1234', 'user34', '창원고등학교', 4),  -- user34
('user35@naver.com', '1234', 'user35', '창원고등학교', 4),  -- user35
('user36@naver.com', '1234', 'user36', '창원고등학교', 4),  -- user36
('user37@naver.com', '1234', 'user37', '창원고등학교', 4),  -- user37
('user38@naver.com', '1234', 'user38', '창원고등학교', 4),  -- user38
('user39@naver.com', '1234', 'user39', '창원고등학교', 4),  -- user39
('user40@naver.com', '1234', 'user40', '창원고등학교', 4);  -- user40

-- 다대고등학교 (school_id: 5)
INSERT INTO `Users` (`email`, `password`, `nickname`, `school_name`, `school_id`)
VALUES
('user41@naver.com', '1234', 'user41', '다대고등학교', 5),  -- user41
('user42@naver.com', '1234', 'user42', '다대고등학교', 5),  -- user42
('user43@naver.com', '1234', 'user43', '다대고등학교', 5),  -- user43
('user44@naver.com', '1234', 'user44', '다대고등학교', 5),  -- user44
('user45@naver.com', '1234', 'user45', '다대고등학교', 5),  -- user45
('user46@naver.com', '1234', 'user46', '다대고등학교', 5),  -- user46
('user47@naver.com', '1234', 'user47', '다대고등학교', 5),  -- user47
('user48@naver.com', '1234', 'user48', '다대고등학교', 5),  -- user48
('user49@naver.com', '1234', 'user49', '다대고등학교', 5),  -- user49
('user50@naver.com', '1234', 'user50', '다대고등학교', 5);  -- user50

-- 울산고등학교 (school_id: 6)
INSERT INTO `Users` (`email`, `password`, `nickname`, `school_name`, `school_id`)
VALUES
('user51@naver.com', '1234', 'user51', '울산고등학교', 6),  -- user51
('user52@naver.com', '1234', 'user52', '울산고등학교', 6),  -- user52
('user53@naver.com', '1234', 'user53', '울산고등학교', 6),  -- user53
('user54@naver.com', '1234', 'user54', '울산고등학교', 6),  -- user54
('user55@naver.com', '1234', 'user55', '울산고등학교', 6),  -- user55
('user56@naver.com', '1234', 'user56', '울산고등학교', 6),  -- user56
('user57@naver.com', '1234', 'user57', '울산고등학교', 6),  -- user57
('user58@naver.com', '1234', 'user58', '울산고등학교', 6),  -- user58
('user59@naver.com', '1234', 'user59', '울산고등학교', 6),  -- user59
('user60@naver.com', '1234', 'user60', '울산고등학교', 6);  -- user60

-- 인천고등학교 (school_id: 7)
INSERT INTO `Users` (`email`, `password`, `nickname`, `school_name`, `school_id`)
VALUES
('user61@naver.com', '1234', 'user61', '인천고등학교', 7),  -- user61
('user62@naver.com', '1234', 'user62', '인천고등학교', 7),  -- user62
('user63@naver.com', '1234', 'user63', '인천고등학교', 7),  -- user63
('user64@naver.com', '1234', 'user64', '인천고등학교', 7),  -- user64
('user65@naver.com', '1234', 'user65', '인천고등학교', 7),  -- user65
('user66@naver.com', '1234', 'user66', '인천고등학교', 7),  -- user66
('user67@naver.com', '1234', 'user67', '인천고등학교', 7),  -- user67
('user68@naver.com', '1234', 'user68', '인천고등학교', 7),  -- user68
('user69@naver.com', '1234', 'user69', '인천고등학교', 7),  -- user69
('user70@naver.com', '1234', 'user70', '인천고등학교', 7);  -- user70

-- 포항고등학교 (school_id: 8)
INSERT INTO `Users` (`email`, `password`, `nickname`, `school_name`, `school_id`)
VALUES
('user71@naver.com', '1234', 'user71', '포항고등학교', 8),  -- user71
('user72@naver.com', '1234', 'user72', '포항고등학교', 8),  -- user72
('user73@naver.com', '1234', 'user73', '포항고등학교', 8),  -- user73
('user74@naver.com', '1234', 'user74', '포항고등학교', 8),  -- user74
('user75@naver.com', '1234', 'user75', '포항고등학교', 8),  -- user75
('user76@naver.com', '1234', 'user76', '포항고등학교', 8),  -- user76
('user77@naver.com', '1234', 'user77', '포항고등학교', 8),  -- user77
('user78@naver.com', '1234', 'user78', '포항고등학교', 8),  -- user78
('user79@naver.com', '1234', 'user79', '포항고등학교', 8),  -- user79
('user80@naver.com', '1234', 'user80', '포항고등학교', 8);  -- user80

-- 중앙고등학교 (school_id: 9)
INSERT INTO `Users` (`email`, `password`, `nickname`, `school_name`, `school_id`)
VALUES
('user81@naver.com', '1234', 'user81', '중앙고등학교', 9),  -- user81
('user82@naver.com', '1234', 'user82', '중앙고등학교', 9),  -- user82
('user83@naver.com', '1234', 'user83', '중앙고등학교', 9),  -- user83
('user84@naver.com', '1234', 'user84', '중앙고등학교', 9),  -- user84
('user85@naver.com', '1234', 'user85', '중앙고등학교', 9),  -- user85
('user86@naver.com', '1234', 'user86', '중앙고등학교', 9),  -- user86
('user87@naver.com', '1234', 'user87', '중앙고등학교', 9),  -- user87
('user88@naver.com', '1234', 'user88', '중앙고등학교', 9),  -- user88
('user89@naver.com', '1234', 'user89', '중앙고등학교', 9),  -- user89
('user90@naver.com', '1234', 'user90', '중앙고등학교', 9);  -- user90

-- 용호고등학교 (school_id: 10)
INSERT INTO `Users` (`email`, `password`, `nickname`, `school_name`, `school_id`)
VALUES
('user91@naver.com', '1234', 'user91', '용호고등학교', 10),  -- user91
('user92@naver.com', '1234', 'user92', '용호고등학교', 10),  -- user92
('user93@naver.com', '1234', 'user93', '용호고등학교', 10),  -- user93
('user94@naver.com', '1234', 'user94', '용호고등학교', 10),  -- user94
('user95@naver.com', '1234', 'user95', '용호고등학교', 10),  -- user95
('user96@naver.com', '1234', 'user96', '용호고등학교', 10),  -- user96
('user97@naver.com', '1234', 'user97', '용호고등학교', 10),  -- user97
('user98@naver.com', '1234', 'user98', '용호고등학교', 10),  -- user98
('user99@naver.com', '1234', 'user99', '용호고등학교', 10),  -- user99
('user100@naver.com', '1234', 'user100', '용호고등학교', 10);  -- user100

START TRANSACTION;

-- 서울고등학교 (school_id: 1)
INSERT INTO `StudyTimeRecords` (`user_id`, `record_date`, `daily_time`, `total_points`, `monthly_time`, `total_time`)
VALUES
(1, '2024-11-01', '02:30:00', 15000, 150, 62648),
(2, '2024-11-01', '03:00:00', 18000, 180, 62648),
(3, '2024-11-01', '01:45:00', 10500, 105, 62648),
(4, '2024-11-01', '02:15:00', 13500, 135, 62648),
(5, '2024-11-01', '01:30:00', 9000, 90, 62648),
(6, '2024-11-01', '03:20:00', 20000, 200, 62648),
(7, '2024-11-01', '02:50:00', 17000, 170, 62648),
(8, '2024-11-01', '01:20:00', 8000, 80, 62648),
(9, '2024-11-01', '04:00:00', 24000, 240, 62648),
(10, '2024-11-01', '02:10:00', 13000, 130, 62648);

-- 부산고등학교 (school_id: 2)
INSERT INTO `StudyTimeRecords` (`user_id`, `record_date`, `daily_time`, `total_points`, `monthly_time`, `total_time`)
VALUES
(11, '2024-11-01', '02:45:00', 16500, 165,15138),
(12, '2024-11-01', '01:40:00', 10000, 100,15138),
(13, '2024-11-01', '03:15:00', 19500, 195,15138),
(14, '2024-11-01', '02:20:00', 14000, 140,15138),
(15, '2024-11-01', '01:50:00', 11000, 110,15138),
(16, '2024-11-01', '02:10:00', 13000, 130,15138),
(17, '2024-11-01', '01:30:00', 9000, 90,15138),
(18, '2024-11-01', '03:10:00', 19000, 190,15138),
(19, '2024-11-01', '02:55:00', 17500, 175,15138),
(20, '2024-11-01', '01:25:00', 8500, 85,15138);

-- 동아고등학교 (school_id: 3)
INSERT INTO `StudyTimeRecords` (`user_id`, `record_date`, `daily_time`, `total_points`, `monthly_time`, `total_time`)
VALUES
(21, '2024-11-01', '03:30:00', 21000,210,255165),
(22, '2024-11-01', '02:50:00', 17000,170,255165),
(23, '2024-11-01', '02:00:00', 12000,120,255165),
(24, '2024-11-01', '04:10:00', 25000, 250,255165),
(25, '2024-11-01', '03:20:00', 20000, 200,255165),
(26, '2024-11-01', '01:45:00', 10500, 105,255165),
(27, '2024-11-01', '02:15:00', 13500, 135,255165),
(28, '2024-11-01', '03:40:00', 22000, 220,255165),
(29, '2024-11-01', '02:30:00', 15000, 150,255165),
(30, '2024-11-01', '01:30:00', 9000, 90,255165);

-- 창원고등학교 (school_id: 4)
INSERT INTO `StudyTimeRecords` (`user_id`, `record_date`, `daily_time`, `total_points`, `monthly_time`, `total_time`)
VALUES
(31, '2024-11-01', '04:00:00', 24000, 240,510165),
(32, '2024-11-01', '03:10:00', 19000, 190,510165),
(33, '2024-11-01', '02:45:00', 16500, 165,510165),
(34, '2024-11-01', '01:50:00', 11000, 110,510165),
(35, '2024-11-01', '02:20:00', 14000, 140,510165),
(36, '2024-11-01', '02:30:00', 15000, 150,510165),
(37, '2024-11-01', '03:30:00', 21000, 210,510165),
(38, '2024-11-01', '02:10:00', 13000, 130,510165),
(39, '2024-11-01', '01:30:00', 9000, 90,510165),
(40, '2024-11-01', '03:45:00', 22500, 225,510165);

-- 다대고등학교 (school_id: 5)
INSERT INTO `StudyTimeRecords` (`user_id`, `record_date`, `daily_time`, `total_points`, `monthly_time`,`total_time`)
VALUES
(41, '2024-11-01', '01:40:00', 10000, 100, 141),
(42, '2024-11-01', '02:55:00', 17500, 175, 141),
(43, '2024-11-01', '03:15:00', 19500, 195, 141),
(44, '2024-11-01', '02:20:00', 14000, 140, 141),
(45, '2024-11-01', '02:10:00', 13000, 130, 141),
(46, '2024-11-01', '01:45:00', 10500, 105, 141),
(47, '2024-11-01', '03:00:00', 18000, 180, 141),
(48, '2024-11-01', '02:25:00', 14500, 145, 141),
(49, '2024-11-01', '02:40:00', 16000, 160, 141),
(50, '2024-11-01', '01:20:00', 8000, 80, 141);

-- 울산고등학교 (school_id: 6)
INSERT INTO `StudyTimeRecords` (`user_id`, `record_date`, `daily_time`, `total_points`, `monthly_time`,`total_time`)
VALUES
(51, '2024-11-01', '02:50:00', 17000, 170, 753),
(52, '2024-11-01', '02:15:00', 13500, 135, 753),
(53, '2024-11-01', '03:10:00', 19000, 190, 753),
(54, '2024-11-01', '01:45:00', 10500, 105, 753),
(55, '2024-11-01', '03:30:00', 21000, 210, 753),
(56, '2024-11-01', '04:00:00', 24000, 240, 753),
(57, '2024-11-01', '02:00:00', 12000, 120, 753),
(58, '2024-11-01', '01:30:00', 9000, 90, 753),
(59, '2024-11-01', '02:25:00', 14500, 145, 753),
(60, '2024-11-01', '02:05:00', 12500, 125, 753);

-- 인천고등학교 (school_id: 7)
INSERT INTO `StudyTimeRecords` (`user_id`, `record_date`, `daily_time`, `total_points`,`monthly_time`, `total_time`)
VALUES
(61, '2024-11-01', '03:00:00', 18000, 180, 3157),
(62, '2024-11-01', '02:30:00', 15000, 150, 3157),
(63, '2024-11-01', '01:50:00', 11000, 110, 3157),
(64, '2024-11-01', '03:40:00', 22000, 220, 3157),
(65, '2024-11-01', '02:15:00', 13500, 135, 3157),
(66, '2024-11-01', '04:10:00', 25000, 250, 3157),
(67, '2024-11-01', '02:50:00', 17000, 170, 3157),
(68, '2024-11-01', '01:30:00', 9000, 90, 3157),
(69, '2024-11-01', '02:05:00', 12500, 125, 3157),
(70, '2024-11-01', '02:20:00', 14000, 140, 3157);

-- 포항고등학교 (school_id: 8)
INSERT INTO `StudyTimeRecords` (`user_id`, `record_date`, `daily_time`, `total_points`,`monthly_time`, `total_time`)
VALUES
(71, '2024-11-01', '02:10:00', 13000, 130, 3149),
(72, '2024-11-01', '03:20:00', 20000, 200, 3149),
(73, '2024-11-01', '01:50:00', 11000, 110, 3149),
(74, '2024-11-01', '03:00:00', 18000, 180, 3149),
(75, '2024-11-01', '02:45:00', 16500, 165, 3149),
(76, '2024-11-01', '01:40:00', 10000, 100, 3149),
(77, '2024-11-01', '03:50:00', 23000, 230, 3149),
(78, '2024-11-01', '02:30:00', 15000, 150, 3149),
(79, '2024-11-01', '02:20:00', 14000, 140, 3149),
(80, '2024-11-01', '01:25:00', 8500, 85, 3149);

-- 중앙고등학교 (school_id: 9)
INSERT INTO `StudyTimeRecords` (`user_id`, `record_date`, `daily_time`, `total_points`, `monthly_time`,`total_time`)
VALUES
(81, '2024-11-01', '04:00:00', 24000, 240, 15155),
(82, '2024-11-01', '02:20:00', 14000, 140, 15155),
(83, '2024-11-01', '01:50:00', 11000, 110, 15155),
(84, '2024-11-01', '03:30:00', 21000, 210, 15155),
(85, '2024-11-01', '02:40:00', 16000, 160, 15155),
(86, '2024-11-01', '02:00:00', 12000, 120, 15155),
(87, '2024-11-01', '03:00:00', 18000, 180, 15155),
(88, '2024-11-01', '02:25:00', 14500, 145, 15155),
(89, '2024-11-01', '02:50:00', 17000, 170, 15155),
(90, '2024-11-01', '01:15:00', 7500, 75, 15155);

-- 용호고등학교 (school_id: 10)
INSERT INTO `StudyTimeRecords` (`user_id`, `record_date`, `daily_time`, `total_points`, `monthly_time`,`total_time`)
VALUES
(91, '2024-11-01', '03:10:00', 19000, 190, 62658),
(92, '2024-11-01', '02:50:00', 17000, 170, 62658),
(93, '2024-11-01', '01:45:00', 10500, 105, 62658),
(94, '2024-11-01', '02:40:00', 16000, 160, 62658),
(95, '2024-11-01', '03:25:00', 20500, 205, 62658),
(96, '2024-11-01', '02:15:00', 13500, 135, 62658),
(97, '2024-11-01', '02:30:00', 15000, 150, 62658),
(98, '2024-11-01', '04:00:00', 24000, 240, 62658),
(99, '2024-11-01', '01:35:00', 9500, 95, 62658),
(100, '2024-11-01', '02:10:00', 13000, 130, 62658);

COMMIT;

-- 각 학교의 monthly_total_time 업데이트 (학교별 total_time 합산)
-- 서울고등학교 (school_id: 1)
UPDATE `School` 
SET `monthly_total_time` = 150 + 180 + 105 + 135 + 90 + 200 + 170 + 80 + 240 + 130,
    `total_time` =  625000 + 150 + 180 + 105 + 135 + 90 + 200 + 170 + 80 + 240 + 130,
    `total_points` = 62500000 + (150 * 100) + (180 * 100) + (105 * 100) + (135 * 100) + (90 * 100) + (200 * 100) + (170 * 100) + (80 * 100) + (240 * 100) + (130 * 100)
WHERE `school_id` = 1;

-- 부산고등학교 (school_id: 2)
UPDATE `School` 
SET `monthly_total_time` = 165 + 100 + 195 + 140 + 110 + 130 + 90 + 190 + 175 + 85,
    `total_time` = 150000 + 165 + 100 + 195 + 140 + 110 + 130 + 90 + 190 + 175 + 85,
    `total_points` = 15000000 + (165 * 100) + (100 * 100) + (195 * 100) + (140 * 100) + (110 * 100) + (130 * 100) + (90 * 100) + (190 * 100) + (175 * 100) + (85 * 100)
WHERE `school_id` = 2;

-- 동아고등학교 (school_id: 3)
UPDATE `School` 
SET `monthly_total_time` = 210 + 170 + 120 + 250 + 200 + 105 + 135 + 220 + 150 + 90,
    `total_time` =  2550000 + 210 + 170 + 120 + 250 + 200 + 105 + 135 + 220 + 150 + 90,
    `total_points` =  509834900 + (210 * 100) + (170 * 100) + (120 * 100) + (250 * 100) + (200 * 100) + (105 * 100) + (135 * 100) + (220 * 100) + (150 * 100) + (90 * 100)
WHERE `school_id` = 3;

-- 창원고등학교 (school_id: 4)
UPDATE `School` 
SET `monthly_total_time` = 240 + 190 + 165 + 110 + 140 + 150 + 210 + 130 + 90 + 225,
    `total_time` = 5100000 + 240 + 190 + 165 + 110 + 140 + 150 + 210 + 130 + 90 + 225,
    `total_points` = 510000000 + (240 * 100) + (190 * 100) + (165 * 100) + (110 * 100) + (140 * 100) + (150 * 100) + (210 * 100) + (130 * 100) + (90 * 100) + (225 * 100)
WHERE `school_id` = 4;

-- 다대고등학교 (school_id: 5)
UPDATE `School` 
SET `monthly_total_time` = 100 + 175 + 195 + 140 + 130 + 105 + 180 + 145 + 160 + 80,
    `total_time` = 100 + 175 + 195 + 140 + 130 + 105 + 180 + 145 + 160 + 80,
    `total_points` = (100 * 100) + (175 * 100) + (195 * 100) + (140 * 100) + (130 * 100) + (105 * 100) + (180 * 100) + (145 * 100) + (160 * 100) + (80 * 100)
WHERE `school_id` = 5;

-- 울산고등학교 (school_id: 6)
UPDATE `School` 
SET `monthly_total_time` = 170 + 135 + 190 + 105 + 210 + 240 + 120 + 90 + 145 + 125,
    `total_time` =  6000 + 170 + 135 + 190 + 105 + 210 + 240 + 120 + 90 + 145 + 125,
    `total_points` =  600000 + (170 * 100) + (135 * 100) + (190 * 100) + (105 * 100) + (210 * 100) + (240 * 100) + (120 * 100) + (90 * 100) + (145 * 100) + (125 * 100)
WHERE `school_id` = 6;

-- 인천고등학교 (school_id: 7)
UPDATE `School` 
SET `monthly_total_time` = 180 + 150 + 110 + 220 + 135 + 250 + 170 + 90 + 125 + 140,
    `total_time` = 30000 + 180 + 150 + 110 + 220 + 135 + 250 + 170 + 90 + 125 + 140,
    `total_points` = 3000000 + (180 * 100) + (150 * 100) + (110 * 100) + (220 * 100) + (135 * 100) + (250 * 100) + (170 * 100) + (90 * 100) + (125 * 100) + (140 * 100)
WHERE `school_id` = 7;

-- 포항고등학교 (school_id: 8)
UPDATE `School` 
SET `monthly_total_time` = 130 + 200 + 110 + 180 + 165 + 100 + 230 + 150 + 140 + 85,
    `total_time` = 30000 + 130 + 200 + 110 + 180 + 165 + 100 + 230 + 150 + 140 + 85,
    `total_points` = 3000000 + (130 * 100) + (200 * 100) + (110 * 100) + (180 * 100) + (165 * 100) + (100 * 100) + (230 * 100) + (150 * 100) + (140 * 100) + (85 * 100)
WHERE `school_id` = 8;

-- 중앙고등학교 (school_id: 9)
UPDATE `School` 
SET `monthly_total_time` = 240 + 140 + 110 + 210 + 160 + 120 + 180 + 145 + 170 + 75,
    `total_time` = 150000 + 240 + 140 + 110 + 210 + 160 + 120 + 180 + 145 + 170 + 75,
    `total_points` = 15000000 + (240 * 100) + (140 * 100) + (110 * 100) + (210 * 100) + (160 * 100) + (120 * 100) + (180 * 100) + (145 * 100) + (170 * 100) + (75 * 100)
WHERE `school_id` = 9;

-- 용호고등학교 (school_id: 10)
UPDATE `School` 
SET `monthly_total_time` = 190 + 170 + 105 + 160 + 205 + 135 + 150 + 240 + 95 + 130,
    `total_time` = 625000 + 190 + 170 + 105 + 160 + 205 + 135 + 150 + 240 + 95 + 130,
    `total_points` = 62500000 + (190 * 100) + (170 * 100) + (105 * 100) + (160 * 100) + (205 * 100) + (135 * 100) + (150 * 100) + (240 * 100) + (95 * 100) + (130 * 100)
WHERE `school_id` = 10;

COMMIT;

INSERT INTO Medal(user_id, school_id, school_name, ranking, monthly_total_time, get_date, battle_inf, school_local)
VALUES
(20, 3, '동아고등학교', 1, 1651, '2024년 10월', '2024년 10월 전국 대회 메달', '부산'),
(21, 3, '동아고등학교', 1, 1651, '2024년 10월', '2024년 10월 전국 대회 메달', '부산'),
(22, 3, '동아고등학교', 1, 1651, '2024년 10월', '2024년 10월 전국 대회 메달', '부산'),
(23, 3, '동아고등학교', 1, 1651, '2024년 10월', '2024년 10월 전국 대회 메달', '부산'),
(24, 3, '동아고등학교', 1, 1651, '2024년 10월', '2024년 10월 전국 대회 메달', '부산'),
(25, 3, '동아고등학교', 1, 1651, '2024년 10월', '2024년 10월 전국 대회 메달', '부산'),
(26, 3, '동아고등학교', 1, 1651, '2024년 10월', '2024년 10월 전국 대회 메달', '부산'),
(27, 3, '동아고등학교', 1, 1651, '2024년 10월', '2024년 10월 전국 대회 메달', '부산'),
(28, 3, '동아고등학교', 1, 1651, '2024년 10월', '2024년 10월 전국 대회 메달', '부산'),
(29, 3, '동아고등학교', 1, 1651, '2024년 10월', '2024년 10월 전국 대회 메달', '부산'),
(31, 4, '창원고등학교', 2, 1650, '2024년 10월', '2024년 10월 전국 대회 메달', '창원'),
(32, 4, '창원고등학교', 2, 1650, '2024년 10월', '2024년 10월 전국 대회 메달', '창원'),
(33, 4, '창원고등학교', 2, 1650, '2024년 10월', '2024년 10월 전국 대회 메달', '창원'),
(34, 4, '창원고등학교', 2, 1650, '2024년 10월', '2024년 10월 전국 대회 메달', '창원'),
(35, 4, '창원고등학교', 2, 1650, '2024년 10월', '2024년 10월 전국 대회 메달', '창원'),
(36, 4, '창원고등학교', 2, 1650, '2024년 10월', '2024년 10월 전국 대회 메달', '창원'),
(37, 4, '창원고등학교', 2, 1650, '2024년 10월', '2024년 10월 전국 대회 메달', '창원'),
(38, 4, '창원고등학교', 2, 1650, '2024년 10월', '2024년 10월 전국 대회 메달', '창원'),
(39, 4, '창원고등학교', 2, 1650, '2024년 10월', '2024년 10월 전국 대회 메달', '창원'),
(40, 4, '창원고등학교', 2, 1650, '2024년 10월', '2024년 10월 전국 대회 메달', '창원'),
(91, 10, '용호고등학교', 3, 1580, '2024년 10월', '2024년 10월 전국 대회 메달', '창원'),
(92, 10, '용호고등학교', 3, 1580, '2024년 10월', '2024년 10월 전국 대회 메달', '창원'),
(93, 10, '용호고등학교', 3, 1580, '2024년 10월', '2024년 10월 전국 대회 메달', '창원'),
(94, 10, '용호고등학교', 3, 1580, '2024년 10월', '2024년 10월 전국 대회 메달', '창원'),
(95, 10, '용호고등학교', 3, 1580, '2024년 10월', '2024년 10월 전국 대회 메달', '창원'),
(96, 10, '용호고등학교', 3, 1580, '2024년 10월', '2024년 10월 전국 대회 메달', '창원'),
(97, 10, '용호고등학교', 3, 1580, '2024년 10월', '2024년 10월 전국 대회 메달', '창원'),
(98, 10, '용호고등학교', 3, 1580, '2024년 10월', '2024년 10월 전국 대회 메달', '창원'),
(99, 10, '용호고등학교', 3, 1580, '2024년 10월', '2024년 10월 전국 대회 메달', '창원'),
(100, 10, '용호고등학교', 3, 1580, '2024년 10월', '2024년 10월 전국 대회 메달', '창원'),
(1, 1, '서울고등학교', 1, 2000, '2024년 9월', '2024년 9월 전국 대회 메달', '서울'),
(2, 1, '서울고등학교', 1, 2000, '2024년 9월', '2024년 9월 전국 대회 메달', '서울'),
(3, 1, '서울고등학교', 1, 2000, '2024년 9월', '2024년 9월 전국 대회 메달', '서울'),
(4, 1, '서울고등학교', 1, 2000, '2024년 9월', '2024년 9월 전국 대회 메달', '서울'),
(5, 1, '서울고등학교', 1, 2000, '2024년 9월', '2024년 9월 전국 대회 메달', '서울'),
(6, 1, '서울고등학교', 1, 2000, '2024년 9월', '2024년 9월 전국 대회 메달', '서울'),
(7, 1, '서울고등학교', 1, 2000, '2024년 9월', '2024년 9월 전국 대회 메달', '서울'),
(8, 1, '서울고등학교', 1, 2000, '2024년 9월', '2024년 9월 전국 대회 메달', '서울'),
(9, 1, '서울고등학교', 1, 2000, '2024년 9월', '2024년 9월 전국 대회 메달', '서울'),
(10, 1, '서울고등학교', 1, 2000, '2024년 9월', '2024년 9월 전국 대회 메달', '서울');

INSERT INTO Store (item_name, category, description, price)
VALUES
-- 가구 카테고리
('책상1', '가구', '튼튼하고 넉넉한 크기의 나무 책상', 500),
('책상2', '가구', '튼튼하고 넉넉한 크기의 나무 책상', 500),
('책상3', '가구', '튼튼하고 넉넉한 크기의 나무 책상', 500),
('책상4', '가구', '튼튼하고 넉넉한 크기의 나무 책상', 500),
('책상5', '가구', '튼튼하고 넉넉한 크기의 나무 책상', 500),
('책상6', '가구', '튼튼하고 넉넉한 크기의 나무 책상', 500),
('의자1', '가구', '오랜 시간 앉아도 편안한 등받이 의자', 300),
('의자2', '가구', '오랜 시간 앉아도 편안한 등받이 의자', 300),
('의자3', '가구', '오랜 시간 앉아도 편안한 등받이 의자', 300),
('의자4', '가구', '오랜 시간 앉아도 편안한 등받이 의자', 300),
('둥근어항','가구','둥근어항',300),
('각진어항','가구','각진어항',300),
('눈사람','가구','눈사람',300),


-- 조명 카테고리
('조명1', '조명', '따뜻하고 밝은 빛을 제공하는 LED 천장 전등', 250),
('조명2', '조명', '각도 조절이 가능한 스탠드형 조명', 200),
('조명3', '조명', '에너지 효율적인 LED 천장 전등', 250),
('조명4', '조명', '책상용으로 적합한 스탠드형 조명', 200),

-- 식물 카테고리
('금전수', '식물', '풍요와 행운을 상징하는 금전수 화분', 150),
('산세베리아', '식물', '공기 정화에 탁월한 산세베리아', 180),
('카랑코에', '식물', '밝고 생기 있는 카랑코에 화분', 300),
('로즈마리', '식물', '은은한 향이 나는 허브 로즈마리', 150),
('스투키', '식물', '키우기 쉬운 실내 장식용 스투키', 180),
('크루시아', '식물', '세련된 잎을 가진 크루시아 화분', 300),
('개운죽', '식물', '행운과 희망을 상징하는 개운죽 화분', 150),
('몬스테라', '식물', '트렌디한 잎사귀로 인기 있는 몬스테라', 180),
('스킨답서스', '식물', '매력적인 덩굴 식물 스킨답서스', 300),
('애플민트', '식물', '청량한 향기를 제공하는 애플민트', 300),
('황금세덤', '식물', '황금빛 잎사귀가 돋보이는 황금세덤', 150),
('라벤더', '식물', '향기롭고 차분한 분위기를 만드는 라벤더', 180),
('허브', '식물', '다양한 요리에 활용할 수 있는 허브 화분', 300),

-- 동물 카테고리
('강아지', '동물', '활발하고 귀여운 강아지 장식', 400),
('고양이', '동물', '우아하고 사랑스러운 고양이 장식', 350),
('토끼', '동물', '작고 사랑스러운 토끼 장식', 300),
('뱀', '동물', '독특하고 신비로운 뱀 장식', 400),
('고슴도치', '동물', '뾰족한 가시가 매력적인 고슴도치 장식', 350),
('호랑이', '동물', '강렬하고 용맹스러운 호랑이 장식', 300),
('재규어', '동물', '날렵하고 강력한 재규어 장식', 400),
('드래곤', '동물', '판타지 속에서 온 멋진 드래곤 장식', 350),
('햄스터', '동물', '작고 귀여운 햄스터 장식', 350),
('앵무새', '동물', '다채로운 색상의 앵무새 장식', 300),
('독수리', '동물', '날개를 펼치고 나는 용맹한 독수리 장식', 400),
('펭귄', '동물', '얼음 위에서 춤추는 귀여운 펭귄 장식', 350),
('팬더', '동물', '사랑스럽고 평화로운 팬더 장식', 300);


SELECT get_date, ranking, school_name, monthly_total_time
        FROM Medal
        WHERE user_id = 1;

call update_school_total_ranking();
call update_school_monthly_ranking();
call update_school_local_ranking();
call UpdateSchoolLevel();
   
COMMIT;

select * from Users where user_id = 1;
select * from Medal where user_id = 1;
UPDATE Users
SET points = 1000
WHERE user_id = 1;

select * from Notifications;
select * from Log;

Update Users set points = 10000 where user_id = '1';
Update Users set points = 10000 where user_id = '2';
