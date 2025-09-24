-- ===================================================
-- SEED DATA (only for dev/test environments)
-- ===================================================

INSERT INTO
    users (
        name,
        email,
        password_hash,
        role
    )
VALUES (
        'Admin User',
        COALESCE(
            current_setting('app.admin_email', true),
            'admin@example.com'
        ),
        COALESCE(
            current_setting(
                'app.admin_password_hash',
                true
            ),
            '$2b$10$CXv3GGdhKJFSSOaPB79eDe9t61lqGcy93WNZbXJt9o/nPReyD/77a'
        ),
        'admin'
    )
ON CONFLICT (email) DO NOTHING;