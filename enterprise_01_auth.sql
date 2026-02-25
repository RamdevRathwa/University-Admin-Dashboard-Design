SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.roles','U') IS NULL
BEGIN
  CREATE TABLE dbo.roles
  (
    role_id        SMALLINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_roles PRIMARY KEY,
    role_code      NVARCHAR(30)  NOT NULL,
    role_name      NVARCHAR(80)  NOT NULL,
    description    NVARCHAR(255) NULL,
    created_at     DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_roles_created_at DEFAULT (SYSUTCDATETIME())
  );

  ALTER TABLE dbo.roles
    ADD CONSTRAINT UQ_roles_role_code UNIQUE (role_code);

  ALTER TABLE dbo.roles
    ADD CONSTRAINT CK_roles_role_code CHECK (role_code IN (N'Student',N'Clerk',N'HoD',N'Dean',N'Admin'));
END
GO

IF OBJECT_ID('dbo.users','U') IS NULL
BEGIN
  CREATE TABLE dbo.users
  (
    user_id            BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_users PRIMARY KEY,

    full_name          NVARCHAR(200) NOT NULL,
    email              NVARCHAR(254) NULL,
    mobile             NVARCHAR(20)  NULL,

    normalized_email   AS (LOWER(LTRIM(RTRIM(CONVERT(NVARCHAR(254), [email]))))) PERSISTED,
    normalized_mobile  AS (CONVERT(NVARCHAR(20), REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(CONVERT(NVARCHAR(20), [mobile]))),' ',''),'-',''),'(',''),')',''),'+',''))) PERSISTED,

    is_email_verified  BIT NOT NULL CONSTRAINT DF_users_is_email_verified DEFAULT (0),
    is_mobile_verified BIT NOT NULL CONSTRAINT DF_users_is_mobile_verified DEFAULT (0),

    is_active          BIT NOT NULL CONSTRAINT DF_users_is_active DEFAULT (1),
    deleted_at         DATETIMEOFFSET(0) NULL,

    created_at         DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_users_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at         DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_users_updated_at DEFAULT (SYSUTCDATETIME()),
    rowver             ROWVERSION NOT NULL
  );

  CREATE UNIQUE INDEX UX_users_normalized_email ON dbo.users(normalized_email) WHERE email IS NOT NULL;
  CREATE UNIQUE INDEX UX_users_normalized_mobile ON dbo.users(normalized_mobile) WHERE mobile IS NOT NULL;

  CREATE INDEX IX_users_is_active ON dbo.users(is_active, deleted_at);

  ALTER TABLE dbo.users
    ADD CONSTRAINT CK_users_soft_delete CHECK (
      (deleted_at IS NULL) OR (deleted_at IS NOT NULL AND is_active = 0)
    );
END
GO

