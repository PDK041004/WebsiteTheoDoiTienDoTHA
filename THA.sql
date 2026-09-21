CREATE DATABASE thihanhan;
USE thihanhan;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50),
    password VARCHAR(100),
    fullname VARCHAR(100),
    role VARCHAR(50)
);

CREATE TABLE hoso (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mahoso VARCHAR(20),
    tennguoi VARCHAR(100),
    trangthai VARCHAR(50),
    noidung TEXT
);

select * from users