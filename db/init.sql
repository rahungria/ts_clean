CREATE TABLE user_account IF NOT EXISTS(
    id SERIAL,
    username VARCHAR not null,
    password VARCHAR not null,

    CONSTRAINT user_pk PRIMARY KEY (id)
);
