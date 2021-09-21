CREATE TABLE IF NOT EXISTS user_role (
    id SERIAL,
    name VARCHAR(63),

    CONSTRAINT user_role_pk PRIMARY KEY(id)
);
