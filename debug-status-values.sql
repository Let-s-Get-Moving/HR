-- Debug query to see actual status values in database
SELECT 
    status_norm,
    COUNT(*) as count,
    directive_type,
    COUNT(DISTINCT quote_id) as unique_quotes
FROM sales_lead_status_quotes
WHERE directive_type IS NOT NULL
  AND directive_type <> 'none'
  AND service_date_lead_report >= '2026-02-01'
  AND service_date_lead_report <= '2026-02-28'
GROUP BY status_norm, directive_type
ORDER BY count DESC
LIMIT 50;
