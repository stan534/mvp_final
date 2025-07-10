CREATE TABLE wallet_pnl_tokens (
    id SERIAL PRIMARY KEY,
    summary_id INTEGER,
    wallet_address TEXT NOT NULL,
    token TEXT NOT NULL,
    details JSONB,
    retrieved_at TIMESTAMP DEFAULT NOW(),
    source TEXT
);

CREATE TABLE wallet_pnl_summary (
    id SERIAL PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    summary JSONB,
    retrieved_at TIMESTAMP DEFAULT NOW(),
    source TEXT
);

