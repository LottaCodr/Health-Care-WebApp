/**
 * User-Friendly Error Formatting Utility
 *
 * Translates low-level database errors (PostgreSQL/PostgREST codes), network
 * errors, and authorization codes into clear, non-technical plain English
 * suitable for hospital staff and front-desk personnel.
 */

export function formatFriendlyDbError(err: unknown, fallback = "An unexpected error occurred. Please try again."): string {
    if (!err) return fallback;

    if (typeof err === "string") {
        return cleanErrorMessage(err, fallback);
    }

    const errObj = err as any;
    const code = String(errObj?.code ?? "");
    const message = String(errObj?.message ?? errObj?.error_description ?? errObj?.details ?? "");
    const details = String(errObj?.details ?? "");
    const hint = String(errObj?.hint ?? "");
    const combined = `${message} ${details} ${hint}`.toLowerCase();

    // ── 1. Unique constraint violations (23505) ───────────────────────────────
    if (code === "23505" || combined.includes("unique") || combined.includes("duplicate key")) {
        if (combined.includes("hospital_number")) {
            return "This hospital number is already assigned to another patient.";
        }
        if (combined.includes("phone")) {
            return "A patient with this phone number is already registered.";
        }
        if (combined.includes("email")) {
            return "This email address is already registered in the system.";
        }
        if (combined.includes("drug_name")) {
            return "A drug with this name already exists in the inventory.";
        }
        if (combined.includes("test_code") || combined.includes("test_name")) {
            return "A lab test with this name or code already exists in the catalog.";
        }
        if (combined.includes("code") || combined.includes("barcode")) {
            return "A record with this identifier code already exists.";
        }
        return "This record already exists in the system (duplicate entry).";
    }

    // ── 2. Not-null constraint violations (23502) ─────────────────────────────
    if (code === "23502" || combined.includes("not-null") || combined.includes("violates not-null")) {
        if (combined.includes("name")) {
            return "Patient full name is required.";
        }
        if (combined.includes("birth_date") || combined.includes("date_of_birth")) {
            return "Date of birth is required.";
        }
        if (combined.includes("gender")) {
            return "Gender is required.";
        }
        if (combined.includes("phone")) {
            return "Phone number is required.";
        }
        if (combined.includes("drug_name")) {
            return "Drug name is required.";
        }
        if (combined.includes("test_name") || combined.includes("test_code")) {
            return "Test name and test code are required.";
        }
        return "A required field was left blank. Please check all mandatory fields.";
    }

    // ── 3. Date / Time / Syntax errors (22007, 22008, 22P02) ───────────────────
    if (code === "22007" || code === "22008" || combined.includes("invalid input syntax for type date")) {
        return "Invalid date format. Please use the YYYY-MM-DD format (e.g. 1990-06-15).";
    }
    if (code === "22P02" || combined.includes("invalid input syntax for type numeric") || combined.includes("invalid input syntax for integer")) {
        return "Please enter a valid numeric value for price or quantity.";
    }

    // ── 4. Value too long (22001) ─────────────────────────────────────────────
    if (code === "22001" || combined.includes("value too long")) {
        return "The information entered in one of the fields exceeds the maximum allowed length.";
    }

    // ── 5. Check constraint violation (23514) ─────────────────────────────────
    if (code === "23514" || combined.includes("check constraint")) {
        if (combined.includes("gender")) {
            return "Gender must be 'Male' or 'Female'.";
        }
        if (combined.includes("status")) {
            return "Invalid status value provided.";
        }
        return "One of the fields contains an invalid option or value.";
    }

    // ── 6. Foreign key violations (23503) ─────────────────────────────────────
    if (code === "23503" || combined.includes("foreign key")) {
        return "Referenced record was not found. Please verify the related item exists.";
    }

    // ── 7. Permissions & Authentication (42501, UNAUTHORIZED, FORBIDDEN) ─────
    if (
        code === "42501" ||
        combined.includes("unauthorized") ||
        combined.includes("forbidden") ||
        combined.includes("row-level security") ||
        combined.includes("permission denied")
    ) {
        return "You do not have permission to perform this action. Please log in with an authorized account.";
    }

    // ── 8. Network, Timeout, Server Action issues ────────────────────────────
    if (
        combined.includes("unexpected response") ||
        combined.includes("fetch failed") ||
        combined.includes("network") ||
        combined.includes("econnreset") ||
        combined.includes("timeout") ||
        combined.includes("gateway") ||
        combined.includes("504") ||
        combined.includes("502") ||
        combined.includes("503")
    ) {
        return "The server took too long to respond or network connection was interrupted. Please check your connection and try again.";
    }

    return cleanErrorMessage(message, fallback);
}

/** Strips raw SQL/code artifacts to make text readable */
function cleanErrorMessage(msg: string, fallback: string): string {
    if (!msg || typeof msg !== "string") return fallback;
    const trimmed = msg.trim();
    if (!trimmed) return fallback;

    // Remove technical prefixes like "Error: ", "PostgrestError: ", etc.
    let cleaned = trimmed
        .replace(/^(error:\s*)+/i, "")
        .replace(/^postgresterror:\s*/i, "")
        .replace(/^(unauthorized:\s*)+/i, "")
        .replace(/^(forbidden:\s*)+/i, "");

    // If it's a technical database string, give a friendly message
    if (cleaned.includes("violates") || cleaned.includes("relation \"") || cleaned.includes("syntax error")) {
        return formatFriendlyDbError({ message: cleaned }, fallback);
    }

    return cleaned || fallback;
}
