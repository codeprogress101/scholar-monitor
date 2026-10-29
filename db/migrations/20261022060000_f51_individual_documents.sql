-- P06: unpaid draft documents only; no financial backfill or payment writes.
ALTER TABLE individual_payment_transactions ADD UNIQUE KEY uq_individual_document_source(id,source_kind);
-- statement-break
CREATE TABLE individual_document_versions (
 transaction_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 document_kind ENUM('OR','DV') NOT NULL,
 revision INT UNSIGNED NOT NULL,
 generation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 source_kind ENUM('unclaimed','omitted') NOT NULL,
 source_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 source JSON NOT NULL,
 template JSON NOT NULL,
 fields JSON NOT NULL,
 document_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 content_bytes INT UNSIGNED NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 PRIMARY KEY(transaction_id,document_kind,revision),
 UNIQUE KEY uq_document_content_owner(transaction_id,document_kind,revision,document_hash),
 KEY ix_document_generation(transaction_id,revision),
 FOREIGN KEY(transaction_id,source_kind) REFERENCES individual_payment_transactions(id,source_kind) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT,
 CHECK(revision>0 AND content_bytes>0 AND content_bytes<=262144),
 CHECK(document_kind='DV' OR source_kind='omitted'),
 CHECK(source_hash REGEXP '^[0-9a-f]{64}$' AND document_hash REGEXP '^[0-9a-f]{64}$')
) ENGINE=InnoDB;
-- statement-break
CREATE TABLE individual_document_contents (
 transaction_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 document_kind ENUM('OR','DV') NOT NULL,
 revision INT UNSIGNED NOT NULL,
 document_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 content_base64 MEDIUMTEXT CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 PRIMARY KEY(transaction_id,document_kind),
 FOREIGN KEY(transaction_id,document_kind,revision,document_hash)
  REFERENCES individual_document_versions(transaction_id,document_kind,revision,document_hash) ON DELETE RESTRICT,
 CHECK(FROM_BASE64(content_base64) IS NOT NULL AND OCTET_LENGTH(FROM_BASE64(content_base64)) BETWEEN 1 AND 262144),
 CHECK(CONVERT(SHA2(FROM_BASE64(content_base64),256) USING ascii) COLLATE ascii_bin=document_hash)
) ENGINE=InnoDB;
