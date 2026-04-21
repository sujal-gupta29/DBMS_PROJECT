-- ============================================================================
-- REAL ESTATE DATABASE — Complete Setup + Seed Data
-- Run this ONCE to set up the entire database
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP DATABASE IF EXISTS real_estate;
CREATE DATABASE real_estate CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE real_estate;

-- ============================================================================

-- CORE TABLES (from original schema)
-- ============================================================================

CREATE TABLE MANAGER (
    manager_id      VARCHAR(36)     NOT NULL,
    name            VARCHAR(100)    NOT NULL,
    email           VARCHAR(150)    NOT NULL UNIQUE,
    phone_number    VARCHAR(15)     NOT NULL UNIQUE,
    aadhaarNo       CHAR(12)        NOT NULL UNIQUE,
    hire_date       DATE            NOT NULL,
    base_salary     DECIMAL(15,2)   NOT NULL,
    active_flag     TINYINT(1)      NOT NULL DEFAULT 1,
    PRIMARY KEY (manager_id)
);

CREATE TABLE AGENT (
    agent_id        VARCHAR(36)     NOT NULL,
    manager_id      VARCHAR(36)     NOT NULL,
    name            VARCHAR(100)    NOT NULL,
    phone           VARCHAR(15)     NOT NULL UNIQUE,
    email           VARCHAR(150)    NOT NULL UNIQUE,
    hire_date       DATE            NOT NULL,
    active_flag     TINYINT(1)      NOT NULL DEFAULT 1,
    base_salary     DECIMAL(15,2)   NOT NULL,
    PRIMARY KEY (agent_id),
    FOREIGN KEY (manager_id) REFERENCES MANAGER(manager_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE CLIENT (
    client_id       VARCHAR(36)     NOT NULL,
    name            VARCHAR(100)    NOT NULL,
    phone           VARCHAR(15)     NOT NULL UNIQUE,
    email           VARCHAR(150)    NOT NULL UNIQUE,
    aadhaar_no      CHAR(12)        NOT NULL UNIQUE,
    PRIMARY KEY (client_id)
);

CREATE TABLE LOCALITY (
    locality_id     VARCHAR(36)     NOT NULL,
    locality_name   VARCHAR(150)    NOT NULL,
    school          TINYINT(1)      NOT NULL DEFAULT 0,
    gym             TINYINT(1)      NOT NULL DEFAULT 0,
    park            TINYINT(1)      NOT NULL DEFAULT 0,
    swimming_pool   TINYINT(1)      NOT NULL DEFAULT 0,
    hospital        TINYINT(1)      NOT NULL DEFAULT 0,
    PRIMARY KEY (locality_id)
);

CREATE TABLE PROPERTY (
    property_id     VARCHAR(36)     NOT NULL,
    owner_id        VARCHAR(36)     NOT NULL,
    property_type   ENUM('Apartment','House') NOT NULL,
    size_sqft       DECIMAL(10,2)   NOT NULL,
    build_year      YEAR            NOT NULL,
    PRIMARY KEY (property_id),
    FOREIGN KEY (owner_id) REFERENCES CLIENT(client_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE ADDRESS (
    property_id     VARCHAR(36)     NOT NULL,
    locality_id     VARCHAR(36)     NOT NULL,
    house_no        VARCHAR(20)     NOT NULL,
    block_no        VARCHAR(20)         NULL,
    street          VARCHAR(150)    NOT NULL,
    city            VARCHAR(100)    NOT NULL,
    state           VARCHAR(100)    NOT NULL,
    pincode         VARCHAR(10)     NOT NULL,
    coord_x         DECIMAL(9,6)        NULL,
    coord_y         DECIMAL(9,6)        NULL,
    PRIMARY KEY (property_id),
    FOREIGN KEY (property_id) REFERENCES PROPERTY(property_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (locality_id) REFERENCES LOCALITY(locality_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE FEATURES (
    property_id     VARCHAR(36)     NOT NULL,
    bedrooms        INT             NOT NULL DEFAULT 0,
    bathrooms       INT             NOT NULL DEFAULT 0,
    floors          INT             NOT NULL DEFAULT 1,
    balcony         TINYINT(1)      NOT NULL DEFAULT 0,
    kitchen         TINYINT(1)      NOT NULL DEFAULT 1,
    PRIMARY KEY (property_id),
    FOREIGN KEY (property_id) REFERENCES PROPERTY(property_id)
        ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE LISTING (
    listing_id      VARCHAR(36)     NOT NULL,
    property_id     VARCHAR(36)     NOT NULL,
    listing_type    ENUM('SALE','RENT','BOTH') NOT NULL,
    list_date       DATE            NOT NULL,
    price_rent      DECIMAL(15,2)       NULL,
    price_sell      DECIMAL(15,2)       NULL,
    status          ENUM('ACTIVE','SOLD','RENTED','WITHDRAWN') NOT NULL DEFAULT 'ACTIVE',
    close_date      DATE                NULL,
    PRIMARY KEY (listing_id),
    FOREIGN KEY (property_id) REFERENCES PROPERTY(property_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE APPOINTMENT (
    appointment_id      VARCHAR(36)     NOT NULL,
    agent_id            VARCHAR(36)     NOT NULL,
    buyer_client_id     VARCHAR(36)     NOT NULL,
    listing_id          VARCHAR(36)     NOT NULL,
    schedule_date_time  DATETIME        NOT NULL,
    deal_status         TINYINT(1)      NOT NULL DEFAULT 0,
    PRIMARY KEY (appointment_id),
    FOREIGN KEY (agent_id) REFERENCES AGENT(agent_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (buyer_client_id) REFERENCES CLIENT(client_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (listing_id) REFERENCES LISTING(listing_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE TRANSACTION (
    transaction_id      VARCHAR(36)     NOT NULL,
    listing_id          VARCHAR(36)     NOT NULL,
    buyer_client_id     VARCHAR(36)     NOT NULL,
    seller_client_id    VARCHAR(36)     NOT NULL,
    appointment_id      VARCHAR(36)     NOT NULL,
    rent_id             VARCHAR(36)         NULL,
    sell_date           DATE            NOT NULL,
    sold_price          DECIMAL(15,2)       NULL,
    PRIMARY KEY (transaction_id),
    FOREIGN KEY (listing_id) REFERENCES LISTING(listing_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (buyer_client_id) REFERENCES CLIENT(client_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (seller_client_id) REFERENCES CLIENT(client_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (appointment_id) REFERENCES APPOINTMENT(appointment_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE RENT_AGREEMENT (
    rent_id             VARCHAR(36)     NOT NULL,
    transaction_id      VARCHAR(36)     NOT NULL,
    end_date            DATE            NOT NULL,
    rent_amount         DECIMAL(15,2)   NOT NULL,
    security_deposit    DECIMAL(15,2)   NOT NULL DEFAULT 0.00,
    PRIMARY KEY (rent_id),
    FOREIGN KEY (transaction_id) REFERENCES TRANSACTION(transaction_id)
        ON UPDATE CASCADE ON DELETE CASCADE
);

ALTER TABLE TRANSACTION
    ADD CONSTRAINT fk_transaction_rent
        FOREIGN KEY (rent_id) REFERENCES RENT_AGREEMENT(rent_id)
        ON UPDATE CASCADE ON DELETE SET NULL;

-- ============================================================================
-- AUTH TABLE (Application-level auth, not in original ER but needed)
-- ============================================================================
CREATE TABLE AUTH_USERS (
    user_id         VARCHAR(36)     NOT NULL,
    email           VARCHAR(150)    NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    role            ENUM('admin','manager','agent','client') NOT NULL,
    display_name    VARCHAR(100)    NOT NULL,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id)
);

-- ============================================================================
-- STORED PROCEDURES
-- ============================================================================
DELIMITER //

DROP PROCEDURE IF EXISTS sp_add_manager //
CREATE PROCEDURE sp_add_manager(
    IN p_name VARCHAR(100), IN p_email VARCHAR(150),
    IN p_phone_number VARCHAR(15), IN p_aadhaarNo CHAR(12),
    IN p_hire_date DATE, IN p_base_salary DECIMAL(15,2)
)
BEGIN
    INSERT INTO MANAGER(manager_id,name,email,phone_number,aadhaarNo,hire_date,base_salary,active_flag)
    VALUES(UUID(),p_name,p_email,p_phone_number,p_aadhaarNo,p_hire_date,p_base_salary,1);
END //

DROP PROCEDURE IF EXISTS sp_add_agent //
CREATE PROCEDURE sp_add_agent(
    IN p_manager_id VARCHAR(36), IN p_name VARCHAR(100),
    IN p_phone VARCHAR(15), IN p_email VARCHAR(150),
    IN p_hire_date DATE, IN p_base_salary DECIMAL(15,2)
)
BEGIN
    IF EXISTS(SELECT 1 FROM MANAGER WHERE manager_id=p_manager_id AND active_flag=1) THEN
        INSERT INTO AGENT(agent_id,manager_id,name,phone,email,hire_date,base_salary,active_flag)
        VALUES(UUID(),p_manager_id,p_name,p_phone,p_email,p_hire_date,p_base_salary,1);
    ELSE
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Error: Valid and active Manager ID required.';
    END IF;
END //

DROP PROCEDURE IF EXISTS sp_remove_manager //
CREATE PROCEDURE sp_remove_manager(IN p_manager_id VARCHAR(36))
BEGIN
    DECLARE v_active_count INT;
    SELECT COUNT(*) INTO v_active_count FROM AGENT
    WHERE manager_id=p_manager_id AND active_flag=1;
    IF v_active_count > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Cannot deactivate: manager has active agents. Reassign or deactivate them first.';
    ELSE
        UPDATE MANAGER SET active_flag=0 WHERE manager_id=p_manager_id;
    END IF;
END //

DROP PROCEDURE IF EXISTS sp_remove_agent //
CREATE PROCEDURE sp_remove_agent(IN p_agent_id VARCHAR(36))
BEGIN
    DECLARE v_upcoming INT;
    SELECT COUNT(*) INTO v_upcoming FROM APPOINTMENT
    WHERE agent_id=p_agent_id AND schedule_date_time > NOW() AND deal_status=0;
    IF v_upcoming > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Cannot deactivate: agent has upcoming appointments. Resolve them first.';
    ELSE
        UPDATE AGENT SET active_flag=0 WHERE agent_id=p_agent_id;
    END IF;
END //

DROP PROCEDURE IF EXISTS sp_reassign_agent //
CREATE PROCEDURE sp_reassign_agent(IN p_agent_id VARCHAR(36), IN p_new_manager_id VARCHAR(36))
BEGIN
    DECLARE v_agent_active INT DEFAULT 0;
    DECLARE v_manager_active INT DEFAULT 0;
    SELECT active_flag INTO v_agent_active FROM AGENT WHERE agent_id=p_agent_id;
    SELECT active_flag INTO v_manager_active FROM MANAGER WHERE manager_id=p_new_manager_id;
    IF IFNULL(v_agent_active,0)=0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Agent not found or inactive.';
    ELSEIF IFNULL(v_manager_active,0)=0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Target manager not found or inactive.';
    ELSE
        UPDATE AGENT SET manager_id=p_new_manager_id WHERE agent_id=p_agent_id;
    END IF;
END //

DROP PROCEDURE IF EXISTS sp_reschedule_appointment //
CREATE PROCEDURE sp_reschedule_appointment(IN p_appointment_id VARCHAR(36), IN p_new_agent_id VARCHAR(36))
BEGIN
    DECLARE v_appt_time DATETIME;
    DECLARE v_new_agent_active INT DEFAULT 0;
    SELECT schedule_date_time INTO v_appt_time FROM APPOINTMENT WHERE appointment_id=p_appointment_id;
    IF v_appt_time IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Appointment not found.';
    ELSEIF v_appt_time <= NOW() THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Cannot reassign: appointment is in the past.';
    END IF;
    SELECT active_flag INTO v_new_agent_active FROM AGENT WHERE agent_id=p_new_agent_id;
    IF IFNULL(v_new_agent_active,0)=0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='New agent is inactive or does not exist.';
    ELSE
        UPDATE APPOINTMENT SET agent_id=p_new_agent_id WHERE appointment_id=p_appointment_id;
    END IF;
END //

DELIMITER ;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Managers
INSERT INTO MANAGER(manager_id,name,email,phone_number,aadhaarNo,hire_date,base_salary,active_flag) VALUES
('M-001','Anil Sharma','anil.mgr@estate.com','+919800000001','123456789012','2015-01-10',85000.00,1),
('M-002','Bita Das','bita.mgr@estate.com','+919800000002','987654321098','2016-03-22',80000.00,1),
('M-003','Raj Malhotra','raj.mgr@estate.com','+919800000003','112233445566','2017-05-15',90000.00,1);

-- Agents
INSERT INTO AGENT(agent_id,manager_id,name,phone,email,hire_date,active_flag,base_salary) VALUES
('A-001','M-001','Rahul Verma','+919800000011','rahul.agt@estate.com','2017-02-15',1,45000.00),
('A-002','M-001','Priya Gogoi','+919800000012','priya.agt@estate.com','2017-06-01',1,48000.00),
('A-003','M-002','Amit Singh','+919800000013','amit.agt@estate.com','2020-11-10',1,42000.00),
('A-004','M-002','Sunita Rao','+919800000014','sunita.agt@estate.com','2019-03-20',1,44000.00),
('A-005','M-003','Deepak Nair','+919800000015','deepak.agt@estate.com','2021-07-05',1,46000.00),
('A-006','M-003','Ananya Bose','+919800000016','ananya.agt@estate.com','2022-01-12',1,43000.00);

-- Clients
INSERT INTO CLIENT(client_id,name,phone,email,aadhaar_no) VALUES
('C-001','Vikram Chatterjee','+919700000001','vikram@mail.com','111122223333'),
('C-002','Neha Kapoor','+919700000002','neha@mail.com','444455556666'),
('C-003','Sanjay Baruah','+919700000003','sanjay@mail.com','777788889999'),
('C-004','Kavita Reddy','+919700000004','kavita@mail.com','121234345656'),
('C-005','Rohan Gupta','+919700000005','rohan.g@mail.com','555566667777'),
('C-006','Meera Joshi','+919700000006','meera.j@mail.com','888899990000'),
('C-007','Arjun Patel','+919700000007','arjun.p@mail.com','333344445555'),
('C-008','Divya Mehta','+919700000008','divya.m@mail.com','666677778888'),
('C-009','Kiran Sharma','+919700000009','kiran.s@mail.com','999900001111'),
('C-010','Preet Kaur','+919700000010','preet.k@mail.com','222233334444');

-- Localities (Guwahati, Delhi, Mumbai)
INSERT INTO LOCALITY(locality_id,locality_name,school,gym,park,swimming_pool,hospital) VALUES
('LOC-1','G.S.Road',1,1,1,0,1),
('LOC-2','Dispur',1,0,1,0,1),
('LOC-3','Beltola',1,1,1,1,0),
('LOC-4','Connaught Place',1,1,1,1,1),
('LOC-5','Lajpat Nagar',1,1,0,0,1),
('LOC-6','Dwarka',1,1,1,0,1),
('LOC-7','Bandra',1,1,1,1,1),
('LOC-8','Andheri',1,0,1,0,1),
('LOC-9','Powai',1,1,1,1,1);

-- Properties
INSERT INTO PROPERTY(property_id,owner_id,property_type,size_sqft,build_year) VALUES
('PROP-1','C-001','House',1800.00,2024),
('PROP-2','C-002','House',2500.00,2024),
('PROP-3','C-003','House',1200.00,2018),
('PROP-4','C-001','House',4000.00,2010),
('PROP-5','C-004','House',5500.00,2016),
('PROP-6','C-002','House',8000.00,2020),
('PROP-7','C-003','Apartment',3000.00,2021),
('PROP-8','C-005','House',4500.00,2019),
('PROP-9','C-006','Apartment',900.00,2022),
-- Delhi properties
('PROP-10','C-007','Apartment',1100.00,2023),
('PROP-11','C-007','House',3200.00,2019),
('PROP-12','C-008','Apartment',850.00,2022),
('PROP-13','C-008','House',4200.00,2015),
-- Mumbai properties
('PROP-14','C-009','Apartment',650.00,2023),
('PROP-15','C-009','House',2200.00,2017),
('PROP-16','C-010','Apartment',1400.00,2024),
('PROP-17','C-010','House',3800.00,2018),
('PROP-18','C-005','Apartment',750.00,2021),
('PROP-19','C-006','House',2900.00,2016),
('PROP-20','C-001','Apartment',550.00,2023);

-- Addresses
INSERT INTO ADDRESS(property_id,locality_id,house_no,block_no,street,city,state,pincode,coord_x,coord_y) VALUES
('PROP-1','LOC-2','H-12','A','Secretariat Rd','Guwahati','Assam','781006',26.143,91.789),
('PROP-2','LOC-2','H-45','B','Secretariat Rd','Guwahati','Assam','781006',26.144,91.788),
('PROP-3','LOC-1','H-10','C','Christian Basti','Guwahati','Assam','781005',26.151,91.776),
('PROP-4','LOC-3','H-99',NULL,'Survey','Guwahati','Assam','781028',26.125,91.791),
('PROP-5','LOC-2','H-10','D','Ganeshguri','Guwahati','Assam','781006',26.146,91.785),
('PROP-6','LOC-1','Villa 1','VIP','Bhangagarh','Guwahati','Assam','781005',26.160,91.765),
('PROP-7','LOC-3','Apt 4B',NULL,'Basistha Rd','Guwahati','Assam','781028',26.120,91.795),
('PROP-8','LOC-1','H-100','VIP','G.S.Road','Guwahati','Assam','781005',26.155,91.772),
('PROP-9','LOC-3','Apt 1A','B','Beltola Tiniali','Guwahati','Assam','781028',26.122,91.792),
('PROP-10','LOC-4','Apt 201','C','Connaught Place','Delhi','Delhi','110001',28.632,77.218),
('PROP-11','LOC-5','H-56',NULL,'Lajpat Nagar','Delhi','Delhi','110024',28.568,77.243),
('PROP-12','LOC-6','Apt 305','A','Dwarka Sector 10','Delhi','Delhi','110075',28.588,77.049),
('PROP-13','LOC-5','H-22','B','Lajpat Nagar II','Delhi','Delhi','110024',28.565,77.240),
('PROP-14','LOC-7','Apt 801','A','Bandra West','Mumbai','Maharashtra','400050',19.059,72.830),
('PROP-15','LOC-8','H-14',NULL,'Andheri East','Mumbai','Maharashtra','400069',19.119,72.848),
('PROP-16','LOC-9','Apt 1204','B','Powai Lake View','Mumbai','Maharashtra','400076',19.119,72.906),
('PROP-17','LOC-8','H-77','C','Andheri West','Mumbai','Maharashtra','400058',19.136,72.826),
('PROP-18','LOC-7','Apt 302','A','Bandra East','Mumbai','Maharashtra','400051',19.044,72.845),
('PROP-19','LOC-6','H-33',NULL,'Dwarka Sector 12','Delhi','Delhi','110078',28.581,77.055),
('PROP-20','LOC-2','Apt 2B','B','RG Baruah Rd','Guwahati','Assam','781005',26.148,91.781);

-- Features
INSERT INTO FEATURES(property_id,bedrooms,bathrooms,floors,balcony,kitchen) VALUES
('PROP-1',3,2,1,1,1),('PROP-2',4,3,2,1,1),('PROP-3',2,1,1,1,1),('PROP-4',4,4,2,1,1),
('PROP-5',5,4,3,1,1),('PROP-6',6,6,3,1,1),('PROP-7',3,3,2,1,1),('PROP-8',5,5,2,1,1),
('PROP-9',1,1,1,0,1),('PROP-10',2,2,1,1,1),('PROP-11',4,3,2,1,1),('PROP-12',1,1,1,1,1),
('PROP-13',5,4,3,0,1),('PROP-14',2,2,1,1,1),('PROP-15',3,2,2,0,1),('PROP-16',3,3,1,1,1),
('PROP-17',4,3,2,1,1),('PROP-18',1,1,1,1,1),('PROP-19',3,2,2,1,1),('PROP-20',1,1,1,1,1);

-- Listings (historical + active)
INSERT INTO LISTING(listing_id,property_id,listing_type,list_date,price_rent,price_sell,status,close_date) VALUES
('LST-1','PROP-1','RENT','2025-01-15',20000.00,NULL,'ACTIVE',NULL),
('LST-2','PROP-2','SALE','2025-02-01',NULL,4500000.00,'ACTIVE',NULL),
('LST-3','PROP-3','RENT','2025-03-01',14000.00,NULL,'ACTIVE',NULL),
('LST-4','PROP-4','SALE','2018-01-10',NULL,8500000.00,'SOLD','2018-03-15'),
('LST-5','PROP-5','SALE','2018-04-05',NULL,12000000.00,'SOLD','2018-06-20'),
('LST-6','PROP-6','SALE','2023-01-10',NULL,150000000.00,'SOLD','2023-04-12'),
('LST-7','PROP-7','SALE','2023-05-01',NULL,30000000.00,'SOLD','2023-08-05'),
('LST-8','PROP-8','RENT','2024-01-10',250000.00,NULL,'RENTED','2024-02-01'),
('LST-9','PROP-9','RENT','2024-05-01',12000.00,NULL,'RENTED','2024-05-20'),
-- Delhi listings
('LST-10','PROP-10','RENT','2025-01-20',35000.00,NULL,'ACTIVE',NULL),
('LST-11','PROP-11','SALE','2025-03-10',NULL,5500000.00,'ACTIVE',NULL),
('LST-12','PROP-12','BOTH','2024-08-01',28000.00,3200000.00,'ACTIVE',NULL),
('LST-13','PROP-13','SALE','2022-06-01',NULL,9000000.00,'SOLD','2022-09-15'),
-- Mumbai listings
('LST-14','PROP-14','RENT','2025-02-15',55000.00,NULL,'ACTIVE',NULL),
('LST-15','PROP-15','SALE','2025-04-01',NULL,8500000.00,'ACTIVE',NULL),
('LST-16','PROP-16','BOTH','2025-01-05',75000.00,18000000.00,'ACTIVE',NULL),
('LST-17','PROP-17','SALE','2021-03-01',NULL,14000000.00,'SOLD','2021-07-20'),
('LST-18','PROP-18','RENT','2023-09-01',45000.00,NULL,'RENTED','2023-10-05'),
('LST-19','PROP-19','SALE','2019-02-01',NULL,6500000.00,'SOLD','2019-05-30'),
('LST-20','PROP-20','RENT','2025-03-20',18000.00,NULL,'ACTIVE',NULL);

-- Appointments
INSERT INTO APPOINTMENT(appointment_id,agent_id,buyer_client_id,listing_id,schedule_date_time,deal_status) VALUES
('APT-1','A-001','C-002','LST-4','2018-03-05 10:00:00',1),
('APT-2','A-002','C-003','LST-5','2018-06-10 11:30:00',1),
('APT-3','A-001','C-004','LST-6','2023-04-01 14:00:00',1),
('APT-4','A-002','C-001','LST-7','2023-07-28 16:45:00',1),
('APT-5','A-003','C-001','LST-8','2024-01-25 09:00:00',1),
('APT-6','A-002','C-002','LST-9','2024-05-15 13:15:00',1),
('APT-7','A-004','C-005','LST-13','2022-09-10 10:00:00',1),
('APT-8','A-005','C-006','LST-17','2021-07-15 14:30:00',1),
('APT-9','A-004','C-007','LST-18','2023-09-25 11:00:00',1),
('APT-10','A-006','C-008','LST-19','2019-05-20 10:00:00',1),
-- Active/Upcoming
('APT-11','A-001','C-004','LST-1','2026-05-20 10:00:00',0),
('APT-12','A-003','C-005','LST-2','2026-05-25 14:30:00',0),
('APT-13','A-005','C-003','LST-10','2026-06-01 09:00:00',0),
('APT-14','A-006','C-009','LST-14','2026-06-05 11:00:00',0),
('APT-15','A-002','C-010','LST-16','2026-06-10 15:00:00',0);

-- Transactions
INSERT INTO TRANSACTION(transaction_id,listing_id,buyer_client_id,seller_client_id,appointment_id,rent_id,sell_date,sold_price) VALUES
('TXN-1','LST-4','C-002','C-001','APT-1',NULL,'2018-03-15',8200000.00),
('TXN-2','LST-5','C-003','C-004','APT-2',NULL,'2018-06-20',11500000.00),
('TXN-3','LST-6','C-004','C-002','APT-3',NULL,'2023-04-12',145000000.00),
('TXN-4','LST-7','C-001','C-003','APT-4',NULL,'2023-08-05',29000000.00),
('TXN-5','LST-8','C-001','C-005','APT-5',NULL,'2024-02-01',NULL),
('TXN-6','LST-9','C-002','C-006','APT-6',NULL,'2024-05-20',NULL),
('TXN-7','LST-13','C-005','C-008','APT-7',NULL,'2022-09-15',8800000.00),
('TXN-8','LST-17','C-006','C-010','APT-8',NULL,'2021-07-20',13500000.00),
('TXN-9','LST-18','C-007','C-005','APT-9',NULL,'2023-10-05',NULL),
('TXN-10','LST-19','C-008','C-010','APT-10',NULL,'2019-05-30',6200000.00);

-- Rent Agreements
INSERT INTO RENT_AGREEMENT(rent_id,transaction_id,end_date,rent_amount,security_deposit) VALUES
('RENT-1','TXN-5','2025-01-31',250000.00,500000.00),
('RENT-2','TXN-6','2025-04-30',12000.00,24000.00),
('RENT-3','TXN-9','2024-09-30',45000.00,90000.00);

-- Update transaction rent_id references
UPDATE TRANSACTION SET rent_id='RENT-1' WHERE transaction_id='TXN-5';
UPDATE TRANSACTION SET rent_id='RENT-2' WHERE transaction_id='TXN-6';
UPDATE TRANSACTION SET rent_id='RENT-3' WHERE transaction_id='TXN-9';

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- AUTH USERS (bcrypt hashes for password "password123")
-- ============================================================================
-- Admin user
INSERT INTO AUTH_USERS(user_id,email,password_hash,role,display_name) VALUES
('ADMIN-001','admin@estate.com','$2b$12$AQTnVzBQTpl901l.keDQ/e0v7Smb24c14LwtNtdcunGl.Li6fyIGW','admin','System Admin');

-- Manager auth users
INSERT INTO AUTH_USERS(user_id,email,password_hash,role,display_name) VALUES
('M-001','anil.mgr@estate.com','$2b$12$AQTnVzBQTpl901l.keDQ/e0v7Smb24c14LwtNtdcunGl.Li6fyIGW','manager','Anil Sharma'),
('M-002','bita.mgr@estate.com','$2b$12$AQTnVzBQTpl901l.keDQ/e0v7Smb24c14LwtNtdcunGl.Li6fyIGW','manager','Bita Das'),
('M-003','raj.mgr@estate.com','$2b$12$AQTnVzBQTpl901l.keDQ/e0v7Smb24c14LwtNtdcunGl.Li6fyIGW','manager','Raj Malhotra');

-- Agent auth users
INSERT INTO AUTH_USERS(user_id,email,password_hash,role,display_name) VALUES
('A-001','rahul.agt@estate.com','$2b$12$AQTnVzBQTpl901l.keDQ/e0v7Smb24c14LwtNtdcunGl.Li6fyIGW','agent','Rahul Verma'),
('A-002','priya.agt@estate.com','$2b$12$AQTnVzBQTpl901l.keDQ/e0v7Smb24c14LwtNtdcunGl.Li6fyIGW','agent','Priya Gogoi'),
('A-003','amit.agt@estate.com','$2b$12$AQTnVzBQTpl901l.keDQ/e0v7Smb24c14LwtNtdcunGl.Li6fyIGW','agent','Amit Singh'),
('A-004','sunita.agt@estate.com','$2b$12$AQTnVzBQTpl901l.keDQ/e0v7Smb24c14LwtNtdcunGl.Li6fyIGW','agent','Sunita Rao'),
('A-005','deepak.agt@estate.com','$2b$12$AQTnVzBQTpl901l.keDQ/e0v7Smb24c14LwtNtdcunGl.Li6fyIGW','agent','Deepak Nair'),
('A-006','ananya.agt@estate.com','$2b$12$AQTnVzBQTpl901l.keDQ/e0v7Smb24c14LwtNtdcunGl.Li6fyIGW','agent','Ananya Bose');

-- Client auth users
INSERT INTO AUTH_USERS(user_id,email,password_hash,role,display_name) VALUES
('C-001','vikram@mail.com','$2b$12$AQTnVzBQTpl901l.keDQ/e0v7Smb24c14LwtNtdcunGl.Li6fyIGW','client','Vikram Chatterjee'),
('C-002','neha@mail.com','$2b$12$AQTnVzBQTpl901l.keDQ/e0v7Smb24c14LwtNtdcunGl.Li6fyIGW','client','Neha Kapoor'),
('C-003','sanjay@mail.com','$2b$12$AQTnVzBQTpl901l.keDQ/e0v7Smb24c14LwtNtdcunGl.Li6fyIGW','client','Sanjay Baruah'),
('C-004','kavita@mail.com','$2b$12$AQTnVzBQTpl901l.keDQ/e0v7Smb24c14LwtNtdcunGl.Li6fyIGW','client','Kavita Reddy'),
('C-005','rohan.g@mail.com','$2b$12$AQTnVzBQTpl901l.keDQ/e0v7Smb24c14LwtNtdcunGl.Li6fyIGW','client','Rohan Gupta'),
('C-006','meera.j@mail.com','$2b$12$AQTnVzBQTpl901l.keDQ/e0v7Smb24c14LwtNtdcunGl.Li6fyIGW','client','Meera Joshi'),
('C-007','arjun.p@mail.com','$2b$12$AQTnVzBQTpl901l.keDQ/e0v7Smb24c14LwtNtdcunGl.Li6fyIGW','client','Arjun Patel'),
('C-008','divya.m@mail.com','$2b$12$AQTnVzBQTpl901l.keDQ/e0v7Smb24c14LwtNtdcunGl.Li6fyIGW','client','Divya Mehta'),
('C-009','kiran.s@mail.com','$2b$12$AQTnVzBQTpl901l.keDQ/e0v7Smb24c14LwtNtdcunGl.Li6fyIGW','client','Kiran Sharma'),
('C-010','preet.k@mail.com','$2b$12$AQTnVzBQTpl901l.keDQ/e0v7Smb24c14LwtNtdcunGl.Li6fyIGW','client','Preet Kaur');

SELECT 'Database setup complete! All tables, procedures, and seed data loaded.' AS status;
SELECT 'Default password for ALL users: password123' AS note;

-- ============================================================================
-- CONVENIENCE VIEWS (for reporting and dashboards)
-- ============================================================================
USE real_estate;

CREATE OR REPLACE VIEW v_listing_full AS
SELECT
    l.listing_id, l.listing_type, l.status, l.list_date, l.close_date,
    l.price_rent, l.price_sell,
    p.property_id, p.property_type, p.build_year, p.size_sqft,
    p.owner_id,
    c.name  AS owner_name, c.phone AS owner_phone, c.email AS owner_email,
    a.house_no, a.street, a.city, a.state, a.pincode,
    loc.locality_id, loc.locality_name,
    loc.school, loc.gym, loc.park, loc.swimming_pool, loc.hospital,
    f.bedrooms, f.bathrooms, f.floors, f.balcony, f.kitchen
FROM LISTING l
JOIN PROPERTY p   ON l.property_id  = p.property_id
JOIN CLIENT c     ON p.owner_id     = c.client_id
JOIN ADDRESS a    ON p.property_id  = a.property_id
JOIN LOCALITY loc ON a.locality_id  = loc.locality_id
JOIN FEATURES f   ON p.property_id  = f.property_id;

CREATE OR REPLACE VIEW v_transaction_full AS
SELECT
    t.transaction_id, t.sell_date, t.sold_price,
    t.listing_id, l.listing_type,
    p.property_id, p.property_type,
    a.city, a.street,
    bc.client_id AS buyer_id,  bc.name AS buyer_name,
    sc.client_id AS seller_id, sc.name AS seller_name,
    ag.agent_id,  ag.name AS agent_name,
    m.manager_id, m.name AS manager_name,
    ra.rent_id, ra.rent_amount, ra.end_date AS rent_end_date, ra.security_deposit
FROM TRANSACTION t
JOIN LISTING l       ON t.listing_id      = l.listing_id
JOIN PROPERTY p      ON l.property_id     = p.property_id
JOIN ADDRESS a       ON p.property_id     = a.property_id
JOIN CLIENT bc       ON t.buyer_client_id  = bc.client_id
JOIN CLIENT sc       ON t.seller_client_id = sc.client_id
JOIN APPOINTMENT ap  ON t.appointment_id  = ap.appointment_id
JOIN AGENT ag        ON ap.agent_id       = ag.agent_id
JOIN MANAGER m       ON ag.manager_id     = m.manager_id
LEFT JOIN RENT_AGREEMENT ra ON t.rent_id  = ra.rent_id;

CREATE OR REPLACE VIEW v_agent_stats AS
SELECT
    ag.agent_id, ag.name AS agent_name, ag.email, ag.active_flag,
    m.manager_id, m.name AS manager_name,
    COUNT(DISTINCT ap.appointment_id)   AS total_appointments,
    SUM(ap.deal_status)                 AS successful_deals,
    COUNT(DISTINCT t.transaction_id)    AS total_transactions,
    COALESCE(SUM(t.sold_price), 0)      AS total_revenue,
    COALESCE(AVG(t.sold_price), 0)      AS avg_sale_price
FROM AGENT ag
LEFT JOIN MANAGER m     ON ag.manager_id    = m.manager_id
LEFT JOIN APPOINTMENT ap ON ag.agent_id    = ap.agent_id
LEFT JOIN TRANSACTION t  ON ap.appointment_id = t.appointment_id
GROUP BY ag.agent_id, ag.name, ag.email, ag.active_flag, m.manager_id, m.name;

SELECT 'Views created successfully.' AS status;
