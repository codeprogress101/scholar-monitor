/** The existing P02/P03 precedence, shared by bounded Unclaimed reads.
 * Aliases p/c/cl are deliberately fixed so callers cannot alter semantics. */
export const effectiveOutcomeSql="IF(c.id IS NULL,p.outcome,JSON_UNQUOTE(JSON_EXTRACT(c.snapshot,'$.after.outcome')))";
export const effectiveUnpaidReasonSql=`CASE WHEN cl.payment_id IS NOT NULL AND cl.recorded_at >=
 IF(c.id IS NULL,p.recorded_at,STR_TO_DATE(REPLACE(REPLACE(JSON_UNQUOTE(JSON_EXTRACT(c.snapshot,'$.after.recordedAt')),'T',' '),'Z',''),'%Y-%m-%d %H:%i:%s.%f'))
 THEN cl.unpaid_reason ELSE IF(c.id IS NULL,p.unpaid_reason,NULLIF(JSON_UNQUOTE(JSON_EXTRACT(c.snapshot,'$.after.unpaidReason')),'null')) END`;
export const effectivePaymentJoinsSql=`LEFT JOIN payment_corrections c ON c.payment_id=p.id AND c.state IN ('applied','approved')
 AND NOT EXISTS(SELECT 1 FROM payment_corrections n WHERE n.payment_id=c.payment_id AND n.state IN ('applied','approved') AND COALESCE(n.individual_revision,n.batch_revision)>COALESCE(c.individual_revision,c.batch_revision))
 LEFT JOIN payroll_unpaid_classifications cl ON cl.payment_id=p.id
 AND NOT EXISTS(SELECT 1 FROM payroll_unpaid_classifications n WHERE n.payment_id=cl.payment_id AND n.revision>cl.revision)`;
