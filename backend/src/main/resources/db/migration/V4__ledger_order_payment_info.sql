-- Immediate cash/UPI at order acceptance was incorrectly stored as CREDIT ledger lines,
-- which reduced khata balance twice (DEBIT only credit portion + CREDIT for cash paid).
-- Reclassify those rows as informational only.

UPDATE ledger_entries
SET entry_type = 'ORDER_PAYMENT_INFO'
WHERE entry_type = 'CREDIT'
  AND (
    description LIKE '%(at acceptance)%'
    OR description ILIKE '%at order acceptance%'
    OR description LIKE '%Paid at acceptance%'
  );