IF OBJECT_ID('dbo.user_roles','U') IS NULL
BEGIN
  CREATE TABLE dbo.user_roles
  (
    user_role_id   BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_user_roles PRIMARY KEY,
    user_id        BIGINT NOT NULL,
    role_id        SMALLINT NOT NULL,
    assigned_at    DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_user_roles_assigned_at DEFAULT (SYSUTCDATETIME()),
    assigned_by    BIGINT NULL
  );

  ALTER TABLE dbo.user_roles
    ADD CONSTRAINT UQ_user_roles UNIQUE (user_id, role_id);

  ALTER TABLE dbo.user_roles
    ADD CONSTRAINT FK_user_roles_users
      FOREIGN KEY (user_id) REFERENCES dbo.users(user_id) ON DELETE CASCADE;

  ALTER TABLE dbo.user_roles
    ADD CONSTRAINT FK_user_roles_roles
      FOREIGN KEY (role_id) REFERENCES dbo.roles(role_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.user_roles
    ADD CONSTRAINT FK_user_roles_assigned_by
      FOREIGN KEY (assigned_by) REFERENCES dbo.users(user_id) ON DELETE NO ACTION;

  CREATE INDEX IX_user_roles_role ON dbo.user_roles(role_id, user_id);
END
GO

IF OBJECT_ID('dbo.otp_verifications','U') IS NULL
BEGIN
  CREATE TABLE dbo.otp_verifications
  (
    otp_id          BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_otp_verifications PRIMARY KEY,
    user_id         BIGINT NULL,
    identifier      NVARCHAR(254) NOT NULL,
    identifier_type NVARCHAR(10)  NOT NULL,
    purpose         NVARCHAR(50)  NOT NULL,
    otp_salt        VARBINARY(16) NOT NULL,
    otp_hash        VARBINARY(32) NOT NULL,
    attempts        INT NOT NULL CONSTRAINT DF_otp_attempts DEFAULT (0),
    expires_at      DATETIMEOFFSET(0) NOT NULL,
    used_at         DATETIMEOFFSET(0) NULL,
    created_at      DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_otp_created_at DEFAULT (SYSUTCDATETIME()),
    ip_address      NVARCHAR(45) NULL,
    user_agent      NVARCHAR(500) NULL
  );

  ALTER TABLE dbo.otp_verifications
    ADD CONSTRAINT CK_otp_identifier_type CHECK (identifier_type IN (N'EMAIL',N'MOBILE'));

  ALTER TABLE dbo.otp_verifications
    ADD CONSTRAINT CK_otp_expires CHECK (expires_at > created_at);

  ALTER TABLE dbo.otp_verifications
    ADD CONSTRAINT FK_otp_users
      FOREIGN KEY (user_id) REFERENCES dbo.users(user_id) ON DELETE CASCADE;

  CREATE INDEX IX_otp_lookup ON dbo.otp_verifications(identifier, purpose, used_at, expires_at);
  CREATE INDEX IX_otp_user ON dbo.otp_verifications(user_id, created_at) WHERE user_id IS NOT NULL;
END
GO

IF OBJECT_ID('dbo.login_logs','U') IS NULL
BEGIN
  CREATE TABLE dbo.login_logs
  (
    login_log_id   BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_login_logs PRIMARY KEY,
    user_id        BIGINT NULL,
    identifier     NVARCHAR(254) NOT NULL,
    success        BIT NOT NULL,
    failure_reason NVARCHAR(255) NULL,
    ip_address     NVARCHAR(45) NULL,
    user_agent     NVARCHAR(500) NULL,
    device_id      NVARCHAR(100) NULL,
    created_at     DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_login_logs_created_at DEFAULT (SYSUTCDATETIME())
  );

  ALTER TABLE dbo.login_logs
    ADD CONSTRAINT FK_login_logs_users
      FOREIGN KEY (user_id) REFERENCES dbo.users(user_id) ON DELETE NO ACTION;

  CREATE INDEX IX_login_logs_user_time ON dbo.login_logs(user_id, created_at) WHERE user_id IS NOT NULL;
  CREATE INDEX IX_login_logs_identifier_time ON dbo.login_logs(identifier, created_at);
  CREATE INDEX IX_login_logs_success_time ON dbo.login_logs(success, created_at);
END
GO

IF OBJECT_ID('dbo.refresh_tokens','U') IS NULL
BEGIN
  CREATE TABLE dbo.refresh_tokens
  (
    refresh_token_id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_refresh_tokens PRIMARY KEY,
    user_id          BIGINT NOT NULL,
    token_salt       VARBINARY(16) NOT NULL,
    token_hash       VARBINARY(32) NOT NULL,
    issued_at        DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_refresh_tokens_issued_at DEFAULT (SYSUTCDATETIME()),
    expires_at       DATETIMEOFFSET(0) NOT NULL,
    revoked_at       DATETIMEOFFSET(0) NULL,
    replaced_by_id   BIGINT NULL,
    ip_address       NVARCHAR(45) NULL,
    user_agent       NVARCHAR(500) NULL,
    device_id        NVARCHAR(100) NULL
  );

  ALTER TABLE dbo.refresh_tokens
    ADD CONSTRAINT FK_refresh_tokens_users
      FOREIGN KEY (user_id) REFERENCES dbo.users(user_id) ON DELETE CASCADE;

  ALTER TABLE dbo.refresh_tokens
    ADD CONSTRAINT FK_refresh_tokens_replaced_by
      FOREIGN KEY (replaced_by_id) REFERENCES dbo.refresh_tokens(refresh_token_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.refresh_tokens
    ADD CONSTRAINT CK_refresh_tokens_expires CHECK (expires_at > issued_at);

  CREATE INDEX IX_refresh_tokens_user_active ON dbo.refresh_tokens(user_id, revoked_at, expires_at);
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.roles)
BEGIN
  INSERT INTO dbo.roles(role_code, role_name, description)
  VALUES
    (N'Student',N'Student',N'Student user'),
    (N'Clerk',N'Clerk',N'Clerk grade entry'),
    (N'HoD',N'HoD',N'Head of Department'),
    (N'Dean',N'Dean',N'Dean final approval'),
    (N'Admin',N'Admin',N'System admin');
END
GO

PRINT 'Enterprise schema: auth init done.';
