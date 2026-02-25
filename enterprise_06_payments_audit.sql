SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ===========================
   MODULE 7: PAYMENTS
   =========================== */

IF OBJECT_ID('dbo.payment_orders','U') IS NULL
BEGIN
  CREATE TABLE dbo.payment_orders
  (
    payment_order_id   BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_payment_orders PRIMARY KEY,
    student_id         BIGINT NOT NULL,
    transcript_request_id BIGINT NULL,
    order_reference    NVARCHAR(60) NOT NULL,
    purpose_code       NVARCHAR(50) NOT NULL,
    copies_count       INT NOT NULL CONSTRAINT DF_payment_orders_copies DEFAULT (1),
    amount             DECIMAL(10,2) NOT NULL,
    currency           NVARCHAR(10) NOT NULL CONSTRAINT DF_payment_orders_currency DEFAULT (N'INR'),
    status_code        NVARCHAR(20) NOT NULL CONSTRAINT DF_payment_orders_status DEFAULT (N'Pending'),
    created_at         DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_payment_orders_created_at DEFAULT (SYSUTCDATETIME()),
    expires_at         DATETIMEOFFSET(0) NULL,
    updated_at         DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_payment_orders_updated_at DEFAULT (SYSUTCDATETIME())
  );

  ALTER TABLE dbo.payment_orders
    ADD CONSTRAINT UQ_payment_orders_ref UNIQUE (order_reference);

  ALTER TABLE dbo.payment_orders
    ADD CONSTRAINT FK_payment_orders_students
      FOREIGN KEY (student_id) REFERENCES dbo.students(student_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.payment_orders
    ADD CONSTRAINT FK_payment_orders_requests
      FOREIGN KEY (transcript_request_id) REFERENCES dbo.transcript_requests(transcript_request_id) ON DELETE SET NULL;

  ALTER TABLE dbo.payment_orders
    ADD CONSTRAINT CK_payment_orders_amount CHECK (amount >= 0);

  ALTER TABLE dbo.payment_orders
    ADD CONSTRAINT CK_payment_orders_status CHECK (status_code IN (N'Pending',N'Processing',N'Paid',N'Failed',N'Cancelled',N'Refunded'));

  ALTER TABLE dbo.payment_orders
    ADD CONSTRAINT CK_payment_orders_copies CHECK (copies_count BETWEEN 1 AND 20);

  CREATE INDEX IX_payment_orders_student_status ON dbo.payment_orders(student_id, status_code, created_at DESC);
  CREATE INDEX IX_payment_orders_request ON dbo.payment_orders(transcript_request_id) WHERE transcript_request_id IS NOT NULL;
END
GO

IF OBJECT_ID('dbo.payments','U') IS NULL
BEGIN
  CREATE TABLE dbo.payments
  (
    payment_id         BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_payments PRIMARY KEY,
    payment_order_id   BIGINT NOT NULL,
    provider_code      NVARCHAR(30) NOT NULL,
    provider_txn_ref   NVARCHAR(120) NULL,
    payment_reference  NVARCHAR(120) NOT NULL,
    status_code        NVARCHAR(20) NOT NULL CONSTRAINT DF_payments_status DEFAULT (N'Pending'),
    paid_at            DATETIMEOFFSET(0) NULL,
    amount             DECIMAL(10,2) NOT NULL,
    currency           NVARCHAR(10) NOT NULL CONSTRAINT DF_payments_currency DEFAULT (N'INR'),
    raw_response_json  NVARCHAR(MAX) NULL,
    created_at         DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_payments_created_at DEFAULT (SYSUTCDATETIME())
  );

  ALTER TABLE dbo.payments
    ADD CONSTRAINT FK_payments_orders
      FOREIGN KEY (payment_order_id) REFERENCES dbo.payment_orders(payment_order_id) ON DELETE CASCADE;

  ALTER TABLE dbo.payments
    ADD CONSTRAINT UQ_payments_reference UNIQUE (payment_reference);

  ALTER TABLE dbo.payments
    ADD CONSTRAINT CK_payments_amount CHECK (amount >= 0);

  ALTER TABLE dbo.payments
    ADD CONSTRAINT CK_payments_status CHECK (status_code IN (N'Pending',N'Processing',N'Completed',N'Failed',N'Cancelled',N'Refunded'));

  CREATE INDEX IX_payments_order_status ON dbo.payments(payment_order_id, status_code, created_at DESC);
  CREATE INDEX IX_payments_provider_ref ON dbo.payments(provider_code, provider_txn_ref) WHERE provider_txn_ref IS NOT NULL;
END
GO

IF OBJECT_ID('dbo.payment_receipts','U') IS NULL
BEGIN
  CREATE TABLE dbo.payment_receipts
  (
    receipt_id       BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_payment_receipts PRIMARY KEY,
    payment_id       BIGINT NOT NULL,
    receipt_number   NVARCHAR(60) NOT NULL,
    issued_at        DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_payment_receipts_issued_at DEFAULT (SYSUTCDATETIME()),
    issued_by        BIGINT NOT NULL,
    student_name     NVARCHAR(200) NOT NULL,
    prn              NVARCHAR(30) NULL,
    amount_paid      DECIMAL(10,2) NOT NULL,
    currency         NVARCHAR(10) NOT NULL CONSTRAINT DF_payment_receipts_currency DEFAULT (N'INR'),
    pdf_path         NVARCHAR(600) NULL,
    is_cancelled     BIT NOT NULL CONSTRAINT DF_payment_receipts_is_cancelled DEFAULT (0),
    cancelled_at     DATETIMEOFFSET(0) NULL,
    cancelled_by     BIGINT NULL,
    cancellation_reason NVARCHAR(500) NULL
  );

  ALTER TABLE dbo.payment_receipts
    ADD CONSTRAINT FK_payment_receipts_payment
      FOREIGN KEY (payment_id) REFERENCES dbo.payments(payment_id) ON DELETE CASCADE;

  ALTER TABLE dbo.payment_receipts
    ADD CONSTRAINT FK_payment_receipts_issued_by
      FOREIGN KEY (issued_by) REFERENCES dbo.users(user_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.payment_receipts
    ADD CONSTRAINT FK_payment_receipts_cancelled_by
      FOREIGN KEY (cancelled_by) REFERENCES dbo.users(user_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.payment_receipts
    ADD CONSTRAINT UQ_payment_receipts_receipt_number UNIQUE (receipt_number);

  CREATE UNIQUE INDEX UX_payment_receipts_payment ON dbo.payment_receipts(payment_id);

  ALTER TABLE dbo.payment_receipts
    ADD CONSTRAINT CK_payment_receipts_amount CHECK (amount_paid >= 0);

  ALTER TABLE dbo.payment_receipts
    ADD CONSTRAINT CK_payment_receipts_cancel CHECK (
      (is_cancelled = 0 AND cancelled_at IS NULL AND cancelled_by IS NULL)
      OR
      (is_cancelled = 1 AND cancelled_at IS NOT NULL)
    );
END
GO

/* ===========================
   MODULE 8: AUDIT + SYSTEM
   =========================== */

IF OBJECT_ID('dbo.audit_logs','U') IS NULL
BEGIN
  CREATE TABLE dbo.audit_logs
  (
    audit_log_id   BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_audit_logs PRIMARY KEY,
    user_id        BIGINT NULL,
    action_type    NVARCHAR(30) NOT NULL,
    entity_name    NVARCHAR(128) NULL,
    entity_key     NVARCHAR(128) NULL,
    old_data_json  NVARCHAR(MAX) NULL,
    new_data_json  NVARCHAR(MAX) NULL,
    ip_address     NVARCHAR(45) NULL,
    created_at     DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_audit_logs_created_at DEFAULT (SYSUTCDATETIME())
  );

  ALTER TABLE dbo.audit_logs
    ADD CONSTRAINT FK_audit_logs_users
      FOREIGN KEY (user_id) REFERENCES dbo.users(user_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.audit_logs
    ADD CONSTRAINT CK_audit_logs_action CHECK (action_type IN (
      N'INSERT',N'UPDATE',N'DELETE',N'LOGIN',N'LOGOUT',N'APPROVE',N'REJECT',N'PAYMENT',N'DOWNLOAD'
    ));

  CREATE INDEX IX_audit_logs_user_time ON dbo.audit_logs(user_id, created_at DESC) WHERE user_id IS NOT NULL;
  CREATE INDEX IX_audit_logs_time ON dbo.audit_logs(created_at DESC);
END
GO

IF OBJECT_ID('dbo.system_settings','U') IS NULL
BEGIN
  CREATE TABLE dbo.system_settings
  (
    setting_id     INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_system_settings PRIMARY KEY,
    setting_key    NVARCHAR(120) NOT NULL,
    setting_value  NVARCHAR(MAX) NOT NULL,
    setting_type   NVARCHAR(30) NOT NULL,
    description    NVARCHAR(500) NULL,
    updated_by     BIGINT NULL,
    updated_at     DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_system_settings_updated_at DEFAULT (SYSUTCDATETIME())
  );

  ALTER TABLE dbo.system_settings
    ADD CONSTRAINT UQ_system_settings_key UNIQUE (setting_key);

  ALTER TABLE dbo.system_settings
    ADD CONSTRAINT CK_system_settings_type CHECK (setting_type IN (N'String',N'Integer',N'Boolean',N'JSON'));

  ALTER TABLE dbo.system_settings
    ADD CONSTRAINT FK_system_settings_updated_by
      FOREIGN KEY (updated_by) REFERENCES dbo.users(user_id) ON DELETE NO ACTION;
END
GO

PRINT 'Enterprise schema: payments+audit init done.';
