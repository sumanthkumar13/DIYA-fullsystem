package com.diya.backend.util;

import com.diya.backend.entity.LedgerEntry;

import java.math.BigDecimal;

/**
 * Consistent "khata" balance rules for {@link com.diya.backend.entity.LedgerEntry}.
 * <p>
 * Outstanding (amount retailer owes) moves only with:
 * <ul>
 *   <li>{@code DEBIT} — credit extended on account (+)</li>
 *   <li>{@code CREDIT} — payment against that credit (−)</li>
 *   <li>{@code ORDER_PAYMENT_INFO} — cash/UPI at order acceptance; shown for audit only (0 effect)</li>
 * </ul>
 */
public final class LedgerAccounting {

    private LedgerAccounting() {
    }

    public static boolean affectsBalance(LedgerEntry.EntryType t) {
        return t == LedgerEntry.EntryType.DEBIT || t == LedgerEntry.EntryType.CREDIT;
    }

    /**
     * Signed effect on &quot;amount owed&quot; running balance: debit positive, credit negative, info zero.
     */
    public static BigDecimal signedEffect(LedgerEntry.EntryType t, BigDecimal amount) {
        if (t == null || amount == null) {
            return BigDecimal.ZERO;
        }
        if (t == LedgerEntry.EntryType.ORDER_PAYMENT_INFO) {
            return BigDecimal.ZERO;
        }
        if (t == LedgerEntry.EntryType.DEBIT) {
            return amount;
        }
        if (t == LedgerEntry.EntryType.CREDIT) {
            return amount.negate();
        }
        return BigDecimal.ZERO;
    }

    public static BigDecimal signedEffect(LedgerEntry e) {
        if (e == null) {
            return BigDecimal.ZERO;
        }
        return signedEffect(e.getEntryType(), e.getAmount());
    }
}
