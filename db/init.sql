CREATE TABLE IF NOT EXISTS user_account(
    id SERIAL,
    username VARCHAR not null,
    password VARCHAR not null,

    CONSTRAINT user_pk PRIMARY KEY (id),
    CONSTRAINT unique_username UNIQUE (username)
);
